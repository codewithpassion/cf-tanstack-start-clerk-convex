import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { requireAuth } from "./auth";

async function requireHackathonOrganiser(
	ctx: MutationCtx,
	hackathonId: Id<"hackathons">,
	clerkId: string,
) {
	const hackathon = await ctx.db.get(hackathonId);
	if (!hackathon) throw new ConvexError("Hackathon not found");

	if (hackathon.ownerId === clerkId) return hackathon;

	const role = await ctx.db
		.query("hackathonRoles")
		.withIndex("by_hackathon_user", (q) =>
			q.eq("hackathonId", hackathonId).eq("userId", clerkId),
		)
		.unique();

	if (!role || role.role !== "organiser") {
		throw new ConvexError("Not authorized");
	}

	return hackathon;
}

export const listByHackathon = query({
	args: { hackathonId: v.id("hackathons") },
	handler: async (ctx, args) => {
		const categories = await ctx.db
			.query("categories")
			.withIndex("by_hackathon", (q) => q.eq("hackathonId", args.hackathonId))
			.collect();

		return categories.sort((a, b) => a.order - b.order);
	},
});

export const create = mutation({
	args: {
		hackathonId: v.id("hackathons"),
		name: v.string(),
		description: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		const user = await requireAuth(ctx);
		await requireHackathonOrganiser(ctx, args.hackathonId, user.clerkId);

		const existing = await ctx.db
			.query("categories")
			.withIndex("by_hackathon", (q) => q.eq("hackathonId", args.hackathonId))
			.collect();

		const maxOrder = existing.reduce((max, c) => Math.max(max, c.order), 0);

		return await ctx.db.insert("categories", {
			hackathonId: args.hackathonId,
			name: args.name,
			description: args.description,
			order: maxOrder + 1,
			createdAt: Date.now(),
		});
	},
});

export const update = mutation({
	args: {
		id: v.id("categories"),
		name: v.optional(v.string()),
		description: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		const user = await requireAuth(ctx);
		const category = await ctx.db.get(args.id);
		if (!category) throw new ConvexError("Category not found");

		await requireHackathonOrganiser(ctx, category.hackathonId, user.clerkId);

		const patch: Record<string, unknown> = {};
		if (args.name !== undefined) patch.name = args.name;
		if (args.description !== undefined) patch.description = args.description;

		await ctx.db.patch(args.id, patch);
	},
});

export const remove = mutation({
	args: { id: v.id("categories") },
	handler: async (ctx, args) => {
		const user = await requireAuth(ctx);
		const category = await ctx.db.get(args.id);
		if (!category) throw new ConvexError("Category not found");

		await requireHackathonOrganiser(ctx, category.hackathonId, user.clerkId);

		await ctx.db.delete(args.id);
	},
});

export const reorder = mutation({
	args: {
		hackathonId: v.id("hackathons"),
		orderedIds: v.array(v.id("categories")),
	},
	handler: async (ctx, args) => {
		const user = await requireAuth(ctx);
		await requireHackathonOrganiser(ctx, args.hackathonId, user.clerkId);

		for (let i = 0; i < args.orderedIds.length; i++) {
			await ctx.db.patch(args.orderedIds[i], { order: i + 1 });
		}
	},
});
