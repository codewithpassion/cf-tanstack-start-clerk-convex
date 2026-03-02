import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireAuth, getCurrentUser } from "./auth";

export const create = mutation({
	args: {
		hackathonId: v.id("hackathons"),
		name: v.string(),
		description: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		const user = await requireAuth(ctx);

		// Check user isn't already in a team for this hackathon
		const existing = await ctx.db
			.query("teamMembers")
			.withIndex("by_hackathon_user", (q) =>
				q.eq("hackathonId", args.hackathonId).eq("userId", user.clerkId),
			)
			.unique();
		if (existing) {
			throw new ConvexError("You are already in a team for this hackathon");
		}

		const now = Date.now();
		const inviteCode = Math.random()
			.toString(36)
			.substring(2, 10)
			.toUpperCase();

		const teamId = await ctx.db.insert("teams", {
			hackathonId: args.hackathonId,
			name: args.name,
			description: args.description,
			leaderId: user.clerkId,
			isOpen: true,
			inviteCode,
			problemIds: [],
			createdAt: now,
			updatedAt: now,
		});

		await ctx.db.insert("teamMembers", {
			teamId,
			userId: user.clerkId,
			hackathonId: args.hackathonId,
			joinedAt: now,
		});

		return teamId;
	},
});

export const getById = query({
	args: { id: v.id("teams") },
	handler: async (ctx, args) => {
		const team = await ctx.db.get(args.id);
		if (!team) return null;

		const members = await ctx.db
			.query("teamMembers")
			.withIndex("by_team", (q) => q.eq("teamId", args.id))
			.collect();

		const memberUsers = await Promise.all(
			members.map(async (m) => {
				const u = await ctx.db
					.query("users")
					.withIndex("by_clerkId", (q) => q.eq("clerkId", m.userId))
					.unique();
				return {
					userId: m.userId,
					name: u?.name ?? "Unknown",
					email: u?.email ?? "",
					imageUrl: u?.imageUrl,
					isLeader: m.userId === team.leaderId,
				};
			}),
		);

		return { ...team, members: memberUsers };
	},
});

export const listByHackathon = query({
	args: { hackathonId: v.id("hackathons") },
	handler: async (ctx, args) => {
		const teams = await ctx.db
			.query("teams")
			.withIndex("by_hackathon", (q) =>
				q.eq("hackathonId", args.hackathonId),
			)
			.collect();

		const results = await Promise.all(
			teams.map(async (team) => {
				const members = await ctx.db
					.query("teamMembers")
					.withIndex("by_team", (q) => q.eq("teamId", team._id))
					.collect();
				return {
					...team,
					memberCount: members.length,
				};
			}),
		);

		return results;
	},
});

export const getMyTeam = query({
	args: { hackathonId: v.id("hackathons") },
	handler: async (ctx, args) => {
		const user = await getCurrentUser(ctx);
		if (!user) return null;

		const membership = await ctx.db
			.query("teamMembers")
			.withIndex("by_hackathon_user", (q) =>
				q.eq("hackathonId", args.hackathonId).eq("userId", user.clerkId),
			)
			.unique();

		if (!membership) return null;

		const team = await ctx.db.get(membership.teamId);
		return team;
	},
});

export const joinByInviteCode = mutation({
	args: {
		hackathonId: v.id("hackathons"),
		inviteCode: v.string(),
	},
	handler: async (ctx, args) => {
		const user = await requireAuth(ctx);

		// Check user isn't already in a team
		const existing = await ctx.db
			.query("teamMembers")
			.withIndex("by_hackathon_user", (q) =>
				q.eq("hackathonId", args.hackathonId).eq("userId", user.clerkId),
			)
			.unique();
		if (existing) {
			throw new ConvexError("You are already in a team for this hackathon");
		}

		// Find team by invite code
		const teams = await ctx.db
			.query("teams")
			.withIndex("by_invite_code", (q) =>
				q.eq("inviteCode", args.inviteCode),
			)
			.collect();

		const team = teams.find((t) => t.hackathonId === args.hackathonId);
		if (!team) {
			throw new ConvexError("Invalid invite code");
		}

		if (!team.isOpen) {
			throw new ConvexError("This team is not accepting new members");
		}

		await ctx.db.insert("teamMembers", {
			teamId: team._id,
			userId: user.clerkId,
			hackathonId: args.hackathonId,
			joinedAt: Date.now(),
		});

		return team._id;
	},
});

