/**
 * Shared authorization helpers for Convex mutations and queries.
 * Provides consistent authentication and workspace access verification.
 */
import { ConvexError } from "convex/values";
import type { MutationCtx, QueryCtx } from "../_generated/server";

/**
 * Authorize workspace access for the current user.
 * Verifies Clerk identity, looks up user by clerkId, and retrieves workspace.
 *
 * @param ctx - Convex query or mutation context
 * @returns Object containing user and workspace documents
 * @throws ConvexError if not authenticated, user not found, or workspace not found
 */
export async function authorizeWorkspaceAccess(ctx: QueryCtx | MutationCtx) {
	const identity = await ctx.auth.getUserIdentity();
	if (!identity) {
		throw new ConvexError("Not authenticated");
	}

	const user = await ctx.db
		.query("users")
		.withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
		.unique();

	if (!user) {
		throw new ConvexError("User not found");
	}

	const workspace = await ctx.db
		.query("workspaces")
		.withIndex("by_userId", (q) => q.eq("userId", user._id))
		.unique();

	if (!workspace) {
		throw new ConvexError("Workspace not found");
	}

	return { user, workspace };
}

/**
 * Get the current user without requiring a workspace.
 * Useful for queries that may run before workspace creation.
 *
 * @param ctx - Convex query or mutation context
 * @returns User document or null if not authenticated/not found
 */
export async function getCurrentUser(ctx: QueryCtx | MutationCtx) {
	const identity = await ctx.auth.getUserIdentity();
	if (!identity) {
		return null;
	}

	const user = await ctx.db
		.query("users")
		.withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
		.unique();

	return user;
}

/**
 * Get the current user's workspace without requiring it to exist.
 * Returns null if workspace doesn't exist yet.
 *
 * @param ctx - Convex query or mutation context
 * @returns Object with user and optional workspace, or null if not authenticated
 */
export async function getCurrentUserWithOptionalWorkspace(
	ctx: QueryCtx | MutationCtx,
) {
	const identity = await ctx.auth.getUserIdentity();
	if (!identity) {
		return null;
	}

	const user = await ctx.db
		.query("users")
		.withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
		.unique();

	if (!user) {
		return null;
	}

	const workspace = await ctx.db
		.query("workspaces")
		.withIndex("by_userId", (q) => q.eq("userId", user._id))
		.unique();

	return { user, workspace };
}
