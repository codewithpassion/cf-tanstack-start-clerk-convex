import { ConvexError, v } from "convex/values";
import {
	internalMutation,
	internalQuery,
	mutation,
	query,
} from "./_generated/server";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";

/**
 * Helper to ensure workspace exists for a user.
 * Creates a new workspace if one doesn't exist.
 */
async function ensureWorkspaceExists(
	ctx: MutationCtx,
	userId: Id<"users">,
): Promise<Id<"workspaces">> {
	// Check if workspace already exists
	const existingWorkspace = await ctx.db
		.query("workspaces")
		.withIndex("by_userId", (q) => q.eq("userId", userId))
		.unique();

	if (existingWorkspace) {
		return existingWorkspace._id;
	}

	// Create new workspace with onboarding not completed
	const workspaceId = await ctx.db.insert("workspaces", {
		userId,
		onboardingCompleted: false,
		createdAt: Date.now(),
		updatedAt: Date.now(),
	});

	return workspaceId;
}

// Get current user (read-only, no creation)
export const getMe = query({
	args: {},
	handler: async (ctx: QueryCtx) => {
		const identity = await ctx.auth.getUserIdentity();
		if (!identity) {
			return null;
		}

		const user = await ctx.db
			.query("users")
			.withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
			.unique();

		return user;
	},
});

// Sync user from Clerk (called from client-side)
export const syncUser = mutation({
	args: {
		clerkId: v.string(),
		email: v.string(),
		name: v.optional(v.string()),
		imageUrl: v.optional(v.string()),
		roles: v.optional(v.array(v.string())),
	},
	handler: async (
		ctx: MutationCtx,
		{ clerkId, email, name, imageUrl, roles },
	) => {
		// Check if user already exists
		const existingUser = await ctx.db
			.query("users")
			.withIndex("by_clerkId", (q) => q.eq("clerkId", clerkId))
			.unique();

		if (existingUser) {
			// Update existing user
			await ctx.db.patch(existingUser._id, {
				email,
				name,
				imageUrl,
				roles: roles || ["user"],
				updatedAt: Date.now(),
			});

			// Ensure workspace exists for existing user
			const workspaceId = await ensureWorkspaceExists(ctx, existingUser._id);

			return { userId: existingUser._id, workspaceId };
		}

		// Create new user
		const userId = await ctx.db.insert("users", {
			clerkId,
			email,
			name,
			imageUrl,
			roles: roles || ["user"],
			createdAt: Date.now(),
			updatedAt: Date.now(),
		});

		// Create workspace for new user
		const workspaceId = await ensureWorkspaceExists(ctx, userId);

		return { userId, workspaceId };
	},
});

// Internal sync user from Clerk webhooks
export const syncUserInternal = internalMutation({
	args: {
		clerkId: v.string(),
		email: v.string(),
		name: v.optional(v.string()),
		imageUrl: v.optional(v.string()),
		roles: v.optional(v.array(v.string())),
	},
	handler: async (
		ctx: MutationCtx,
		{ clerkId, email, name, imageUrl, roles },
	) => {
		// Check if user already exists
		const existingUser = await ctx.db
			.query("users")
			.withIndex("by_clerkId", (q) => q.eq("clerkId", clerkId))
			.unique();

		if (existingUser) {
			// Update existing user
			await ctx.db.patch(existingUser._id, {
				email,
				name,
				imageUrl,
				roles: roles || existingUser.roles || ["user"],
				updatedAt: Date.now(),
			});

			// Ensure workspace exists for existing user
			const workspaceId = await ensureWorkspaceExists(ctx, existingUser._id);

			return { userId: existingUser._id, workspaceId };
		}

		// Create new user
		const userId = await ctx.db.insert("users", {
			clerkId,
			email,
			name,
			imageUrl,
			roles: roles || ["user"],
			createdAt: Date.now(),
			updatedAt: Date.now(),
		});

		// Create workspace for new user
		const workspaceId = await ensureWorkspaceExists(ctx, userId);

		return { userId, workspaceId };
	},
});

// Delete user (for cleanup when user is deleted from Clerk)
export const deleteUser = internalMutation({
	args: {
		clerkId: v.string(),
	},
	handler: async (ctx: MutationCtx, { clerkId }) => {
		const user = await ctx.db
			.query("users")
			.withIndex("by_clerkId", (q) => q.eq("clerkId", clerkId))
			.unique();

		if (!user) {
			throw new ConvexError("User not found");
		}

		// Delete the user's workspace if it exists
		const workspace = await ctx.db
			.query("workspaces")
			.withIndex("by_userId", (q) => q.eq("userId", user._id))
			.unique();

		if (workspace) {
			await ctx.db.delete(workspace._id);
		}

		// Delete the user
		await ctx.db.delete(user._id);

		return { success: true };
	},
});

// Get user stats (for dashboard)
export const getStats = query({
	args: {},
	handler: async (ctx: QueryCtx) => {
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

		return {
			totalUsers: 1,
		};
	},
});