export const requestToJoin = mutation({
	args: {
		teamId: v.id("teams"),
		hackathonId: v.id("hackathons"),
		message: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		const user = await requireAuth(ctx);

		// Check user isn't already in a team
		const existing = await ctx.db
			.query("teamMembers")
			.withIndex("by_hackathon_user", (q) =>
				q.eq("hackathonId", args.hackathonId).eq("userId", user.clerkId),
			)
			.unique();
		if (existing) {
			throw new ConvexError("You are already in a team for this hackathon");
		}

		// Check no existing pending request
		const pendingRequests = await ctx.db
			.query("teamJoinRequests")
			.withIndex("by_team_status", (q) =>
				q.eq("teamId", args.teamId).eq("status", "pending"),
			)
			.collect();
		const existingRequest = pendingRequests.find(
			(r) => r.userId === user.clerkId,
		);
		if (existingRequest) {
			throw new ConvexError(
				"You already have a pending request for this team",
			);
		}

		await ctx.db.insert("teamJoinRequests", {
			teamId: args.teamId,
			userId: user.clerkId,
			hackathonId: args.hackathonId,
			status: "pending",
			message: args.message,
			createdAt: Date.now(),
		});
	},
});

export const listOpenTeams = query({
	args: { hackathonId: v.id("hackathons") },
	handler: async (ctx, args) => {
		const teams = await ctx.db
			.query("teams")
			.withIndex("by_hackathon", (q) =>
				q.eq("hackathonId", args.hackathonId),
			)
			.collect();

		const openTeams = teams.filter((t) => t.isOpen);

		const results = await Promise.all(
			openTeams.map(async (team) => {
				const members = await ctx.db
					.query("teamMembers")
					.withIndex("by_team", (q) => q.eq("teamId", team._id))
					.collect();

				const leader = await ctx.db
					.query("users")
					.withIndex("by_clerkId", (q) =>
						q.eq("clerkId", team.leaderId),
					)
					.unique();

				return {
					_id: team._id,
					name: team.name,
					description: team.description,
					memberCount: members.length,
					isOpen: team.isOpen,
					leaderName: leader?.name ?? "Unknown",
				};
			}),
		);

		return results;
	},
});

export const update = mutation({
	args: {
		id: v.id("teams"),
		name: v.optional(v.string()),
		description: v.optional(v.string()),
		isOpen: v.optional(v.boolean()),
	},
	handler: async (ctx, args) => {
		const user = await requireAuth(ctx);
		const team = await ctx.db.get(args.id);
		if (!team) throw new ConvexError("Team not found");
		if (team.leaderId !== user.clerkId) {
			throw new ConvexError("Only the team leader can update the team");
		}

		const { id, ...updates } = args;
		const patch: Record<string, unknown> = { updatedAt: Date.now() };
		for (const [key, value] of Object.entries(updates)) {
			if (value !== undefined) {
				patch[key] = value;
			}
		}

		await ctx.db.patch(id, patch);
	},
});

export const leave = mutation({
	args: { teamId: v.id("teams") },
	handler: async (ctx, args) => {
		const user = await requireAuth(ctx);
		const team = await ctx.db.get(args.teamId);
		if (!team) throw new ConvexError("Team not found");

		const membership = await ctx.db
			.query("teamMembers")
			.withIndex("by_team", (q) => q.eq("teamId", args.teamId))
			.collect();

		const myMembership = membership.find((m) => m.userId === user.clerkId);
		if (!myMembership) {
			throw new ConvexError("You are not a member of this team");
		}

		if (team.leaderId === user.clerkId) {
			if (membership.length > 1) {
				throw new ConvexError(
					"Transfer leadership before leaving the team",
				);
			}
			// Last member - disband
			await ctx.db.delete(myMembership._id);
			// Delete join requests
			const requests = await ctx.db
				.query("teamJoinRequests")
				.withIndex("by_team", (q) => q.eq("teamId", args.teamId))
				.collect();
			for (const req of requests) {
				await ctx.db.delete(req._id);
			}
			await ctx.db.delete(args.teamId);
			return;
		}

		await ctx.db.delete(myMembership._id);
	},
});

