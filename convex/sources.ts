import {
	type FunctionReference,
	makeFunctionReference,
} from "convex/server";
import { ConvexError, v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import {
	internalMutation,
	internalQuery,
	mutation,
	query,
} from "./_generated/server";
import { requireOrgMember } from "./orgAuth";

const sourceTypeValidator = v.union(
	v.literal("web_search"),
	v.literal("rss"),
	v.literal("website"),
	v.literal("manual"),
);

const scheduleValidator = v.union(
	v.literal("15m"),
	v.literal("1h"),
	v.literal("6h"),
	v.literal("daily"),
	v.literal("weekly"),
);

type Schedule = "15m" | "1h" | "6h" | "daily" | "weekly";

function cadenceMs(schedule: Schedule): number {
	switch (schedule) {
		case "15m":
			return 15 * 60 * 1000;
		case "1h":
			return 60 * 60 * 1000;
		case "6h":
			return 6 * 60 * 60 * 1000;
		case "daily":
			return 24 * 60 * 60 * 1000;
		case "weekly":
			return 7 * 24 * 60 * 60 * 1000;
	}
}

function validateConfigForType(
	type: Doc<"sources">["type"],
	config: Record<string, unknown>,
) {
	switch (type) {
		case "rss":
		case "website": {
			const url = (config.url as string | undefined)?.trim();
			if (!url) throw new ConvexError(`URL is required for ${type} source`);
			try {
				new URL(url);
			} catch {
				throw new ConvexError("URL is invalid");
			}
			break;
		}
		case "web_search": {
			const query = (config.query as string | undefined)?.trim();
			if (!query) throw new ConvexError("Search query is required");
			break;
		}
		case "manual":
			break;
	}
}

export const list = query({
	args: { orgId: v.id("organizations") },
	handler: async (ctx, { orgId }) => {
		await requireOrgMember(ctx, orgId);
		const rows = await ctx.db
			.query("sources")
			.withIndex("by_org", (q) => q.eq("orgId", orgId))
			.collect();
		return rows
			.filter((s) => s.status !== "deleted")
			.sort((a, b) => b.createdAt - a.createdAt);
	},
});

export const get = query({
	args: { orgId: v.id("organizations"), sourceId: v.id("sources") },
	handler: async (ctx, { orgId, sourceId }) => {
		await requireOrgMember(ctx, orgId);
		const source = await ctx.db.get(sourceId);
		if (!source || source.orgId !== orgId || source.status === "deleted") {
			return null;
		}
		return source;
	},
});

export const create = mutation({
	args: {
		orgId: v.id("organizations"),
		type: sourceTypeValidator,
		name: v.string(),
		schedule: scheduleValidator,
		config: v.any(),
	},
	handler: async (ctx, { orgId, type, name, schedule, config }) => {
		await requireOrgMember(ctx, orgId, "admin");
		if (type === "manual") {
			throw new ConvexError(
				"Manual source is built-in and cannot be created directly",
			);
		}
		const normalized = (config ?? {}) as Record<string, unknown>;
		validateConfigForType(type, normalized);
		const now = Date.now();
		const sourceId = await ctx.db.insert("sources", {
			orgId,
			type,
			name: name.trim(),
			config: normalized,
			schedule,
			status: "active",
			health: "healthy",
			nextRunAt: now,
			createdAt: now,
			updatedAt: now,
		});
		return sourceId;
	},
});

export const update = mutation({
	args: {
		orgId: v.id("organizations"),
		sourceId: v.id("sources"),
		name: v.optional(v.string()),
		schedule: v.optional(scheduleValidator),
		config: v.optional(v.any()),
	},
	handler: async (ctx, { orgId, sourceId, name, schedule, config }) => {
		await requireOrgMember(ctx, orgId, "admin");
		const source = await ctx.db.get(sourceId);
		if (!source || source.orgId !== orgId || source.status === "deleted") {
			throw new ConvexError("Source not found");
		}
		const patch: Partial<Doc<"sources">> = { updatedAt: Date.now() };
		if (name !== undefined) patch.name = name.trim();
		if (schedule !== undefined) patch.schedule = schedule;
		if (config !== undefined) {
			const normalized = (config ?? {}) as Record<string, unknown>;
			validateConfigForType(source.type, normalized);
			patch.config = normalized;
		}
		await ctx.db.patch(sourceId, patch);
	},
});

export const setStatus = mutation({
	args: {
		orgId: v.id("organizations"),
		sourceId: v.id("sources"),
		status: v.union(v.literal("active"), v.literal("paused")),
	},
	handler: async (ctx, { orgId, sourceId, status }) => {
		await requireOrgMember(ctx, orgId, "admin");
		const source = await ctx.db.get(sourceId);
		if (!source || source.orgId !== orgId || source.status === "deleted") {
			throw new ConvexError("Source not found");
		}
		const patch: Partial<Doc<"sources">> = {
			status,
			updatedAt: Date.now(),
		};
		if (status === "active" && source.status === "paused") {
			patch.nextRunAt = Date.now();
		}
		await ctx.db.patch(sourceId, patch);
	},
});

export const softDelete = mutation({
	args: { orgId: v.id("organizations"), sourceId: v.id("sources") },
	handler: async (ctx, { orgId, sourceId }) => {
		await requireOrgMember(ctx, orgId, "admin");
		const source = await ctx.db.get(sourceId);
		if (!source || source.orgId !== orgId) {
			throw new ConvexError("Source not found");
		}
		await ctx.db.patch(sourceId, {
			status: "deleted",
			nextRunAt: undefined,
			updatedAt: Date.now(),
		});
	},
});

export const _getSource = internalQuery({
	args: { sourceId: v.id("sources") },
	handler: async (ctx, { sourceId }) => {
		return await ctx.db.get(sourceId);
	},
});

export const _finishRun = internalMutation({
	args: {
		sourceId: v.id("sources"),
		success: v.boolean(),
		itemsAdded: v.number(),
		error: v.optional(v.string()),
	},
	handler: async (ctx, { sourceId, success, itemsAdded, error }) => {
		const source = await ctx.db.get(sourceId);
		if (!source) return;
		const now = Date.now();
		const cadence = source.schedule
			? cadenceMs(source.schedule as Schedule)
			: 60 * 60 * 1000;
		let health: Doc<"sources">["health"];
		if (success) {
			health = "healthy";
		} else {
			health = source.health === "warning" ? "failing" : "warning";
		}
		await ctx.db.patch(sourceId, {
			lastRunAt: now,
			nextRunAt: source.status === "active" ? now + cadence : undefined,
			lastError: error,
			health,
			updatedAt: now,
		});

		const runStarted = now - 1;
		await ctx.db.insert("sourceRuns", {
			sourceId,
			orgId: source.orgId,
			startedAt: runStarted,
			finishedAt: now,
			status: success ? "success" : "error",
			itemsAdded,
			error,
		});

		// Cap the run history to a reasonable size per source (keep newest 50).
		const old = await ctx.db
			.query("sourceRuns")
			.withIndex("by_source_startedAt", (q) => q.eq("sourceId", sourceId))
			.order("desc")
			.collect();
		for (let i = 50; i < old.length; i++) {
			await ctx.db.delete(old[i]._id);
		}
	},
});

const runOneRef = makeFunctionReference<"action">(
	"sourcesRunner:runOne",
) as unknown as FunctionReference<
	"action",
	"internal",
	{ sourceId: Id<"sources"> },
	null
>;

export const tick = internalMutation({
	args: {},
	handler: async (ctx) => {
		const now = Date.now();
		const due = await ctx.db
			.query("sources")
			.withIndex("by_nextRunAt", (q) => q.lte("nextRunAt", now))
			.take(50);
		for (const source of due) {
			if (
				source.status !== "active" ||
				source.type === "manual" ||
				source.nextRunAt === undefined
			) {
				continue;
			}
			// Mark in-flight by clearing nextRunAt so the next tick doesn't double-fire.
			await ctx.db.patch(source._id, {
				nextRunAt: undefined,
				updatedAt: now,
			});
			await ctx.scheduler.runAfter(0, runOneRef, {
				sourceId: source._id,
			});
		}
	},
});
