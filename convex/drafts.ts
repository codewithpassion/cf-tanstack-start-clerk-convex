import { v } from "convex/values";
import type { Doc } from "./_generated/dataModel";
import { query } from "./_generated/server";
import { requireOrgMember } from "./orgAuth";

export const get = query({
	args: {
		orgId: v.id("organizations"),
		draftId: v.id("drafts"),
	},
	handler: async (ctx, { orgId, draftId }) => {
		await requireOrgMember(ctx, orgId);
		const draft = await ctx.db.get(draftId);
		if (!draft || draft.orgId !== orgId) return null;
		const links = await ctx.db
			.query("draftEntries")
			.withIndex("by_draft", (q) => q.eq("draftId", draftId))
			.collect();
		const entries = await Promise.all(
			links.map(async (l): Promise<Doc<"entries"> | null> => {
				const e = await ctx.db.get(l.entryId);
				return e ?? null;
			}),
		);
		return {
			...draft,
			entries: entries.filter((e): e is Doc<"entries"> => e !== null),
		};
	},
});

export const listByOrg = query({
	args: { orgId: v.id("organizations") },
	handler: async (ctx, { orgId }) => {
		await requireOrgMember(ctx, orgId);
		return await ctx.db
			.query("drafts")
			.withIndex("by_org", (q) => q.eq("orgId", orgId))
			.order("desc")
			.collect();
	},
});
