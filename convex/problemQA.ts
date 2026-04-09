import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireAuth, getCurrentUser } from "./auth";
import type { QueryCtx, MutationCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";

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

export const askQuestion = mutation({
	args: {
		problemId: v.id("problems"),
		hackathonId: v.id("hackathons"),
		question: v.string(),
	},
	handler: async (ctx, args) => {
		const user = await requireAuth(ctx);

		const problem = await ctx.db.get(args.problemId);
		if (!problem) throw new ConvexError("Problem not found");

		return await ctx.db.insert("problemQuestions", {
			problemId: args.problemId,
			hackathonId: args.hackathonId,
			askerId: user.clerkId,
			question: args.question,
			isPublished: false,
			createdAt: Date.now(),
		});
	},
});

export const answerQuestion = mutation({
	args: {
		questionId: v.id("problemQuestions"),
		answer: v.string(),
	},
	handler: async (ctx, args) => {
		const user = await requireAuth(ctx);
		const question = await ctx.db.get(args.questionId);
		if (!question) throw new ConvexError("Question not found");

		const problem = await ctx.db.get(question.problemId);
		if (!problem) throw new ConvexError("Problem not found");

		const isProposer = problem.proposerId === user.clerkId;
		const isCurator = await isOrganizerOrCurator(
			ctx,
			question.hackathonId,
			user.clerkId,
		);

		if (!isProposer && !isCurator) {
			throw new ConvexError("Not authorized to answer this question");
		}

		await ctx.db.patch(args.questionId, {
			answer: args.answer,
			answeredBy: user.clerkId,
			answeredAt: Date.now(),
		});
	},
});

export const publishQuestion = mutation({
	args: { questionId: v.id("problemQuestions") },
	handler: async (ctx, args) => {
		const user = await requireAuth(ctx);
		const question = await ctx.db.get(args.questionId);
		if (!question) throw new ConvexError("Question not found");

		if (
			!(await isOrganizerOrCurator(ctx, question.hackathonId, user.clerkId))
		) {
			throw new ConvexError("Not authorized");
		}

		await ctx.db.patch(args.questionId, { isPublished: true });
	},
});

export const unpublishQuestion = mutation({
	args: { questionId: v.id("problemQuestions") },
	handler: async (ctx, args) => {
		const user = await requireAuth(ctx);
		const question = await ctx.db.get(args.questionId);
		if (!question) throw new ConvexError("Question not found");

		if (
			!(await isOrganizerOrCurator(ctx, question.hackathonId, user.clerkId))
		) {
			throw new ConvexError("Not authorized");
		}

		await ctx.db.patch(args.questionId, { isPublished: false });
	},
});

export const listQuestionsForProblem = query({
	args: { problemId: v.id("problems") },
	handler: async (ctx, args) => {
		const problem = await ctx.db.get(args.problemId);
		if (!problem) return [];

		const allQuestions = await ctx.db
			.query("problemQuestions")
			.withIndex("by_problem", (q) => q.eq("problemId", args.problemId))
			.collect();

		const user = await getCurrentUser(ctx);
		const isPrivileged =
			user &&
			(problem.proposerId === user.clerkId ||
				(await isOrganizerOrCurator(ctx, problem.hackathonId, user.clerkId)));

		if (isPrivileged) return allQuestions;

		return allQuestions.filter((q) => q.isPublished);
	},
});

export const listAllForHackathon = query({
	args: { hackathonId: v.id("hackathons") },
	handler: async (ctx, args) => {
		const user = await requireAuth(ctx);
		if (!(await isOrganizerOrCurator(ctx, args.hackathonId, user.clerkId))) {
			throw new ConvexError("Not authorized");
		}

		const questions = await ctx.db
			.query("problemQuestions")
			.withIndex("by_hackathon", (q) => q.eq("hackathonId", args.hackathonId))
			.collect();

		// Enrich with problem titles
		const problemIds = [...new Set(questions.map((q) => q.problemId))];
		const problems = await Promise.all(problemIds.map((id) => ctx.db.get(id)));
		const problemMap = new Map(
			problems.filter(Boolean).map((p) => [p!._id, p!.title]),
		);

		return questions.map((q) => ({
			...q,
			problemTitle: problemMap.get(q.problemId) ?? "Unknown",
		}));
	},
});

export const deleteQuestion = mutation({
	args: { questionId: v.id("problemQuestions") },
	handler: async (ctx, args) => {
		const user = await requireAuth(ctx);
		const question = await ctx.db.get(args.questionId);
		if (!question) throw new ConvexError("Question not found");

		const isCurator = await isOrganizerOrCurator(
			ctx,
			question.hackathonId,
			user.clerkId,
		);
		const isAskerUnanswered =
			question.askerId === user.clerkId && !question.answer;

		if (!isCurator && !isAskerUnanswered) {
			throw new ConvexError("Not authorized to delete this question");
		}

		await ctx.db.delete(args.questionId);
	},
});
