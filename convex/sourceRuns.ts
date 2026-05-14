import { v } from "convex/values";
import { query } from "./_generated/server";
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
	},
	handler: async (ctx, { orgId, sinceMs }) => {
		await requireOrgMember(ctx, orgId);
		const since = Date.now() - (sinceMs ?? 24 * 60 * 60 * 1000);
		const rows = await ctx.db
			.query("sourceRuns")
			.withIndex("by_org_startedAt", (q) =>
				q.eq("orgId", orgId).gte("startedAt", since),
			)
			.order("desc")
			.take(50);
		return rows.filter((r) => r.status === "error");
	},
});
