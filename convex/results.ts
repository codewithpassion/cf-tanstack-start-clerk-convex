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

export const computeResults = mutation({
	args: {
		hackathonId: v.id("hackathons"),
		categoryId: v.optional(v.id("categories")),
	},
	handler: async (ctx, args) => {
		await requireOrganiser(ctx, args.hackathonId);

		// Get all rankings for scope
		let allRankings;
		if (args.categoryId) {
			allRankings = await ctx.db
				.query("rankings")
				.withIndex("by_hackathon_category", (q) =>
					q
						.eq("hackathonId", args.hackathonId)
						.eq("categoryId", args.categoryId),
				)
				.collect();
		} else {
			// Overall: get rankings with no categoryId
			const allHackathonRankings = await ctx.db
				.query("rankings")
				.withIndex("by_hackathon_judge", (q) =>
					q.eq("hackathonId", args.hackathonId),
				)
				.collect();
			// For overall, use all rankings regardless of category
			allRankings = allHackathonRankings;
		}

		// Aggregate by submission
		const bySubmission = new Map<
			string,
			{ total: number; first: number; second: number; third: number }
		>();
		for (const r of allRankings) {
			const key = r.submissionId as string;
			const pts = r.rank === 1 ? 3 : r.rank === 2 ? 2 : 1;
			const existing = bySubmission.get(key) ?? {
				total: 0,
				first: 0,
				second: 0,
				third: 0,
			};
			bySubmission.set(key, {
				total: existing.total + pts,
				first: existing.first + (r.rank === 1 ? 1 : 0),
				second: existing.second + (r.rank === 2 ? 1 : 0),
				third: existing.third + (r.rank === 3 ? 1 : 0),
			});
		}

		// Sort: total desc, first desc, second desc
		const sorted = [...bySubmission.entries()].sort(([, a], [, b]) => {
			if (b.total !== a.total) return b.total - a.total;
			if (b.first !== a.first) return b.first - a.first;
			return b.second - a.second;
		});

		// Delete existing results for this scope
		const existingResults = await ctx.db
			.query("results")
			.withIndex("by_hackathon_category", (q) =>
				q
					.eq("hackathonId", args.hackathonId)
					.eq("categoryId", args.categoryId),
			)
			.collect();
		for (const r of existingResults) {
			await ctx.db.delete(r._id);
		}

		// Insert new results
		const now = Date.now();
		for (let i = 0; i < sorted.length; i++) {
			const [submissionIdStr, scores] = sorted[i];
			const submissionId = submissionIdStr as Id<"submissions">;
			const submission = await ctx.db.get(submissionId);
			if (!submission) continue;

			await ctx.db.insert("results", {
				hackathonId: args.hackathonId,
				categoryId: args.categoryId,
				submissionId,
				teamId: submission.teamId,
				totalPoints: scores.total,
				firstPlaceVotes: scores.first,
				secondPlaceVotes: scores.second,
				thirdPlaceVotes: scores.third,
				rank: i + 1,
				isPublished: false,
				computedAt: now,
			});
		}
	},
});

export const overrideRank = mutation({
	args: {
		resultId: v.id("results"),
		newRank: v.number(),
	},
	handler: async (ctx, args) => {
		const result = await ctx.db.get(args.resultId);
		if (!result) throw new ConvexError("Result not found");

		const user = await requireOrganiser(ctx, result.hackathonId);

		await ctx.db.patch(args.resultId, {
			rank: args.newRank,
			overriddenBy: user.clerkId,
			overriddenAt: Date.now(),
		});
	},
});

export const publishResults = mutation({
	args: {
		hackathonId: v.id("hackathons"),
		categoryId: v.optional(v.id("categories")),
	},
	handler: async (ctx, args) => {
		const user = await requireOrganiser(ctx, args.hackathonId);

		const results = await ctx.db
			.query("results")
			.withIndex("by_hackathon_category", (q) =>
				q
					.eq("hackathonId", args.hackathonId)
					.eq("categoryId", args.categoryId),
			)
			.collect();

		const now = Date.now();
		for (const r of results) {
			await ctx.db.patch(r._id, {
				isPublished: true,
				publishedBy: user.clerkId,
				publishedAt: now,
			});
		}
	},
});

export const unpublishResults = mutation({
	args: {
		hackathonId: v.id("hackathons"),
		categoryId: v.optional(v.id("categories")),
	},
	handler: async (ctx, args) => {
		await requireOrganiser(ctx, args.hackathonId);

		const results = await ctx.db
			.query("results")
			.withIndex("by_hackathon_category", (q) =>
				q
					.eq("hackathonId", args.hackathonId)
					.eq("categoryId", args.categoryId),
			)
			.collect();

		for (const r of results) {
			await ctx.db.patch(r._id, { isPublished: false });
		}
	},
});

export const getResults = query({
	args: {
		hackathonId: v.id("hackathons"),
		categoryId: v.optional(v.id("categories")),
	},
	handler: async (ctx, args) => {
		const results = await ctx.db
			.query("results")
			.withIndex("by_hackathon_category", (q) =>
				q
					.eq("hackathonId", args.hackathonId)
					.eq("categoryId", args.categoryId),
			)
			.collect();

		if (results.length === 0) return [];

		// Check if published
		const anyPublished = results.some((r) => r.isPublished);

		// If not published, require organiser
		if (!anyPublished) {
			const identity = await ctx.auth.getUserIdentity();
			if (!identity) return [];
			const role = await getHackathonRole(
				ctx,
				args.hackathonId,
				identity.subject,
			);
			if (role !== "organiser") return [];
		}

		// Join with submission and team info
		const enriched = await Promise.all(
			results.map(async (r) => {
				const submission = await ctx.db.get(r.submissionId);
				const team = await ctx.db.get(r.teamId);
				return {
					...r,
					submissionTitle: submission?.title ?? "Unknown",
					teamName: team?.name ?? "Unknown",
				};
			}),
		);

		return enriched.sort((a, b) => a.rank - b.rank);
	},
});

export const getWinners = query({
	args: { hackathonId: v.id("hackathons") },
	handler: async (ctx, args) => {
		// Get published overall results (categoryId is undefined)
		const results = await ctx.db
			.query("results")
			.withIndex("by_hackathon_published", (q) =>
				q.eq("hackathonId", args.hackathonId).eq("isPublished", true),
			)
			.collect();

		// Filter to overall results (no categoryId)
		const overallResults = results.filter((r) => r.categoryId === undefined);

		if (overallResults.length === 0) return [];

		const top3 = overallResults.sort((a, b) => a.rank - b.rank).slice(0, 3);

		return await Promise.all(
			top3.map(async (r) => {
				const submission = await ctx.db.get(r.submissionId);
				const team = await ctx.db.get(r.teamId);
				return {
					...r,
					submissionTitle: submission?.title ?? "Unknown",
					teamName: team?.name ?? "Unknown",
				};
			}),
		);
	},
});
