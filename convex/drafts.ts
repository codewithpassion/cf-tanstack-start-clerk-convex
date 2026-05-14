import { ConvexError, v } from "convex/values";
import type { Doc } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";
import { requireOrgMember } from "./orgAuth";

const DRAFT_STATUS = v.union(
	v.literal("generating"),
	v.literal("ready"),
	v.literal("finalized"),
	v.literal("reopened"),
);

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
	args: {
		orgId: v.id("organizations"),
		status: v.optional(DRAFT_STATUS),
	},
	handler: async (ctx, { orgId, status }) => {
		await requireOrgMember(ctx, orgId);
		const base =
			status !== undefined
				? ctx.db
						.query("drafts")
						.withIndex("by_org_status", (q) =>
							q.eq("orgId", orgId).eq("status", status),
						)
				: ctx.db
						.query("drafts")
						.withIndex("by_org", (q) => q.eq("orgId", orgId));
		const drafts = await base.order("desc").collect();
		return await Promise.all(
			drafts.map(async (d) => {
				const links = await ctx.db
					.query("draftEntries")
					.withIndex("by_draft", (q) => q.eq("draftId", d._id))
					.collect();
				return { ...d, entryCount: links.length };
			}),
		);
	},
});

export const update = mutation({
	args: {
		orgId: v.id("organizations"),
		draftId: v.id("drafts"),
		body: v.optional(v.string()),
		title: v.optional(v.string()),
	},
	handler: async (ctx, { orgId, draftId, body, title }) => {
		await requireOrgMember(ctx, orgId);
		const existing = await ctx.db.get(draftId);
		if (!existing || existing.orgId !== orgId) {
			throw new ConvexError("Draft not found");
		}
		if (existing.status === "finalized") {
			throw new ConvexError(
				"Draft is finalized. Reopen it before making changes.",
			);
		}
		const patch: Partial<Doc<"drafts">> = { updatedAt: Date.now() };
		if (body !== undefined) patch.body = body;
		if (title !== undefined) {
			const trimmed = title.trim();
			if (trimmed.length === 0) {
				throw new ConvexError("Title cannot be empty");
			}
			patch.title = trimmed;
		}
		await ctx.db.patch(draftId, patch);
	},
});

export const finalize = mutation({
	args: {
		orgId: v.id("organizations"),
		draftId: v.id("drafts"),
	},
	handler: async (ctx, { orgId, draftId }) => {
		const member = await requireOrgMember(ctx, orgId);
		const draft = await ctx.db.get(draftId);
		if (!draft || draft.orgId !== orgId) {
			throw new ConvexError("Draft not found");
		}
		if (draft.status === "generating") {
			throw new ConvexError("Draft is still generating");
		}
		const now = Date.now();
		await ctx.db.patch(draftId, {
			status: "finalized",
			finalizedAt: now,
			updatedAt: now,
		});
		const links = await ctx.db
			.query("draftEntries")
			.withIndex("by_draft", (q) => q.eq("draftId", draftId))
			.collect();
		for (const link of links) {
			const entry = await ctx.db.get(link.entryId);
			if (!entry || entry.orgId !== orgId) continue;
			if (entry.used) continue;
			await ctx.db.patch(entry._id, {
				used: true,
				usedAt: now,
				usedByUserId: member.userId,
			});
		}
	},
});

export const reopen = mutation({
	args: {
		orgId: v.id("organizations"),
		draftId: v.id("drafts"),
	},
	handler: async (ctx, { orgId, draftId }) => {
		await requireOrgMember(ctx, orgId);
		const draft = await ctx.db.get(draftId);
		if (!draft || draft.orgId !== orgId) {
			throw new ConvexError("Draft not found");
		}
		if (draft.status !== "finalized") {
			throw new ConvexError("Only finalized drafts can be reopened");
		}
		await ctx.db.patch(draftId, {
			status: "reopened",
			finalizedAt: undefined,
			updatedAt: Date.now(),
		});
	},
});

export const remove = mutation({
	args: {
		orgId: v.id("organizations"),
		draftId: v.id("drafts"),
	},
	handler: async (ctx, { orgId, draftId }) => {
		await requireOrgMember(ctx, orgId, "admin");
		const draft = await ctx.db.get(draftId);
		if (!draft || draft.orgId !== orgId) {
			throw new ConvexError("Draft not found");
		}
		const links = await ctx.db
			.query("draftEntries")
			.withIndex("by_draft", (q) => q.eq("draftId", draftId))
			.collect();
		for (const link of links) {
			await ctx.db.delete(link._id);
		}
		await ctx.db.delete(draftId);
	},
});

export const recentForReview = query({
	args: {
		orgId: v.id("organizations"),
		limit: v.optional(v.number()),
	},
	handler: async (ctx, { orgId, limit }) => {
		await requireOrgMember(ctx, orgId);
		const cap = Math.min(limit ?? 5, 25);
		const ready = await ctx.db
			.query("drafts")
			.withIndex("by_org_status", (q) =>
				q.eq("orgId", orgId).eq("status", "ready"),
			)
			.order("desc")
			.take(cap);
		const reopened = await ctx.db
			.query("drafts")
			.withIndex("by_org_status", (q) =>
				q.eq("orgId", orgId).eq("status", "reopened"),
			)
			.order("desc")
			.take(cap);
		return [...ready, ...reopened]
			.sort((a, b) => b.updatedAt - a.updatedAt)
			.slice(0, cap);
	},
});
