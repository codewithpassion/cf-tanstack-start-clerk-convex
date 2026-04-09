import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { QueryCtx, MutationCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { requireAuth } from "./auth";

/** Check if user is an organiser or owner of a hackathon. */
async function requireOrganiser(
	ctx: QueryCtx | MutationCtx,
	hackathonId: Id<"hackathons">,
) {
	const user = await requireAuth(ctx);
	const hackathon = await ctx.db.get(hackathonId);
	if (!hackathon) throw new ConvexError("Hackathon not found");

	if (hackathon.ownerId === user.clerkId) return user;

	const role = await ctx.db
		.query("hackathonRoles")
		.withIndex("by_hackathon_user", (q) =>
			q.eq("hackathonId", hackathonId).eq("userId", user.clerkId),
		)
		.unique();

	if (role?.role !== "organiser") {
		throw new ConvexError("Only organisers can perform this action");
	}

	return user;
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

export const log = mutation({
	args: {
		action: v.string(),
		hackathonId: v.optional(v.id("hackathons")),
		entityType: v.optional(v.string()),
		entityId: v.optional(v.string()),
		metadata: v.optional(v.any()),
	},
	handler: async (ctx, args) => {
		const user = await requireAuth(ctx);

		await ctx.db.insert("auditLogs", {
			userId: user.clerkId,
			hackathonId: args.hackathonId,
			action: args.action,
			entityType: args.entityType,
			entityId: args.entityId,
			metadata: args.metadata,
			createdAt: Date.now(),
		});
	},
});

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export const listByHackathon = query({
	args: {
		hackathonId: v.id("hackathons"),
		limit: v.optional(v.number()),
	},
	handler: async (ctx, args) => {
		await requireOrganiser(ctx, args.hackathonId);
		const limit = args.limit ?? 50;

		const logs = await ctx.db
			.query("auditLogs")
			.withIndex("by_hackathon", (q) =>
				q.eq("hackathonId", args.hackathonId),
			)
			.order("desc")
			.take(limit);

		// Join with user info
		const logsWithUsers = await Promise.all(
			logs.map(async (log) => {
				const user = await ctx.db
					.query("users")
					.withIndex("by_clerkId", (q) => q.eq("clerkId", log.userId))
					.unique();
				return {
					...log,
					userName: user?.name ?? "Unknown",
					userEmail: user?.email ?? null,
				};
			}),
		);

		return logsWithUsers;
	},
});

export const listByUser = query({
	args: {
		userId: v.string(),
		limit: v.optional(v.number()),
	},
	handler: async (ctx, args) => {
		const user = await requireAuth(ctx);

		// Admin only: check users.roles includes 'admin'
		if (!user.roles?.includes("admin")) {
			throw new ConvexError("Admin access required");
		}

		const limit = args.limit ?? 50;

		const logs = await ctx.db
			.query("auditLogs")
			.withIndex("by_user", (q) => q.eq("userId", args.userId))
			.order("desc")
			.take(limit);

		return logs;
	},
});

export const listRecent = query({
	args: {
		hackathonId: v.id("hackathons"),
		limit: v.optional(v.number()),
	},
	handler: async (ctx, args) => {
		await requireOrganiser(ctx, args.hackathonId);
		const limit = args.limit ?? 20;

		const logs = await ctx.db
			.query("auditLogs")
			.withIndex("by_hackathon", (q) =>
				q.eq("hackathonId", args.hackathonId),
			)
			.order("desc")
			.take(limit);

		const logsWithUsers = await Promise.all(
			logs.map(async (log) => {
				const user = await ctx.db
					.query("users")
					.withIndex("by_clerkId", (q) => q.eq("clerkId", log.userId))
					.unique();
				return {
					...log,
					userName: user?.name ?? "Unknown",
				};
			}),
		);

		return logsWithUsers;
	},
});
