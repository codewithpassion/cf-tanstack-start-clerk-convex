import { ConvexError } from "convex/values";
import type { MutationCtx, QueryCtx } from "./_generated/server";

/**
 * Get the current user from the Clerk JWT token.
 * The identity is automatically injected by ConvexProviderWithAuth.
 */
export async function getCurrentUser(ctx: QueryCtx | MutationCtx) {
	const identity = await ctx.auth.getUserIdentity();
	if (!identity) {
		return null;
	}

	// The subject field contains the Clerk user ID
	const clerkId = identity.subject;

	// Get user from database using Clerk ID
	const user = await ctx.db
		.query("users")
		.withIndex("by_clerkId", (q) => q.eq("clerkId", clerkId))
		.unique();

	// If user doesn't exist in our database yet, they need to be synced
	// This can happen on first login before the webhook fires
	if (!user) {
		console.log("User not found in database, needs sync:", clerkId);
		return null;
	}

	return user;
}

/**
 * Require authentication for a function.
 * Throws an error if the user is not authenticated.
 */
export async function requireAuth(ctx: QueryCtx | MutationCtx) {
	const user = await getCurrentUser(ctx);
	if (!user) {
		throw new ConvexError("Not authenticated or user not synced");
	}
	return user;
}

/**
 * Get the Clerk user ID from the JWT token.
 * Returns null if not authenticated.
 */
export async function getClerkUserId(
	ctx: QueryCtx | MutationCtx,
): Promise<string | null> {
	const identity = await ctx.auth.getUserIdentity();
	return identity?.subject ?? null;
}
