import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireOrgMember } from "./orgAuth";

export const listForSource = query({
	args: {
		orgId: v.id("organizations"),
		sourceId: v.id("sources"),
		limit: v.optional(v.number()),
	},
	handler: async (ctx, { orgId, sourceId, limit }) => {
		await requireOrgMember(ctx, orgId);
		const source = await ctx.db.get(sourceId);
		if (!source || source.orgId !== orgId) return [];
		return await ctx.db
			.query("sourceRuns")
			.withIndex("by_source_startedAt", (q) => q.eq("sourceId", sourceId))
			.order("desc")
			.take(limit ?? 20);
	},
});

export const recentFailures = query({
	args: {
		orgId: v.id("organizations"),
		sinceMs: v.optional(v.number()),
		includeAcknowledged: v.optional(v.boolean()),
	},
	handler: async (ctx, { orgId, sinceMs, includeAcknowledged }) => {
		await requireOrgMember(ctx, orgId);
		const since = Date.now() - (sinceMs ?? 24 * 60 * 60 * 1000);
		const rows = await ctx.db
			.query("sourceRuns")
			.withIndex("by_org_startedAt", (q) =>
				q.eq("orgId", orgId).gte("startedAt", since),
			)
			.order("desc")
			.take(50);
		return rows.filter(
			(r) =>
				r.status === "error" &&
				(includeAcknowledged === true || r.acknowledged !== true),
		);
	},
});

export const acknowledgeFailure = mutation({
	args: {
		runId: v.id("sourceRuns"),
	},
	handler: async (ctx, { runId }) => {
		const run = await ctx.db.get(runId);
		if (!run) throw new ConvexError("Run not found");
		await requireOrgMember(ctx, run.orgId, "admin");
		await ctx.db.patch(runId, {
			acknowledged: true,
			acknowledgedAt: Date.now(),
		});
	},
});
