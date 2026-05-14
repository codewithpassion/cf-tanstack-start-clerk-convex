import { type FunctionReference, makeFunctionReference } from "convex/server";
import { ConvexError, v } from "convex/values";
import type { Doc, Id } from "../_generated/dataModel";
import {
	action,
	internalMutation,
	internalQuery,
} from "../_generated/server";
import { DRAFT_MODEL, getAnthropicClient } from "../lib/anthropic";
import { requireOrgMember } from "../orgAuth";

const MAX_CONTENT_PER_ENTRY = 4000;

interface DraftPrepData {
	entries: Array<{
		_id: Id<"entries">;
		title: string;
		snippet?: string;
		content?: string;
		canonicalUrl: string;
		primarySourceName: string;
	}>;
	profile: Doc<"ghostWriterProfiles"> | null;
	createdByUserId: Id<"users">;
}

export const _prepDraft = internalQuery({
	args: {
		orgId: v.id("organizations"),
		entryIds: v.array(v.id("entries")),
	},
	handler: async (ctx, { orgId, entryIds }): Promise<DraftPrepData> => {
		const member = await requireOrgMember(ctx, orgId);
		if (entryIds.length === 0) {
			throw new ConvexError("Select at least one story to include.");
		}
		const entries: DraftPrepData["entries"] = [];
		for (const id of entryIds) {
			const e = await ctx.db.get(id);
			if (!e || e.orgId !== orgId) {
				throw new ConvexError("One or more entries are not in this organization.");
			}
			const source = await ctx.db.get(e.primarySourceId);
			entries.push({
				_id: e._id,
				title: e.title,
				snippet: e.snippet,
				content: e.content?.slice(0, MAX_CONTENT_PER_ENTRY),
				canonicalUrl: e.canonicalUrl,
				primarySourceName: source?.name ?? "Unknown source",
			});
		}
		const profile = await ctx.db
			.query("ghostWriterProfiles")
			.withIndex("by_org", (q) => q.eq("orgId", orgId))
			.unique();
		return { entries, profile, createdByUserId: member.userId };
	},
});

export const _createDraftRow = internalMutation({
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

export const _completeDraft = internalMutation({
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

function buildPrompt(data: DraftPrepData): {
	system: string;
	user: string;
} {
	const profile = data.profile;
	const voiceBlock = profile
		? [
				"# Tone of voice",
				profile.summary,
				profile.voiceAttributes.length > 0
					? `Voice attributes: ${profile.voiceAttributes.join(", ")}`
					: "",
				profile.doExamples.length > 0
					? `Do: ${profile.doExamples.map((d) => `- ${d}`).join("\n")}`
					: "",
				profile.dontExamples.length > 0
					? `Don't: ${profile.dontExamples.map((d) => `- ${d}`).join("\n")}`
					: "",
			]
				.filter(Boolean)
				.join("\n\n")
		: "# Tone of voice\nNo tone-of-voice profile is configured. Use a friendly, clear, professional newsletter voice — direct, lightly opinionated, never gushing.";

	const stories = data.entries
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
		"You are a newsletter ghostwriter. Write the draft in markdown, ready to drop into an editor. " +
		"Include a strong opening hook, cover each provided story with a clear paragraph or short section, " +
		"add a brief closing. Link to the original story URLs inline. Do not invent facts beyond the supplied material.";

	const user =
		`${voiceBlock}\n\n# Stories to cover (in order)\n\n${stories}\n\n` +
		"Write the full newsletter draft now. Output markdown only — no preamble.";

	return { system, user };
}

export const generateDraft = action({
	args: {
		orgId: v.id("organizations"),
		entryIds: v.array(v.id("entries")),
		title: v.optional(v.string()),
	},
	handler: async (
		ctx,
		{ orgId, entryIds, title },
	): Promise<{ draftId: Id<"drafts"> }> => {
		const prepRef = makeFunctionReference<"query">(
			"ai/draft:_prepDraft",
		) as unknown as FunctionReference<
			"query",
			"internal",
			{ orgId: Id<"organizations">; entryIds: Id<"entries">[] },
			DraftPrepData
		>;
		const prep = await ctx.runQuery(prepRef, { orgId, entryIds });

		const draftTitle =
			title?.trim() ||
			`Newsletter draft — ${new Date().toLocaleDateString(undefined, {
				year: "numeric",
				month: "short",
				day: "numeric",
			})}`;

		const createRef = makeFunctionReference<"mutation">(
			"ai/draft:_createDraftRow",
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
			title: draftTitle,
			createdByUserId: prep.createdByUserId,
			entryIds,
		});

		const completeRef = makeFunctionReference<"mutation">(
			"ai/draft:_completeDraft",
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
					"_Draft generation skipped: `ANTHROPIC_API_KEY` is not configured on the Convex deployment._\n\n" +
					`Selected ${prep.entries.length} stories.`;
			} else {
				const { system, user } = buildPrompt(prep);
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
						: "_Claude returned no text content._";
			}
		} catch (err) {
			const message = err instanceof Error ? err.message : String(err);
			body = `_Draft generation failed: ${message}_`;
		}

		await ctx.runMutation(completeRef, { draftId, body });
		return { draftId };
	},
});