export const transferLeadership = mutation({
	args: {
		teamId: v.id("teams"),
		newLeaderId: v.string(),
	},
	handler: async (ctx, args) => {
		const user = await requireAuth(ctx);
		const team = await ctx.db.get(args.teamId);
		if (!team) throw new ConvexError("Team not found");
		if (team.leaderId !== user.clerkId) {
			throw new ConvexError("Only the team leader can transfer leadership");
		}

		// Verify new leader is a member
		const members = await ctx.db
			.query("teamMembers")
			.withIndex("by_team", (q) => q.eq("teamId", args.teamId))
			.collect();
		const isMember = members.some((m) => m.userId === args.newLeaderId);
		if (!isMember) {
			throw new ConvexError("New leader must be a team member");
		}

		await ctx.db.patch(args.teamId, {
			leaderId: args.newLeaderId,
			updatedAt: Date.now(),
		});
	},
});

export const kick = mutation({
	args: {
		teamId: v.id("teams"),
		userId: v.string(),
	},
	handler: async (ctx, args) => {
		const user = await requireAuth(ctx);
		const team = await ctx.db.get(args.teamId);
		if (!team) throw new ConvexError("Team not found");
		if (team.leaderId !== user.clerkId) {
			throw new ConvexError("Only the team leader can kick members");
		}
		if (args.userId === user.clerkId) {
			throw new ConvexError("You cannot kick yourself");
		}

		const members = await ctx.db
			.query("teamMembers")
			.withIndex("by_team", (q) => q.eq("teamId", args.teamId))
			.collect();
		const membership = members.find((m) => m.userId === args.userId);
		if (!membership) {
			throw new ConvexError("User is not a member of this team");
		}

		await ctx.db.delete(membership._id);
	},
});

export const regenerateInviteCode = mutation({
	args: { teamId: v.id("teams") },
	handler: async (ctx, args) => {
		const user = await requireAuth(ctx);
		const team = await ctx.db.get(args.teamId);
		if (!team) throw new ConvexError("Team not found");
		if (team.leaderId !== user.clerkId) {
			throw new ConvexError(
				"Only the team leader can regenerate the invite code",
			);
		}

		const inviteCode = Math.random()
			.toString(36)
			.substring(2, 10)
			.toUpperCase();
		await ctx.db.patch(args.teamId, { inviteCode, updatedAt: Date.now() });
	},
});

export const selectProblems = mutation({
	args: {
		teamId: v.id("teams"),
		problemIds: v.array(v.id("problems")),
	},
	handler: async (ctx, args) => {
		const user = await requireAuth(ctx);
		const team = await ctx.db.get(args.teamId);
		if (!team) throw new ConvexError("Team not found");
		if (team.leaderId !== user.clerkId) {
			throw new ConvexError("Only the team leader can select problems");
		}

		await ctx.db.patch(args.teamId, {
			problemIds: args.problemIds,
			updatedAt: Date.now(),
		});
	},
});

export const disbandTeam = mutation({
	args: { teamId: v.id("teams") },
	handler: async (ctx, args) => {
		const user = await requireAuth(ctx);
		const team = await ctx.db.get(args.teamId);
		if (!team) throw new ConvexError("Team not found");
		if (team.leaderId !== user.clerkId) {
			throw new ConvexError("Only the team leader can disband the team");
		}

		// Delete all team members
		const members = await ctx.db
			.query("teamMembers")
			.withIndex("by_team", (q) => q.eq("teamId", args.teamId))
			.collect();
		for (const member of members) {
			await ctx.db.delete(member._id);
		}

		// Delete all join requests
		const requests = await ctx.db
			.query("teamJoinRequests")
			.withIndex("by_team", (q) => q.eq("teamId", args.teamId))
			.collect();
		for (const req of requests) {
			await ctx.db.delete(req._id);
		}

		await ctx.db.delete(args.teamId);
	},
});
