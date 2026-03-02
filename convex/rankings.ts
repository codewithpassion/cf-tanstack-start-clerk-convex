import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import type { QueryCtx, MutationCtx } from "./_generated/server";
import { requireAuth } from "./auth";

async function getHackathonRole(
	ctx: QueryCtx | MutationCtx,
	hackathonId: Id<"hackathons">,
	clerkId: string,
) {
	const hackathon = await ctx.db.get(hackathonId);
	if (!hackathon) return null;
	if (hackathon.ownerId === clerkId) return "organiser" as const;
	const role = await ctx.db
		.query("hackathonRoles")
		.withIndex("by_hackathon_user", (q) =>
			q.eq("hackathonId", hackathonId).eq("userId", clerkId),
		)
		.unique();
	return role?.role ?? null;
}

export const saveRanking = mutation({
	args: {
		hackathonId: v.id("hackathons"),
		submissionId: v.id("submissions"),
		categoryId: v.optional(v.id("categories")),
		rank: v.number(),
	},
	handler: async (ctx, args) => {
		const user = await requireAuth(ctx);

		if (args.rank < 1 || args.rank > 3) {
			throw new ConvexError("Rank must be 1, 2, or 3");
		}

		// Verify judge role
		const role = await getHackathonRole(
			ctx,
			args.hackathonId,
			user.clerkId,
		);
		if (role !== "judge" && role !== "organiser") {
			throw new ConvexError("Only judges can submit rankings");
		}

		// Verify assignment exists for this judge
		const assignments = await ctx.db
			.query("judgeAssignments")
			.withIndex("by_hackathon_judge", (q) =>
				q
					.eq("hackathonId", args.hackathonId)
					.eq("judgeId", user.clerkId),
			)
			.collect();

		const hasAssignment = assignments.some((a) => {
			if (args.categoryId) {
				return (
					a.categoryId !== undefined &&
					(a.categoryId as Id<"categories">) === args.categoryId
				);
			}
			return (
				a.submissionId !== undefined &&
				(a.submissionId as Id<"submissions">) === args.submissionId
			);
		});

		if (!hasAssignment) {
			throw new ConvexError("Not assigned to judge this");
		}

		// Check if existing ranking exists (upsert)
		const existingRankings = await ctx.db
			.query("rankings")
			.withIndex("by_hackathon_judge", (q) =>
				q
					.eq("hackathonId", args.hackathonId)
					.eq("judgeId", user.clerkId),
			)
			.collect();

		const existing = existingRankings.find(
			(r) =>
				(r.submissionId as Id<"submissions">) === args.submissionId &&
				(args.categoryId
					? r.categoryId !== undefined &&
						(r.categoryId as Id<"categories">) === args.categoryId
					: r.categoryId === undefined),
		);

		if (existing) {
			await ctx.db.patch(existing._id, {
				rank: args.rank,
				updatedAt: Date.now(),
			});
		} else {
			await ctx.db.insert("rankings", {
				hackathonId: args.hackathonId,
				judgeId: user.clerkId,
				submissionId: args.submissionId,
				categoryId: args.categoryId,
				rank: args.rank,
				createdAt: Date.now(),
				updatedAt: Date.now(),
			});
		}
	},
});

export const removeRanking = mutation({
	args: {
		hackathonId: v.id("hackathons"),
		submissionId: v.id("submissions"),
		categoryId: v.optional(v.id("categories")),
	},
	handler: async (ctx, args) => {
		const user = await requireAuth(ctx);

		const existingRankings = await ctx.db
			.query("rankings")
			.withIndex("by_hackathon_judge", (q) =>
				q
					.eq("hackathonId", args.hackathonId)
					.eq("judgeId", user.clerkId),
			)
			.collect();

		const existing = existingRankings.find(
			(r) =>
				(r.submissionId as Id<"submissions">) === args.submissionId &&
				(args.categoryId
					? r.categoryId !== undefined &&
						(r.categoryId as Id<"categories">) === args.categoryId
					: r.categoryId === undefined),
		);

		if (existing) {
			await ctx.db.delete(existing._id);
		}
	},
});

export const getRankings = query({
	args: { hackathonId: v.id("hackathons") },
	handler: async (ctx, args) => {
		const user = await requireAuth(ctx);

		return await ctx.db
			.query("rankings")
			.withIndex("by_hackathon_judge", (q) =>
				q
					.eq("hackathonId", args.hackathonId)
					.eq("judgeId", user.clerkId),
			)
			.collect();
	},
});

export const getCategoryRankings = query({
	args: {
		hackathonId: v.id("hackathons"),
		categoryId: v.id("categories"),
	},
	handler: async (ctx, args) => {
		const user = await requireAuth(ctx);
		const role = await getHackathonRole(
			ctx,
			args.hackathonId,
			user.clerkId,
		);
		if (role !== "organiser") {
			throw new ConvexError("Only organisers can view all rankings");
		}

		const allRankings = await ctx.db
			.query("rankings")
			.withIndex("by_hackathon_category", (q) =>
				q
					.eq("hackathonId", args.hackathonId)
					.eq("categoryId", args.categoryId),
			)
			.collect();

		return allRankings;
	},
});

export const getSubmissionRankings = query({
	args: { submissionId: v.id("submissions") },
	handler: async (ctx, args) => {
		const user = await requireAuth(ctx);
		const submission = await ctx.db.get(args.submissionId);
		if (!submission) throw new ConvexError("Submission not found");

		const role = await getHackathonRole(
			ctx,
			submission.hackathonId,
			user.clerkId,
		);
		if (role !== "organiser") {
			throw new ConvexError("Only organisers can view all rankings");
		}

		return await ctx.db
			.query("rankings")
			.withIndex("by_submission", (q) =>
				q.eq("submissionId", args.submissionId),
			)
			.collect();
	},
});

export const hasJudgeSubmittedRankings = query({
	args: { hackathonId: v.id("hackathons") },
	handler: async (ctx, args) => {
		const user = await requireAuth(ctx);

		const rankings = await ctx.db
			.query("rankings")
			.withIndex("by_hackathon_judge", (q) =>
				q
					.eq("hackathonId", args.hackathonId)
					.eq("judgeId", user.clerkId),
			)
			.first();

		return rankings !== null;
	},
});
