import {
	type FunctionReference,
	makeFunctionReference,
} from "convex/server";
import { ConvexError, v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import {
	internalAction,
	internalMutation,
	internalQuery,
	mutation,
	query,
} from "./_generated/server";
import { requireOrgMember } from "./orgAuth";

const MAX_ENTRIES_PER_DRAFT = 20;
const RECENT_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

function cronFromHourMinute(hour: number, minute: number): string {
	if (
		!Number.isInteger(hour) ||
		hour < 0 ||
		hour > 23 ||
		!Number.isInteger(minute) ||
		minute < 0 ||
		minute > 59
	) {
		throw new ConvexError("Invalid hour or minute");
	}
	return `${minute} ${hour} * * *`;
}

function nextDailyRun(
	now: number,
	hour: number,
	minute: number,
): number {
	const next = new Date(now);
	next.setUTCSeconds(0, 0);
	next.setUTCHours(hour, minute, 0, 0);
	if (next.getTime() <= now) {
		next.setUTCDate(next.getUTCDate() + 1);
	}
	return next.getTime();
}

export const getSchedule = query({
	args: { orgId: v.id("organizations") },
	handler: async (ctx, { orgId }) => {
		await requireOrgMember(ctx, orgId);
		const row = await ctx.db
			.query("autoDraftSchedules")
			.withIndex("by_org", (q) => q.eq("orgId", orgId))
			.unique();
		return row ?? null;
	},
});

export const upsertSchedule = mutation({
	args: {
		orgId: v.id("organizations"),
		enabled: v.boolean(),
		hour: v.number(),
		minute: v.number(),
		timezone: v.optional(v.string()),
	},
	handler: async (ctx, { orgId, enabled, hour, minute, timezone }) => {
		const member = await requireOrgMember(ctx, orgId, "admin");
		const cron = cronFromHourMinute(hour, minute);
		const existing = await ctx.db
			.query("autoDraftSchedules")
			.withIndex("by_org", (q) => q.eq("orgId", orgId))
			.unique();
		if (existing) {
			await ctx.db.patch(existing._id, {
				enabled,
				cron,
				...(timezone !== undefined ? { timezone } : {}),
			});
			return existing._id;
		}
		return await ctx.db.insert("autoDraftSchedules", {
			orgId,
			enabled,
			cron,
			createdByUserId: member.userId,
			...(timezone ? { timezone } : {}),
		});
	},
});

interface DueScheduleRow {
	_id: Id<"autoDraftSchedules">;
	orgId: Id<"organizations">;
	cron: string;
	lastRunAt?: number;
}

export const _listDue = internalQuery({
	args: {},
	handler: async (ctx): Promise<DueScheduleRow[]> => {
		const rows = await ctx.db.query("autoDraftSchedules").collect();
		const now = Date.now();
		const due: DueScheduleRow[] = [];
		for (const row of rows) {
			if (!row.enabled) continue;
			const parsed = parseCron(row.cron);
			if (!parsed) continue;
			const last = row.lastRunAt ?? 0;
			const nextRunAfterLast = nextDailyRun(last, parsed.hour, parsed.minute);
			if (now >= nextRunAfterLast) {
				due.push({
					_id: row._id,
					orgId: row.orgId,
					cron: row.cron,
					lastRunAt: row.lastRunAt,
				});
			}
		}
		return due;
	},
});

function parseCron(cron: string): { minute: number; hour: number } | null {
	const parts = cron.trim().split(/\s+/);
	if (parts.length < 2) return null;
	const minute = Number(parts[0]);
	const hour = Number(parts[1]);
	if (Number.isNaN(minute) || Number.isNaN(hour)) return null;
	return { minute, hour };
}

export const _markRan = internalMutation({
	args: { scheduleId: v.id("autoDraftSchedules") },
	handler: async (ctx, { scheduleId }) => {
		await ctx.db.patch(scheduleId, { lastRunAt: Date.now() });
	},
});

export const runDueAutoDrafts = internalMutation({
	args: {},
	handler: async (ctx) => {
		const listDueRef = makeFunctionReference<"query">(
			"autoDrafts:_listDue",
		) as unknown as FunctionReference<
			"query",
			"internal",
			Record<string, never>,
			DueScheduleRow[]
		>;
		const due = await ctx.runQuery(listDueRef, {});
		const runOneRef = makeFunctionReference<"action">(
			"autoDrafts:runOne",
		) as unknown as FunctionReference<
			"action",
			"internal",
			{ orgId: Id<"organizations">; scheduleId: Id<"autoDraftSchedules"> },
			void
		>;
		for (const row of due) {
			await ctx.scheduler.runAfter(0, runOneRef, {
				orgId: row.orgId,
				scheduleId: row._id,
			});
		}
	},
});

interface AutoDraftEntryPick {
	_id: Id<"entries">;
	title: string;
	snippet?: string;
	content?: string;
	canonicalUrl: string;
	primarySourceName: string;
}

interface AutoDraftPrep {
	entries: AutoDraftEntryPick[];
	profile: Doc<"ghostWriterProfiles"> | null;
	systemUserId: Id<"users"> | null;
}

export const _prepAutoDraft = internalQuery({
	args: { orgId: v.id("organizations") },
	handler: async (ctx, { orgId }): Promise<AutoDraftPrep> => {
		const since = Date.now() - RECENT_WINDOW_MS;
		const candidates: AutoDraftEntryPick[] = [];
		const q = ctx.db
			.query("entries")
			.withIndex("by_org_fetchedAt", (ix) =>
				ix.eq("orgId", orgId).gte("fetchedAt", since),
			)
			.order("desc");
		for await (const e of q) {
			if (e.used || e.archived) continue;
			const source = await ctx.db.get(e.primarySourceId);
			candidates.push({
				_id: e._id,
				title: e.title,
				snippet: e.snippet,
				content: e.content?.slice(0, 4000),
				canonicalUrl: e.canonicalUrl,
				primarySourceName: source?.name ?? "Unknown source",
			});
			if (candidates.length >= MAX_ENTRIES_PER_DRAFT) break;
		}
		const profile = await ctx.db
			.query("ghostWriterProfiles")
			.withIndex("by_org", (qq) => qq.eq("orgId", orgId))
			.unique();
		const firstAdmin = await ctx.db
			.query("organizationMembers")
			.withIndex("by_org", (qq) => qq.eq("orgId", orgId))
			.collect();
		const admin = firstAdmin.find((m) => m.role === "admin") ?? firstAdmin[0];
		return {
			entries: candidates,
			profile,
			systemUserId: admin?.userId ?? null,
		};
	},
});

export const _createAutoDraftRow = internalMutation({
	args: {
		orgId: v.id("organizations"),
		title: v.string(),
		createdByUserId: v.id("users"),
		entryIds: v.array(v.id("entries")),
	},
	handler: async (ctx, args): Promise<Id<"drafts">> => {
		const now = Date.now();
		const draftId = await ctx.db.insert("drafts", {
			orgId: args.orgId,
			title: args.title,
			body: "",
			status: "generating",
			createdAt: now,
			updatedAt: now,
			createdByUserId: args.createdByUserId,
		});
		for (const entryId of args.entryIds) {
			await ctx.db.insert("draftEntries", {
				draftId,
				entryId,
				orgId: args.orgId,
			});
		}
		return draftId;
	},
});

export const _completeAutoDraft = internalMutation({
	args: {
		draftId: v.id("drafts"),
		body: v.string(),
	},
	handler: async (ctx, { draftId, body }) => {
		const existing = await ctx.db.get(draftId);
		if (!existing) return;
		await ctx.db.patch(draftId, {
			body,
			status: "ready",
			updatedAt: Date.now(),
		});
	},
});

function buildAutoPrompt(prep: AutoDraftPrep): {
	system: string;
	user: string;
} {
	const profile = prep.profile;
	const voiceBlock = profile
		? [
				"# Tone of voice",
				profile.summary,
				profile.voiceAttributes.length > 0
					? `Voice attributes: ${profile.voiceAttributes.join(", ")}`
					: "",
				profile.doExamples.length > 0
					? `Do:\n${profile.doExamples.map((d) => `- ${d}`).join("\n")}`
					: "",
				profile.dontExamples.length > 0
					? `Don't:\n${profile.dontExamples.map((d) => `- ${d}`).join("\n")}`
					: "",
			]
				.filter(Boolean)
				.join("\n\n")
		: "# Tone of voice\nNo tone-of-voice profile is configured. Use a friendly, clear, professional newsletter voice — direct, lightly opinionated, never gushing.";

	const stories = prep.entries
		.map((e, i) => {
			const parts = [
				`## Story ${i + 1}: ${e.title}`,
				`Source: ${e.primarySourceName}`,
				`URL: ${e.canonicalUrl}`,
			];
			if (e.snippet) parts.push(`Snippet: ${e.snippet}`);
			if (e.content) parts.push(`Content:\n${e.content}`);
			return parts.join("\n");
		})
		.join("\n\n---\n\n");

	const system =
		"You are a newsletter ghostwriter generating an automated overnight draft for review. " +
		"Write the draft in markdown, ready to drop into an editor. " +
		"Include a strong opening hook, cover each provided story with a clear paragraph or short section, " +
		"add a brief closing. Link to the original story URLs inline. Do not invent facts beyond the supplied material.";

	const user = `${voiceBlock}\n\n# Stories to cover (in order)\n\n${stories}\n\nWrite the full newsletter draft now. Output markdown only — no preamble.`;
	return { system, user };
}

export const runOne = internalAction({
	args: {
		orgId: v.id("organizations"),
		scheduleId: v.id("autoDraftSchedules"),
	},
	handler: async (ctx, { orgId, scheduleId }): Promise<void> => {
		const markRanRef = makeFunctionReference<"mutation">(
			"autoDrafts:_markRan",
		) as unknown as FunctionReference<
			"mutation",
			"internal",
			{ scheduleId: Id<"autoDraftSchedules"> },
			void
		>;
		await ctx.runMutation(markRanRef, { scheduleId });

		const prepRef = makeFunctionReference<"query">(
			"autoDrafts:_prepAutoDraft",
		) as unknown as FunctionReference<
			"query",
			"internal",
			{ orgId: Id<"organizations"> },
			AutoDraftPrep
		>;
		const prep = await ctx.runQuery(prepRef, { orgId });

		if (prep.entries.length === 0 || prep.systemUserId === null) {
			return;
		}

		const title = `Auto draft — ${new Date().toLocaleDateString(undefined, {
			year: "numeric",
			month: "short",
			day: "numeric",
		})}`;

		const createRef = makeFunctionReference<"mutation">(
			"autoDrafts:_createAutoDraftRow",
		) as unknown as FunctionReference<
			"mutation",
			"internal",
			{
				orgId: Id<"organizations">;
				title: string;
				createdByUserId: Id<"users">;
				entryIds: Id<"entries">[];
			},
			Id<"drafts">
		>;
		const draftId = await ctx.runMutation(createRef, {
			orgId,
			title,
			createdByUserId: prep.systemUserId,
			entryIds: prep.entries.map((e) => e._id),
		});

		const completeRef = makeFunctionReference<"mutation">(
			"autoDrafts:_completeAutoDraft",
		) as unknown as FunctionReference<
			"mutation",
			"internal",
			{ draftId: Id<"drafts">; body: string },
			void
		>;

		let body: string;
		try {
			if (!process.env.ANTHROPIC_API_KEY) {
				body =
					"GENERATION ERROR: ANTHROPIC_API_KEY is not configured on the Convex deployment.\n\n" +
					`Selected ${prep.entries.length} stories — review and edit manually.`;
			} else {
				const { DRAFT_MODEL, getAnthropicClient } = await import(
					"./lib/anthropic"
				);
				const { system, user } = buildAutoPrompt(prep);
				const anthropic = getAnthropicClient();
				const res = await anthropic.messages.create({
					model: DRAFT_MODEL,
					max_tokens: 4000,
					system,
					messages: [{ role: "user", content: user }],
				});
				const textPart = res.content.find((c) => c.type === "text");
				body =
					textPart && textPart.type === "text"
						? textPart.text
						: "GENERATION ERROR: Claude returned no text content.";
			}
		} catch (err) {
			const message = err instanceof Error ? err.message : String(err);
			body = `GENERATION ERROR: ${message}`;
		}

		await ctx.runMutation(completeRef, { draftId, body });
	},
});

