import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireAuth, getCurrentUser } from "./auth";

export const listJoinRequests = query({
	args: {
		teamId: v.id("teams"),
		status: v.optional(
			v.union(
				v.literal("pending"),
				v.literal("approved"),
				v.literal("rejected"),
			),
		),
	},
	handler: async (ctx, args) => {
		const user = await requireAuth(ctx);
		const team = await ctx.db.get(args.teamId);
		if (!team) throw new ConvexError("Team not found");
		if (team.leaderId !== user.clerkId) {
			throw new ConvexError("Only the team leader can view join requests");
		}

		let requests;
		if (args.status) {
			requests = await ctx.db
				.query("teamJoinRequests")
				.withIndex("by_team_status", (q) =>
					q.eq("teamId", args.teamId).eq("status", args.status!),
				)
				.collect();
		} else {
			requests = await ctx.db
				.query("teamJoinRequests")
				.withIndex("by_team", (q) => q.eq("teamId", args.teamId))
				.collect();
		}

		const results = await Promise.all(
			requests.map(async (req) => {
				const u = await ctx.db
					.query("users")
					.withIndex("by_clerkId", (q) => q.eq("clerkId", req.userId))
					.unique();
				return {
					...req,
					userName: u?.name ?? "Unknown",
					userEmail: u?.email ?? "",
				};
			}),
		);

		return results;
	},
});

export const approveJoinRequest = mutation({
	args: { requestId: v.id("teamJoinRequests") },
	handler: async (ctx, args) => {
		const user = await requireAuth(ctx);
		const request = await ctx.db.get(args.requestId);
		if (!request) throw new ConvexError("Request not found");

		const team = await ctx.db.get(request.teamId);
		if (!team) throw new ConvexError("Team not found");
		if (team.leaderId !== user.clerkId) {
			throw new ConvexError(
				"Only the team leader can approve join requests",
			);
		}

		if (request.status !== "pending") {
			throw new ConvexError("This request has already been resolved");
		}

		// Check user isn't already in a team for this hackathon
		const existing = await ctx.db
			.query("teamMembers")
			.withIndex("by_hackathon_user", (q) =>
				q
					.eq("hackathonId", request.hackathonId)
					.eq("userId", request.userId),
			)
			.unique();
		if (existing) {
			throw new ConvexError(
				"User is already in a team for this hackathon",
			);
		}

		await ctx.db.patch(args.requestId, {
			status: "approved",
			resolvedAt: Date.now(),
			resolvedBy: user.clerkId,
		});

		await ctx.db.insert("teamMembers", {
			teamId: request.teamId,
			userId: request.userId,
			hackathonId: request.hackathonId,
			joinedAt: Date.now(),
		});
	},
});

export const rejectJoinRequest = mutation({
	args: { requestId: v.id("teamJoinRequests") },
	handler: async (ctx, args) => {
		const user = await requireAuth(ctx);
		const request = await ctx.db.get(args.requestId);
		if (!request) throw new ConvexError("Request not found");

		const team = await ctx.db.get(request.teamId);
		if (!team) throw new ConvexError("Team not found");
		if (team.leaderId !== user.clerkId) {
			throw new ConvexError(
				"Only the team leader can reject join requests",
			);
		}

		if (request.status !== "pending") {
			throw new ConvexError("This request has already been resolved");
		}

		await ctx.db.patch(args.requestId, {
			status: "rejected",
			resolvedAt: Date.now(),
			resolvedBy: user.clerkId,
		});
	},
});

export const getMyJoinRequests = query({
	args: { hackathonId: v.id("hackathons") },
	handler: async (ctx, args) => {
		const user = await getCurrentUser(ctx);
		if (!user) return [];

		const requests = await ctx.db
			.query("teamJoinRequests")
			.withIndex("by_user", (q) => q.eq("userId", user.clerkId))
			.collect();

		const filtered = requests.filter(
			(r) => r.hackathonId === args.hackathonId,
		);

		const results = await Promise.all(
			filtered.map(async (req) => {
				const team = await ctx.db.get(req.teamId);
				return {
					...req,
					teamName: team?.name ?? "Unknown Team",
				};
			}),
		);

		return results;
	},
});
