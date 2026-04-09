import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import type { QueryCtx, MutationCtx } from "./_generated/server";
import { requireAuth } from "./auth";

const roleValidator = v.union(
	v.literal("organiser"),
	v.literal("curator"),
	v.literal("judge"),
	v.literal("participant"),
);

/** Check if user is an organiser or owner of a hackathon. */
async function requireOrganiser(
	ctx: QueryCtx | MutationCtx,
	hackathonId: Id<"hackathons">,
) {
	const user = await requireAuth(ctx);
	const hackathon = await ctx.db.get(hackathonId);
	if (!hackathon) throw new ConvexError("Hackathon not found");

	if (hackathon.ownerId === user.clerkId) return { user, hackathon };

	const role = await ctx.db
		.query("hackathonRoles")
		.withIndex("by_hackathon_user", (q) =>
			q.eq("hackathonId", hackathonId).eq("userId", user.clerkId),
		)
		.unique();

	if (role?.role !== "organiser") {
		throw new ConvexError("Only organisers can perform this action");
	}

	return { user, hackathon };
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

/** List all role assignments for a hackathon, joined with user info. */
export const listByHackathon = query({
	args: { hackathonId: v.id("hackathons") },
	handler: async (ctx, args) => {
		const { hackathon } = await requireOrganiser(ctx, args.hackathonId);

		const roles = await ctx.db
			.query("hackathonRoles")
			.withIndex("by_hackathon", (q) => q.eq("hackathonId", args.hackathonId))
			.collect();

		// Join with user info
		const rolesWithUsers = await Promise.all(
			roles.map(async (r) => {
				const user = await ctx.db
					.query("users")
					.withIndex("by_clerkId", (q) => q.eq("clerkId", r.userId))
					.unique();
				return {
					...r,
					userName: user?.name ?? null,
					userEmail: user?.email ?? null,
					userImageUrl: user?.imageUrl ?? null,
					isOwner: hackathon.ownerId === r.userId,
				};
			}),
		);

		return rolesWithUsers;
	},
});

/** Get current user's effective role in a hackathon. */
export const getMyRole = query({
	args: { hackathonId: v.id("hackathons") },
	handler: async (ctx, args) => {
		const user = await requireAuth(ctx);
		const hackathon = await ctx.db.get(args.hackathonId);
		if (!hackathon) return null;

		if (hackathon.ownerId === user.clerkId) return "owner";

		const role = await ctx.db
			.query("hackathonRoles")
			.withIndex("by_hackathon_user", (q) =>
				q.eq("hackathonId", args.hackathonId).eq("userId", user.clerkId),
			)
			.unique();

		return role?.role ?? null;
	},
});

/** List pending invitations for a hackathon. Requires organiser. */
export const listInvitations = query({
	args: { hackathonId: v.id("hackathons") },
	handler: async (ctx, args) => {
		await requireOrganiser(ctx, args.hackathonId);

		const invitations = await ctx.db
			.query("roleInvitations")
			.withIndex("by_hackathon", (q) => q.eq("hackathonId", args.hackathonId))
			.collect();

		return invitations.filter((inv) => inv.status === "pending");
	},
});

/** Get invitation details by token (public, for the acceptance page). */
export const getInvitationByToken = query({
	args: { token: v.string() },
	handler: async (ctx, args) => {
		const invitation = await ctx.db
			.query("roleInvitations")
			.withIndex("by_token", (q) => q.eq("token", args.token))
			.unique();

		if (!invitation) return null;

		const hackathon = await ctx.db.get(invitation.hackathonId);

		// Look up who invited
		const inviter = await ctx.db
			.query("users")
			.withIndex("by_clerkId", (q) => q.eq("clerkId", invitation.invitedBy))
			.unique();

		return {
			...invitation,
			hackathonName: hackathon?.name ?? "Unknown hackathon",
			hackathonSlug: hackathon?.slug ?? null,
			inviterName: inviter?.name ?? null,
		};
	},
});

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

/** Assign (upsert) a role to a user. Requires organiser. */
export const assignRole = mutation({
	args: {
		hackathonId: v.id("hackathons"),
		userId: v.string(),
		role: roleValidator,
	},
	handler: async (ctx, args) => {
		const { user, hackathon } = await requireOrganiser(
			ctx,
			args.hackathonId,
		);

		// Can't change owner via role assignment
		if (hackathon.ownerId === args.userId) {
			throw new ConvexError("Cannot change the owner's role via assignment");
		}

		// Remove existing role if present
		const existing = await ctx.db
			.query("hackathonRoles")
			.withIndex("by_hackathon_user", (q) =>
				q.eq("hackathonId", args.hackathonId).eq("userId", args.userId),
			)
			.unique();

		if (existing) {
			await ctx.db.delete(existing._id);
		}

		await ctx.db.insert("hackathonRoles", {
			hackathonId: args.hackathonId,
			userId: args.userId,
			role: args.role,
			assignedBy: user.clerkId,
			createdAt: Date.now(),
		});
	},
});

/** Remove a role assignment. Requires organiser. */
export const removeRole = mutation({
	args: {
		hackathonId: v.id("hackathons"),
		userId: v.string(),
	},
	handler: async (ctx, args) => {
		const { hackathon } = await requireOrganiser(ctx, args.hackathonId);

		if (hackathon.ownerId === args.userId) {
			throw new ConvexError("Cannot remove the owner's role");
		}

		const existing = await ctx.db
			.query("hackathonRoles")
			.withIndex("by_hackathon_user", (q) =>
				q.eq("hackathonId", args.hackathonId).eq("userId", args.userId),
			)
			.unique();

		if (existing) {
			await ctx.db.delete(existing._id);
		}
	},
});

/** Create an email invitation. Requires organiser. */
export const createInvitation = mutation({
	args: {
		hackathonId: v.id("hackathons"),
		email: v.string(),
		role: roleValidator,
	},
	handler: async (ctx, args) => {
		const { user } = await requireOrganiser(ctx, args.hackathonId);

		const token =
			Math.random().toString(36).substring(2) +
			Math.random().toString(36).substring(2);

		const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;

		await ctx.db.insert("roleInvitations", {
			hackathonId: args.hackathonId,
			email: args.email,
			role: args.role,
			token,
			invitedBy: user.clerkId,
			status: "pending",
			expiresAt: Date.now() + SEVEN_DAYS,
			createdAt: Date.now(),
		});

		return { token };
	},
});

/** Revoke a pending invitation. Requires organiser. */
export const revokeInvitation = mutation({
	args: { invitationId: v.id("roleInvitations") },
	handler: async (ctx, args) => {
		const invitation = await ctx.db.get(args.invitationId);
		if (!invitation) throw new ConvexError("Invitation not found");

		await requireOrganiser(ctx, invitation.hackathonId);

		await ctx.db.patch(args.invitationId, { status: "revoked" });
	},
});

/** Accept an invitation by token. Requires auth. */
export const acceptInvitation = mutation({
	args: { token: v.string() },
	handler: async (ctx, args) => {
		const user = await requireAuth(ctx);

		const invitation = await ctx.db
			.query("roleInvitations")
			.withIndex("by_token", (q) => q.eq("token", args.token))
			.unique();

		if (!invitation) throw new ConvexError("Invitation not found");

		if (invitation.status !== "pending") {
			throw new ConvexError(`Invitation is ${invitation.status}`);
		}

		if (invitation.expiresAt < Date.now()) {
			await ctx.db.patch(invitation._id, { status: "expired" });
			throw new ConvexError("Invitation has expired");
		}

		// Remove any existing role for this user in this hackathon
		const existing = await ctx.db
			.query("hackathonRoles")
			.withIndex("by_hackathon_user", (q) =>
				q
					.eq("hackathonId", invitation.hackathonId)
					.eq("userId", user.clerkId),
			)
			.unique();
		if (existing) {
			await ctx.db.delete(existing._id);
		}

		// Create the role assignment
		await ctx.db.insert("hackathonRoles", {
			hackathonId: invitation.hackathonId,
			userId: user.clerkId,
			role: invitation.role,
			assignedBy: invitation.invitedBy,
			createdAt: Date.now(),
		});

		// Mark invitation as accepted
		await ctx.db.patch(invitation._id, { status: "accepted" });

		return { hackathonId: invitation.hackathonId };
	},
});

/** Transfer hackathon ownership. Current owner only. */
export const transferOwnership = mutation({
	args: {
		hackathonId: v.id("hackathons"),
		newOwnerId: v.string(),
	},
	handler: async (ctx, args) => {
		const user = await requireAuth(ctx);
		const hackathon = await ctx.db.get(args.hackathonId);
		if (!hackathon) throw new ConvexError("Hackathon not found");

		if (hackathon.ownerId !== user.clerkId) {
			throw new ConvexError("Only the current owner can transfer ownership");
		}

		await ctx.db.patch(args.hackathonId, {
			ownerId: args.newOwnerId,
			updatedAt: Date.now(),
		});
	},
});
