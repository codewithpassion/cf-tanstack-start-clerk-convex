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

async function requireOrganiser(
	ctx: QueryCtx | MutationCtx,
	hackathonId: Id<"hackathons">,
) {
	const user = await requireAuth(ctx);
	const role = await getHackathonRole(ctx, hackathonId, user.clerkId);
	if (role !== "organiser") {
		throw new ConvexError("Only organisers can perform this action");
	}
	return user;
}

export const assignToCategory = mutation({
	args: {
		hackathonId: v.id("hackathons"),
		judgeId: v.string(),
		categoryId: v.id("categories"),
	},
	handler: async (ctx, args) => {
		const user = await requireOrganiser(ctx, args.hackathonId);

		// Verify judge has judge role
		const judgeRole = await getHackathonRole(
			ctx,
			args.hackathonId,
			args.judgeId,
		);
		if (judgeRole !== "judge" && judgeRole !== "organiser") {
			throw new ConvexError("User does not have a judge role in this hackathon");
		}

		// Check for duplicate assignment
		const existing = await ctx.db
			.query("judgeAssignments")
			.withIndex("by_hackathon_judge", (q) =>
				q.eq("hackathonId", args.hackathonId).eq("judgeId", args.judgeId),
			)
			.collect();
		const duplicate = existing.find(
			(a) =>
				a.categoryId !== undefined &&
				(a.categoryId as Id<"categories">) === args.categoryId &&
				a.submissionId === undefined,
		);
		if (duplicate) {
			throw new ConvexError("Judge is already assigned to this category");
		}

		await ctx.db.insert("judgeAssignments", {
			hackathonId: args.hackathonId,
			judgeId: args.judgeId,
			categoryId: args.categoryId,
			assignedBy: user.clerkId,
			createdAt: Date.now(),
		});
	},
});

export const assignToSubmission = mutation({
	args: {
		hackathonId: v.id("hackathons"),
		judgeId: v.string(),
		submissionId: v.id("submissions"),
	},
	handler: async (ctx, args) => {
		const user = await requireOrganiser(ctx, args.hackathonId);

		const judgeRole = await getHackathonRole(
			ctx,
			args.hackathonId,
			args.judgeId,
		);
		if (judgeRole !== "judge" && judgeRole !== "organiser") {
			throw new ConvexError("User does not have a judge role in this hackathon");
		}

		// Check for duplicate
		const existing = await ctx.db
			.query("judgeAssignments")
			.withIndex("by_hackathon_judge", (q) =>
				q.eq("hackathonId", args.hackathonId).eq("judgeId", args.judgeId),
			)
			.collect();
		const duplicate = existing.find(
			(a) =>
				a.submissionId !== undefined &&
				(a.submissionId as Id<"submissions">) === args.submissionId,
		);
		if (duplicate) {
			throw new ConvexError("Judge is already assigned to this submission");
		}

		await ctx.db.insert("judgeAssignments", {
			hackathonId: args.hackathonId,
			judgeId: args.judgeId,
			submissionId: args.submissionId,
			assignedBy: user.clerkId,
			createdAt: Date.now(),
		});
	},
});

export const removeAssignment = mutation({
	args: { assignmentId: v.id("judgeAssignments") },
	handler: async (ctx, args) => {
		const assignment = await ctx.db.get(args.assignmentId);
		if (!assignment) throw new ConvexError("Assignment not found");

		await requireOrganiser(ctx, assignment.hackathonId);

		// Cannot remove after judging starts
		const hackathon = await ctx.db.get(assignment.hackathonId);
		if (
			hackathon &&
			(hackathon.status === "judging" || hackathon.status === "closed")
		) {
			throw new ConvexError(
				"Cannot modify assignments after judging has started",
			);
		}

		await ctx.db.delete(args.assignmentId);
	},
});

export const listForHackathon = query({
	args: { hackathonId: v.id("hackathons") },
	handler: async (ctx, args) => {
		await requireOrganiser(ctx, args.hackathonId);

		const assignments = await ctx.db
			.query("judgeAssignments")
			.withIndex("by_hackathon", (q) =>
				q.eq("hackathonId", args.hackathonId),
			)
			.collect();

		return await Promise.all(
			assignments.map(async (a) => {
				const judgeUser = await ctx.db
					.query("users")
					.withIndex("by_clerkId", (q) => q.eq("clerkId", a.judgeId))
					.unique();
				const category = a.categoryId
					? await ctx.db.get(a.categoryId)
					: null;
				const submission = a.submissionId
					? await ctx.db.get(a.submissionId)
					: null;
				return {
					...a,
					judgeName: judgeUser?.name ?? null,
					judgeEmail: judgeUser?.email ?? null,
					categoryName: category?.name ?? null,
					submissionTitle: submission?.title ?? null,
				};
			}),
		);
	},
});

export const listForJudge = query({
	args: { hackathonId: v.id("hackathons") },
	handler: async (ctx, args) => {
		const user = await requireAuth(ctx);

		const assignments = await ctx.db
			.query("judgeAssignments")
			.withIndex("by_hackathon_judge", (q) =>
				q.eq("hackathonId", args.hackathonId).eq("judgeId", user.clerkId),
			)
			.collect();

		return await Promise.all(
			assignments.map(async (a) => {
				const category = a.categoryId
					? await ctx.db.get(a.categoryId)
					: null;
				const submission = a.submissionId
					? await ctx.db.get(a.submissionId)
					: null;
				return {
					...a,
					categoryName: category?.name ?? null,
					categoryOrder: category?.order ?? null,
					submissionTitle: submission?.title ?? null,
				};
			}),
		);
	},
});

export const getJudgingWorkload = query({
	args: { hackathonId: v.id("hackathons") },
	handler: async (ctx, args) => {
		await requireOrganiser(ctx, args.hackathonId);

		const categories = await ctx.db
			.query("categories")
			.withIndex("by_hackathon", (q) =>
				q.eq("hackathonId", args.hackathonId),
			)
			.collect();

		const submissions = await ctx.db
			.query("submissions")
			.withIndex("by_hackathon_status", (q) =>
				q.eq("hackathonId", args.hackathonId).eq("status", "approved"),
			)
			.collect();
		const latestSubmissions = submissions.filter((s) => s.isLatest);

		const assignments = await ctx.db
			.query("judgeAssignments")
			.withIndex("by_hackathon", (q) =>
				q.eq("hackathonId", args.hackathonId),
			)
			.collect();

		return categories
			.sort((a, b) => a.order - b.order)
			.map((cat) => {
				const catSubmissions = latestSubmissions.filter((s) =>
					s.categoryIds.includes(cat._id),
				);
				const catJudges = assignments.filter(
					(a) =>
						a.categoryId !== undefined &&
						(a.categoryId as Id<"categories">) === cat._id,
				);
				const uniqueJudgeIds = new Set(catJudges.map((a) => a.judgeId));
				return {
					categoryId: cat._id,
					categoryName: cat.name,
					submissionCount: catSubmissions.length,
					judgeCount: uniqueJudgeIds.size,
				};
			});
	},
});

export const getMyAssignments = query({
	args: { hackathonId: v.id("hackathons") },
	handler: async (ctx, args) => {
		const user = await requireAuth(ctx);

		return await ctx.db
			.query("judgeAssignments")
			.withIndex("by_hackathon_judge", (q) =>
				q.eq("hackathonId", args.hackathonId).eq("judgeId", user.clerkId),
			)
			.collect();
	},
});
