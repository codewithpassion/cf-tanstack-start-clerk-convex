import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireOrgMember } from "./orgAuth";

export const logSearch = mutation({
	args: { orgId: v.id("organizations") },
	handler: async (ctx, { orgId }) => {
		await requireOrgMember(ctx, orgId);
		await ctx.db.insert("analyticsEvents", {
			orgId,
			type: "ai_search",
			createdAt: Date.now(),
		});
	},
});

export const recentActivity = query({
	args: {
		orgId: v.id("organizations"),
		sinceMs: v.optional(v.number()),
	},
	handler: async (ctx, { orgId, sinceMs }) => {
		await requireOrgMember(ctx, orgId);
		const window = sinceMs ?? 7 * 24 * 60 * 60 * 1000;
		const since = Date.now() - window;

		const entries = await ctx.db
			.query("entries")
			.withIndex("by_org_fetchedAt", (q) =>
				q.eq("orgId", orgId).gte("fetchedAt", since),
			)
			.collect();

		const drafts = await ctx.db
			.query("drafts")
			.withIndex("by_org", (q) => q.eq("orgId", orgId))
			.collect();

		const draftsCreated = drafts.filter((d) => d.createdAt >= since).length;
		const draftsFinalized = drafts.filter(
			(d) => d.finalizedAt !== undefined && d.finalizedAt >= since,
		).length;

		const searches = await ctx.db
			.query("analyticsEvents")
			.withIndex("by_org_type_createdAt", (q) =>
				q.eq("orgId", orgId).eq("type", "ai_search").gte("createdAt", since),
			)
			.collect();

		return {
			entriesIngested: entries.length,
			draftsCreated,
			draftsFinalized,
			searchesPerformed: searches.length,
		};
	},
});
