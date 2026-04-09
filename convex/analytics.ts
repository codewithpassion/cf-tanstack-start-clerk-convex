import { ConvexError, v } from "convex/values";
import { query } from "./_generated/server";
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
		throw new ConvexError("Only organisers can view analytics");
	}

	return user;
}

export const getHackathonStats = query({
	args: { hackathonId: v.id("hackathons") },
	handler: async (ctx, args) => {
		await requireOrganiser(ctx, args.hackathonId);

		const [roles, teams, submissions, problems, judgeAssignments] =
			await Promise.all([
				ctx.db
					.query("hackathonRoles")
					.withIndex("by_hackathon", (q) =>
						q.eq("hackathonId", args.hackathonId),
					)
					.collect(),
				ctx.db
					.query("teams")
					.withIndex("by_hackathon", (q) =>
						q.eq("hackathonId", args.hackathonId),
					)
					.collect(),
				ctx.db
					.query("submissions")
					.withIndex("by_hackathon", (q) =>
						q.eq("hackathonId", args.hackathonId),
					)
					.collect(),
				ctx.db
					.query("problems")
					.withIndex("by_hackathon", (q) =>
						q.eq("hackathonId", args.hackathonId),
					)
					.collect(),
				ctx.db
					.query("judgeAssignments")
					.withIndex("by_hackathon", (q) =>
						q.eq("hackathonId", args.hackathonId),
					)
					.collect(),
			]);

		const latestSubmissions = submissions.filter((s) => s.isLatest);
		const approvedSubmissions = latestSubmissions.filter(
			(s) => s.status === "approved",
		);
		const pendingProblems = problems.filter((p) => p.status === "pending");
		const totalTeams = teams.length;

		// Count unique teams with at least one submission
		const teamsWithSubmission = new Set(
			latestSubmissions.map((s) => s.teamId.toString()),
		);

		// Count unique judges
		const uniqueJudges = new Set(
			judgeAssignments.map((ja) => ja.judgeId),
		);

		return {
			totalRegistrations: roles.length,
			totalTeams,
			totalSubmissions: latestSubmissions.length,
			approvedSubmissions: approvedSubmissions.length,
			pendingProblems: pendingProblems.length,
			totalProblems: problems.length,
			judgesAssigned: uniqueJudges.size,
			submissionRate:
				totalTeams > 0 ? teamsWithSubmission.size / totalTeams : 0,
		};
	},
});

export const getRegistrationTimeline = query({
	args: { hackathonId: v.id("hackathons") },
	handler: async (ctx, args) => {
		await requireOrganiser(ctx, args.hackathonId);

		const roles = await ctx.db
			.query("hackathonRoles")
			.withIndex("by_hackathon", (q) =>
				q.eq("hackathonId", args.hackathonId),
			)
			.collect();

		// Group by date string for the last 30 days
		const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
		const byDate = new Map<string, number>();

		for (const r of roles) {
			if (r.createdAt < thirtyDaysAgo) continue;
			const date = new Date(r.createdAt).toISOString().split("T")[0];
			byDate.set(date, (byDate.get(date) ?? 0) + 1);
		}

		// Sort by date
		const timeline = Array.from(byDate.entries())
			.map(([date, count]) => ({ date, count }))
			.sort((a, b) => a.date.localeCompare(b.date));

		return timeline;
	},
});
