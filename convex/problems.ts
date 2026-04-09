import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireAuth, getCurrentUser } from "./auth";
import type { QueryCtx, MutationCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";

/** Check if user is organiser or curator for a hackathon. */
async function isOrganizerOrCurator(
	ctx: QueryCtx | MutationCtx,
	hackathonId: Id<"hackathons">,
	clerkId: string,
): Promise<boolean> {
	const hackathon = await ctx.db.get(hackathonId);
	if (!hackathon) return false;
	if (hackathon.ownerId === clerkId) return true;

	const role = await ctx.db
		.query("hackathonRoles")
		.withIndex("by_hackathon_user", (q) =>
			q.eq("hackathonId", hackathonId).eq("userId", clerkId),
		)
		.unique();

	return role?.role === "organiser" || role?.role === "curator";
}

export const listByHackathon = query({
	args: { hackathonId: v.id("hackathons") },
	handler: async (ctx, args) => {
		const user = await getCurrentUser(ctx);
		const isCurator =
			user && (await isOrganizerOrCurator(ctx, args.hackathonId, user.clerkId));

		const problems = await ctx.db
			.query("problems")
			.withIndex("by_hackathon", (q) => q.eq("hackathonId", args.hackathonId))
			.collect();

		if (isCurator) return problems;

		return problems.filter((p) => p.status === "approved");
	},
});

export const getById = query({
	args: { id: v.id("problems") },
	handler: async (ctx, args) => {
		const problem = await ctx.db.get(args.id);
		if (!problem) return null;

		const proposer = await ctx.db
			.query("users")
			.withIndex("by_clerkId", (q) => q.eq("clerkId", problem.proposerId))
			.unique();

		return {
			...problem,
			proposerName: proposer?.name ?? "Unknown",
			proposerEmail: proposer?.email ?? "",
		};
	},
});

export const create = mutation({
	args: {
		hackathonId: v.id("hackathons"),
		title: v.string(),
		description: v.string(),
		backgroundContext: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		const user = await requireAuth(ctx);
		const hackathon = await ctx.db.get(args.hackathonId);
		if (!hackathon) throw new ConvexError("Hackathon not found");

		const now = Date.now();
		const status =
			hackathon.problemModerationMode === "auto" ? "approved" : "pending";

		const id = await ctx.db.insert("problems", {
			hackathonId: args.hackathonId,
			proposerId: user.clerkId,
			title: args.title,
			description: args.description,
			backgroundContext: args.backgroundContext,
			status,
			createdAt: now,
			updatedAt: now,
			...(status === "approved"
				? { approvedBy: user.clerkId, approvedAt: now }
				: {}),
		});
		return id;
	},
});

export const update = mutation({
	args: {
		id: v.id("problems"),
		title: v.optional(v.string()),
		description: v.optional(v.string()),
		backgroundContext: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		const user = await requireAuth(ctx);
		const problem = await ctx.db.get(args.id);
		if (!problem) throw new ConvexError("Problem not found");
		if (problem.proposerId !== user.clerkId) {
			throw new ConvexError("Only the proposer can update this problem");
		}
		if (problem.status === "rejected" || problem.status === "hidden") {
			throw new ConvexError("Cannot update a rejected or hidden problem");
		}

		const { id, ...updates } = args;
		const patch: Record<string, unknown> = { updatedAt: Date.now() };
		for (const [key, value] of Object.entries(updates)) {
			if (value !== undefined) patch[key] = value;
		}
		await ctx.db.patch(id, patch);
	},
});

export const remove = mutation({
	args: { id: v.id("problems") },
	handler: async (ctx, args) => {
		const user = await requireAuth(ctx);
		const problem = await ctx.db.get(args.id);
		if (!problem) throw new ConvexError("Problem not found");

		const isCurator = await isOrganizerOrCurator(
			ctx,
			problem.hackathonId,
			user.clerkId,
		);
		const isProposerPending =
			problem.proposerId === user.clerkId && problem.status === "pending";

		if (!isCurator && !isProposerPending) {
			throw new ConvexError("Not authorized to delete this problem");
		}

		await ctx.db.delete(args.id);
	},
});

export const approve = mutation({
	args: { id: v.id("problems") },
	handler: async (ctx, args) => {
		const user = await requireAuth(ctx);
		const problem = await ctx.db.get(args.id);
		if (!problem) throw new ConvexError("Problem not found");

		if (!(await isOrganizerOrCurator(ctx, problem.hackathonId, user.clerkId))) {
			throw new ConvexError("Not authorized");
		}

		await ctx.db.patch(args.id, {
			status: "approved",
			approvedBy: user.clerkId,
			approvedAt: Date.now(),
			updatedAt: Date.now(),
		});
	},
});

export const reject = mutation({
	args: { id: v.id("problems"), reason: v.optional(v.string()) },
	handler: async (ctx, args) => {
		const user = await requireAuth(ctx);
		const problem = await ctx.db.get(args.id);
		if (!problem) throw new ConvexError("Problem not found");

		if (!(await isOrganizerOrCurator(ctx, problem.hackathonId, user.clerkId))) {
			throw new ConvexError("Not authorized");
		}

		await ctx.db.patch(args.id, {
			status: "rejected",
			updatedAt: Date.now(),
		});
	},
});

export const hide = mutation({
	args: { id: v.id("problems") },
	handler: async (ctx, args) => {
		const user = await requireAuth(ctx);
		const problem = await ctx.db.get(args.id);
		if (!problem) throw new ConvexError("Problem not found");

		if (!(await isOrganizerOrCurator(ctx, problem.hackathonId, user.clerkId))) {
			throw new ConvexError("Not authorized");
		}

		await ctx.db.patch(args.id, {
			status: "hidden",
			hiddenBy: user.clerkId,
			hiddenAt: Date.now(),
			updatedAt: Date.now(),
		});
	},
});

export const unhide = mutation({
	args: { id: v.id("problems") },
	handler: async (ctx, args) => {
		const user = await requireAuth(ctx);
		const problem = await ctx.db.get(args.id);
		if (!problem) throw new ConvexError("Problem not found");

		if (!(await isOrganizerOrCurator(ctx, problem.hackathonId, user.clerkId))) {
			throw new ConvexError("Not authorized");
		}

		await ctx.db.patch(args.id, {
			status: "approved",
			approvedBy: user.clerkId,
			approvedAt: Date.now(),
			updatedAt: Date.now(),
		});
	},
});

export const listPending = query({
	args: { hackathonId: v.id("hackathons") },
	handler: async (ctx, args) => {
		const user = await requireAuth(ctx);
		if (!(await isOrganizerOrCurator(ctx, args.hackathonId, user.clerkId))) {
			throw new ConvexError("Not authorized");
		}

		return await ctx.db
			.query("problems")
			.withIndex("by_hackathon_status", (q) =>
				q.eq("hackathonId", args.hackathonId).eq("status", "pending"),
			)
			.collect();
	},
});

export const listByProposer = query({
	args: { hackathonId: v.id("hackathons") },
	handler: async (ctx, args) => {
		const user = await requireAuth(ctx);
		const all = await ctx.db
			.query("problems")
			.withIndex("by_hackathon", (q) => q.eq("hackathonId", args.hackathonId))
			.collect();

		return all.filter((p) => p.proposerId === user.clerkId);
	},
});

export const getHackathonBySlug = query({
	args: { slug: v.string() },
	handler: async (ctx, { slug }) => {
		return await ctx.db
			.query("hackathons")
			.withIndex("by_slug", (q) => q.eq("slug", slug))
			.unique();
	},
});

export const listApprovedByHackathon = query({
	args: { hackathonId: v.id("hackathons") },
	handler: async (ctx, args) => {
		return await ctx.db
			.query("problems")
			.withIndex("by_hackathon_status", (q) =>
				q.eq("hackathonId", args.hackathonId).eq("status", "approved"),
			)
			.collect();
	},
});
