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

/** Check if user is a member of the given team. */
async function requireTeamMember(
	ctx: QueryCtx | MutationCtx,
	teamId: Id<"teams">,
	clerkId: string,
) {
	const team = await ctx.db.get(teamId);
	if (!team) throw new ConvexError("Team not found");

	if (team.leaderId === clerkId) return team;

	const membership = await ctx.db
		.query("teamMembers")
		.withIndex("by_team", (q) => q.eq("teamId", teamId))
		.collect();

	const isMember = membership.some((m) => m.userId === clerkId);
	if (!isMember) throw new ConvexError("Not a team member");

	return team;
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export const getById = query({
	args: { id: v.id("submissions") },
	handler: async (ctx, args) => {
		const submission = await ctx.db.get(args.id);
		if (!submission) return null;

		const team = await ctx.db.get(submission.teamId);

		// Fetch categories
		const categories = await Promise.all(
			submission.categoryIds.map((cId) => ctx.db.get(cId)),
		);

		// Fetch problem title if set
		let problemTitle: string | null = null;
		if (submission.problemId) {
			const problem = await ctx.db.get(submission.problemId);
			problemTitle = problem?.title ?? null;
		}

		return {
			...submission,
			teamName: team?.name ?? "Unknown team",
			categories: categories.filter(Boolean),
			problemTitle,
		};
	},
});

export const getMyTeamSubmission = query({
	args: {
		hackathonId: v.id("hackathons"),
		teamId: v.id("teams"),
	},
	handler: async (ctx, args) => {
		const latest = await ctx.db
			.query("submissions")
			.withIndex("by_team_latest", (q) =>
				q.eq("teamId", args.teamId).eq("isLatest", true),
			)
			.unique();

		if (!latest || latest.hackathonId !== args.hackathonId) return null;

		return latest;
	},
});

export const listByHackathon = query({
	args: {
		hackathonId: v.id("hackathons"),
		status: v.optional(
			v.union(
				v.literal("draft"),
				v.literal("submitted"),
				v.literal("approved"),
				v.literal("rejected"),
			),
		),
	},
	handler: async (ctx, args) => {
		const user = await getCurrentUser(ctx);
		const isCurator =
			user &&
			(await isOrganizerOrCurator(ctx, args.hackathonId, user.clerkId));

		let submissions;
		if (args.status) {
			submissions = await ctx.db
				.query("submissions")
				.withIndex("by_hackathon_status", (q) =>
					q
						.eq("hackathonId", args.hackathonId)
						.eq("status", args.status!),
				)
				.collect();
		} else {
			submissions = await ctx.db
				.query("submissions")
				.withIndex("by_hackathon", (q) =>
					q.eq("hackathonId", args.hackathonId),
				)
				.collect();
		}

		// Only latest versions
		submissions = submissions.filter((s) => s.isLatest);

		// Non-curators only see approved
		if (!isCurator) {
			submissions = submissions.filter((s) => s.status === "approved");
		}

		// Join team names
		const result = await Promise.all(
			submissions.map(async (s) => {
				const team = await ctx.db.get(s.teamId);
				const categories = await Promise.all(
					s.categoryIds.map((cId) => ctx.db.get(cId)),
				);
				return {
					...s,
					teamName: team?.name ?? "Unknown team",
					categories: categories.filter(Boolean),
				};
			}),
		);

		return result;
	},
});

export const listPendingForCuration = query({
	args: { hackathonId: v.id("hackathons") },
	handler: async (ctx, args) => {
		const user = await requireAuth(ctx);
		if (
			!(await isOrganizerOrCurator(ctx, args.hackathonId, user.clerkId))
		) {
			throw new ConvexError("Not authorized");
		}

		const submissions = await ctx.db
			.query("submissions")
			.withIndex("by_hackathon_status", (q) =>
				q
					.eq("hackathonId", args.hackathonId)
					.eq("status", "submitted"),
			)
			.collect();

		const latest = submissions.filter((s) => s.isLatest);

		return await Promise.all(
			latest.map(async (s) => {
				const team = await ctx.db.get(s.teamId);
				const categories = await Promise.all(
					s.categoryIds.map((cId) => ctx.db.get(cId)),
				);
				return {
					...s,
					teamName: team?.name ?? "Unknown team",
					categories: categories.filter(Boolean),
				};
			}),
		);
	},
});

export const getVersionHistory = query({
	args: { submissionId: v.id("submissions") },
	handler: async (ctx, args) => {
		const versions: Array<{
			_id: Id<"submissions">;
			version: number;
			status: string;
			title: string;
			createdAt: number;
			submittedAt?: number;
		}> = [];

		let current = await ctx.db.get(args.submissionId);
		while (current) {
			versions.push({
				_id: current._id,
				version: current.version,
				status: current.status,
				title: current.title,
				createdAt: current.createdAt,
				submittedAt: current.submittedAt,
			});
			if (current.parentId) {
				current = await ctx.db.get(current.parentId);
			} else {
				break;
			}
		}

		return versions;
	},
});

/** Helper: list categories for a hackathon (in case categories.ts doesn't exist yet). */
export const listCategories = query({
	args: { hackathonId: v.id("hackathons") },
	handler: async (ctx, { hackathonId }) => {
		const categories = await ctx.db
			.query("categories")
			.withIndex("by_hackathon", (q) => q.eq("hackathonId", hackathonId))
			.collect();
		return categories.sort((a, b) => a.order - b.order);
	},
});

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

export const create = mutation({
	args: {
		hackathonId: v.id("hackathons"),
		teamId: v.id("teams"),
		title: v.string(),
		description: v.string(),
		categoryIds: v.array(v.id("categories")),
		problemId: v.optional(v.id("problems")),
		githubUrl: v.optional(v.string()),
		liveDemoUrl: v.optional(v.string()),
		videoUrl: v.optional(v.string()),
		deckUrl: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		const user = await requireAuth(ctx);

		// Verify team membership
		await requireTeamMember(ctx, args.teamId, user.clerkId);

		// Check submission cutoff
		const hackathon = await ctx.db.get(args.hackathonId);
		if (!hackathon) throw new ConvexError("Hackathon not found");
		if (
			hackathon.submissionCutoff &&
			Date.now() > hackathon.submissionCutoff
		) {
			throw new ConvexError("Submission deadline has passed");
		}

		// Check no existing latest submission for this team
		const existing = await ctx.db
			.query("submissions")
			.withIndex("by_team_latest", (q) =>
				q.eq("teamId", args.teamId).eq("isLatest", true),
			)
			.unique();
		if (existing && existing.hackathonId === args.hackathonId) {
			throw new ConvexError(
				"Team already has a submission. Use edit to update.",
			);
		}

		const now = Date.now();
		const id = await ctx.db.insert("submissions", {
			hackathonId: args.hackathonId,
			teamId: args.teamId,
			title: args.title,
			description: args.description,
			categoryIds: args.categoryIds,
			problemId: args.problemId,
			githubUrl: args.githubUrl,
			liveDemoUrl: args.liveDemoUrl,
			videoUrl: args.videoUrl,
			deckUrl: args.deckUrl,
			status: "draft",
			version: 1,
			isLatest: true,
			createdAt: now,
			updatedAt: now,
		});

		return id;
	},
});

export const update = mutation({
	args: {
		id: v.id("submissions"),
		title: v.optional(v.string()),
		description: v.optional(v.string()),
		categoryIds: v.optional(v.array(v.id("categories"))),
		problemId: v.optional(v.id("problems")),
		githubUrl: v.optional(v.string()),
		liveDemoUrl: v.optional(v.string()),
		videoUrl: v.optional(v.string()),
		deckUrl: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		const user = await requireAuth(ctx);
		const old = await ctx.db.get(args.id);
		if (!old) throw new ConvexError("Submission not found");

		if (old.status === "approved" || old.status === "rejected") {
			throw new ConvexError("Cannot edit an approved or rejected submission");
		}

		// Verify team membership
		await requireTeamMember(ctx, old.teamId, user.clerkId);

		// Mark old version as not latest
		await ctx.db.patch(args.id, { isLatest: false });

		const now = Date.now();
		const newId = await ctx.db.insert("submissions", {
			hackathonId: old.hackathonId,
			teamId: old.teamId,
			title: args.title ?? old.title,
			description: args.description ?? old.description,
			categoryIds: args.categoryIds ?? old.categoryIds,
			problemId: args.problemId ?? old.problemId,
			githubUrl: args.githubUrl ?? old.githubUrl,
			liveDemoUrl: args.liveDemoUrl ?? old.liveDemoUrl,
			videoUrl: args.videoUrl ?? old.videoUrl,
			deckUrl: args.deckUrl ?? old.deckUrl,
			status: old.status,
			version: old.version + 1,
			isLatest: true,
			parentId: old._id,
			createdAt: now,
			updatedAt: now,
			submittedAt: old.submittedAt,
		});

		return newId;
	},
});

export const submit = mutation({
	args: { id: v.id("submissions") },
	handler: async (ctx, args) => {
		const user = await requireAuth(ctx);
		const submission = await ctx.db.get(args.id);
		if (!submission) throw new ConvexError("Submission not found");

		if (submission.status !== "draft") {
			throw new ConvexError("Only draft submissions can be submitted");
		}

		await requireTeamMember(ctx, submission.teamId, user.clerkId);

		const hackathon = await ctx.db.get(submission.hackathonId);
		if (!hackathon) throw new ConvexError("Hackathon not found");

		// Check cutoff
		if (
			hackathon.submissionCutoff &&
			Date.now() > hackathon.submissionCutoff
		) {
			throw new ConvexError("Submission deadline has passed");
		}

		const now = Date.now();
		if (hackathon.solutionModerationMode === "auto") {
			await ctx.db.patch(args.id, {
				status: "approved",
				submittedAt: now,
				approvedBy: user.clerkId,
				approvedAt: now,
				updatedAt: now,
			});
		} else {
			await ctx.db.patch(args.id, {
				status: "submitted",
				submittedAt: now,
				updatedAt: now,
			});
		}
	},
});

export const approve = mutation({
	args: { id: v.id("submissions") },
	handler: async (ctx, args) => {
		const user = await requireAuth(ctx);
		const submission = await ctx.db.get(args.id);
		if (!submission) throw new ConvexError("Submission not found");

		if (
			!(await isOrganizerOrCurator(
				ctx,
				submission.hackathonId,
				user.clerkId,
			))
		) {
			throw new ConvexError("Not authorized");
		}

		const now = Date.now();
		await ctx.db.patch(args.id, {
			status: "approved",
			approvedBy: user.clerkId,
			approvedAt: now,
			updatedAt: now,
		});
	},
});

export const reject = mutation({
	args: {
		id: v.id("submissions"),
		reason: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		const user = await requireAuth(ctx);
		const submission = await ctx.db.get(args.id);
		if (!submission) throw new ConvexError("Submission not found");

		if (
			!(await isOrganizerOrCurator(
				ctx,
				submission.hackathonId,
				user.clerkId,
			))
		) {
			throw new ConvexError("Not authorized");
		}

		await ctx.db.patch(args.id, {
			status: "rejected",
			updatedAt: Date.now(),
		});
	},
});