// Get admin stats (system-wide statistics for admin dashboard)
export const getAdminStats = query({
	args: {},
	handler: async (ctx: QueryCtx) => {
		const identity = await ctx.auth.getUserIdentity();
		if (!identity) {
			return null;
		}

		// Check if user is admin
		const user = await ctx.db
			.query("users")
			.withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
			.unique();

		if (!user || !user.roles?.includes("admin")) {
			throw new ConvexError("Unauthorized: Admin access required");
		}

		// Get all users
		const allUsers = await ctx.db.query("users").collect();
		const adminUsers = allUsers.filter(
			(u) => u.roles?.includes("admin") || u.roles?.includes("superadmin"),
		);
		const superAdminUsers = allUsers.filter((u) =>
			u.roles?.includes("superadmin"),
		);

		return {
			users: {
				total: allUsers.length,
				admins: adminUsers.length,
				superAdmins: superAdminUsers.length,
			},
		};
	},
});

// List users with pagination, search, and filtering
export const listUsers = query({
	args: {
		search: v.optional(v.string()),
		role: v.optional(v.string()),
		limit: v.optional(v.number()),
		offset: v.optional(v.number()),
	},
	handler: async (ctx: QueryCtx, args) => {
		const identity = await ctx.auth.getUserIdentity();
		if (!identity) {
			throw new ConvexError("Not authenticated");
		}

		// Check if user has admin access
		const currentUser = await ctx.db
			.query("users")
			.withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
			.unique();

		if (!currentUser || !currentUser.roles?.includes("admin")) {
			throw new ConvexError("Unauthorized: Admin access required");
		}

		const limit = args.limit || 20;
		const offset = args.offset || 0;

		// Get all users
		let users = await ctx.db.query("users").collect();

		// Filter by role if specified
		if (args.role) {
			users = users.filter((u) => u.roles?.includes(args.role as string));
		}

		// Search by name or email
		if (args.search) {
			const searchLower = args.search.toLowerCase();
			users = users.filter(
				(u) =>
					u.name?.toLowerCase().includes(searchLower) ||
					u.email?.toLowerCase().includes(searchLower),
			);
		}

		// Sort by creation date (newest first)
		users.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

		// Apply pagination
		const totalCount = users.length;
		const paginatedUsers = users.slice(offset, offset + limit);
		const hasMore = offset + limit < totalCount;

		// Format users for response
		const formattedUsers = paginatedUsers.map((u) => ({
			id: u.clerkId, // Use clerkId as the user ID for consistency
			name: u.name || "Unknown",
			email: u.email || "",
			image: u.imageUrl,
			roles: u.roles?.[0] || "user", // Return primary role for compatibility
			emailVerified: true, // Clerk handles email verification
			createdAt: new Date(u.createdAt || 0).toISOString(),
		}));

		return {
			users: formattedUsers,
			totalCount,
			hasMore,
		};
	},
});

// Get user statistics for admin dashboard
export const getUserStats = query({
	args: {},
	handler: async (ctx: QueryCtx) => {
		const identity = await ctx.auth.getUserIdentity();
		if (!identity) {
			return null;
		}

		// Check if user has admin access
		const currentUser = await ctx.db
			.query("users")
			.withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
			.unique();

		if (!currentUser || !currentUser.roles?.includes("admin")) {
			return null;
		}

		const allUsers = await ctx.db.query("users").collect();

		const verifiedUsers = allUsers.length; // All Clerk users are verified
		const adminUsers = allUsers.filter(
			(u) => u.roles?.includes("admin") && !u.roles?.includes("superadmin"),
		);
		const superAdminUsers = allUsers.filter((u) =>
			u.roles?.includes("superadmin"),
		);

		return {
			totalUsers: allUsers.length,
			verifiedUsers,
			totalAdmins: adminUsers.length,
			totalSuperAdmins: superAdminUsers.length,
		};
	},
});

// Get user by ID
export const getUserById = query({
	args: {
		userId: v.string(),
	},
	handler: async (ctx: QueryCtx, { userId }) => {
		const identity = await ctx.auth.getUserIdentity();
		if (!identity) {
			return null;
		}

		// Check if user has admin access
		const currentUser = await ctx.db
			.query("users")
			.withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
			.unique();

		if (!currentUser || !currentUser.roles?.includes("admin")) {
			throw new ConvexError("Unauthorized: Admin access required");
		}

		// Get user by clerkId
		const user = await ctx.db
			.query("users")
			.withIndex("by_clerkId", (q) => q.eq("clerkId", userId))
			.unique();

		if (!user) {
			return null;
		}

		return {
			id: user.clerkId,
			name: user.name || "Unknown",
			email: user.email || "",
			image: user.imageUrl,
			roles: user.roles || ["user"],
			createdAt: new Date(user.createdAt || 0).toISOString(),
		};
	},
});

/**
 * Internal query to get user by Convex ID.
 *
 * This is used internally by Stripe actions to retrieve user information.
 *
 * @param userId - The user's Convex ID
 * @returns User object with email and name, or null if not found
 *
 * @internal This is an internal query not meant to be called directly
 */
export const getById = internalQuery({
	args: {
		userId: v.id("users"),
	},
	handler: async (
		ctx: QueryCtx,
		{ userId },
	): Promise<{ email: string; name?: string } | null> => {
		const user = await ctx.db.get(userId);
		if (!user) {
			return null;
		}

		return {
			email: user.email,
			name: user.name,
		};
	},
});
