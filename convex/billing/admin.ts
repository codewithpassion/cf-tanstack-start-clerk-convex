import { ConvexError, v } from "convex/values";
import { mutation, query } from "../_generated/server";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { api } from "../_generated/api";

/**
 * Get system-wide token statistics (admin only).
 *
 * Provides comprehensive analytics on token usage, revenue, and account status
 * across all users in the system. Requires admin permissions (tokens.view_all).
 *
 * Calculates:
 * - Total billable tokens used (sum of all billableTokens from usage records)
 * - Total actual tokens used (sum of all totalTokens from usage records)
 * - Total revenue in cents (sum of all purchase transaction amounts)
 * - Active accounts count (status === "active")
 * - Total balance across all accounts
 * - Average balance per account
 * - Profit margin percentage ((billable - actual) / billable * 100)
 *
 * @returns Statistics object with all calculated metrics
 *
 * @throws {ConvexError} If user is not authenticated
 * @throws {ConvexError} If user lacks sufficient permissions
 *
 * @example
 * ```ts
 * const stats = await ctx.runQuery(api.billing.admin.getTokenStats);
 * console.log(`Total revenue: $${stats.totalRevenueCents / 100}`);
 * console.log(`Active accounts: ${stats.activeAccounts}`);
 * console.log(`Profit margin: ${stats.profitMargin.toFixed(2)}%`);
 * ```
 */
export const getTokenStats = query({
	args: {},
	handler: async (ctx: QueryCtx) => {
		// Verify authentication
		const identity = await ctx.auth.getUserIdentity();
		if (!identity) {
			throw new ConvexError("Not authenticated");
		}

		// Get the admin user
		const admin = await ctx.db
			.query("users")
			.withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
			.unique();

		if (!admin) {
			throw new ConvexError("User not found");
		}

		// Verify admin permissions
		const roles = admin.roles || [];
		const isAdmin = roles.includes("admin") || roles.includes("superadmin");

		if (!isAdmin) {
			throw new ConvexError("Insufficient permissions");
		}

		// Collect all token accounts
		const tokenAccounts = await ctx.db.query("tokenAccounts").collect();

		// Collect all token usage records
		const tokenUsage = await ctx.db.query("tokenUsage").collect();

		// Collect purchase transactions for revenue calculation
		const purchaseTransactions = await ctx.db
			.query("tokenTransactions")
			.withIndex("by_transactionType", (q) => q.eq("transactionType", "purchase"))
			.collect();

		// Calculate statistics
		const totalBillableTokensUsed = tokenUsage.reduce(
			(sum, usage) => sum + usage.billableTokens,
			0,
		);

		const totalActualTokensUsed = tokenUsage.reduce(
			(sum, usage) => sum + (usage.totalTokens || 0),
			0,
		);

		const totalRevenueCents = purchaseTransactions.reduce(
			(sum, transaction) => sum + (transaction.amountCents || 0),
			0,
		);

		const activeAccounts = tokenAccounts.filter(
			(account) => account.status === "active",
		).length;

		const totalBalance = tokenAccounts.reduce(
			(sum, account) => sum + account.balance,
			0,
		);

		const averageBalance =
			tokenAccounts.length > 0 ? totalBalance / tokenAccounts.length : 0;

		const profitMargin =
			totalBillableTokensUsed > 0
				? ((totalBillableTokensUsed - totalActualTokensUsed) /
						totalBillableTokensUsed) *
					100
				: 0;

		return {
			totalBillableTokensUsed,
			totalActualTokensUsed,
			totalRevenueCents,
			activeAccounts,
			totalAccounts: tokenAccounts.length,
			totalBalance,
			averageBalance,
			profitMargin,
		};
	},
});

/**
 * Get usage statistics grouped by AI model (admin only).
 *
 * Aggregates token usage across all users by AI model, showing which models
 * are most frequently used and consuming the most tokens. Requires admin
 * permissions (tokens.view_all).
 *
 * @returns Array of model statistics, sorted by billable tokens descending
 *
 * @throws {ConvexError} If user is not authenticated
 * @throws {ConvexError} If user lacks sufficient permissions
 *
 * @example
 * ```ts
 * const modelStats = await ctx.runQuery(api.billing.admin.getModelUsageStats);
 * modelStats.forEach(stat => {
 *   console.log(`${stat.model}: ${stat.operationCount} ops, ${stat.billableTokens} tokens`);
 * });
 * ```
 */
export const getModelUsageStats = query({
	args: {},
	handler: async (ctx: QueryCtx) => {
		// Verify authentication
		const identity = await ctx.auth.getUserIdentity();
		if (!identity) {
			throw new ConvexError("Not authenticated");
		}

		// Get the admin user
		const admin = await ctx.db
			.query("users")
			.withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
			.unique();

		if (!admin) {
			throw new ConvexError("User not found");
		}

		// Verify admin permissions
		const roles = admin.roles || [];
		const isAdmin = roles.includes("admin") || roles.includes("superadmin");

		if (!isAdmin) {
			throw new ConvexError("Insufficient permissions");
		}

		// Collect all token usage records
		const tokenUsage = await ctx.db.query("tokenUsage").collect();

		// Group by model
		const modelStats = new Map<
			string,
			{
				model: string;
				operationCount: number;
				billableTokens: number;
				actualTokens: number;
			}
		>();

		for (const usage of tokenUsage) {
			const existing = modelStats.get(usage.model) || {
				model: usage.model,
				operationCount: 0,
				billableTokens: 0,
				actualTokens: 0,
			};

			existing.operationCount++;
			existing.billableTokens += usage.billableTokens;
			existing.actualTokens += usage.totalTokens || 0;

			modelStats.set(usage.model, existing);
		}

		// Convert to array and sort by billable tokens descending
		const statsArray = Array.from(modelStats.values());
		statsArray.sort((a, b) => b.billableTokens - a.billableTokens);

		return statsArray;
	},
});

/**
 * Get usage statistics grouped by operation type (admin only).
 *
 * Aggregates token usage across all users by operation type, showing which
 * types of operations (content generation, chat, images, etc.) are most
 * frequently used. Requires admin permissions (tokens.view_all).
 *
 * @returns Array of operation type statistics, sorted by operation count descending
 *
 * @throws {ConvexError} If user is not authenticated
 * @throws {ConvexError} If user lacks sufficient permissions
 *
 * @example
 * ```ts
 * const opStats = await ctx.runQuery(api.billing.admin.getOperationStats);
 * opStats.forEach(stat => {
 *   console.log(`${stat.operationType}: ${stat.operationCount} operations`);
 * });
 * ```
 */
export const getOperationStats = query({
	args: {},
	handler: async (ctx: QueryCtx) => {
		// Verify authentication
		const identity = await ctx.auth.getUserIdentity();
		if (!identity) {
			throw new ConvexError("Not authenticated");
		}

		// Get the admin user
		const admin = await ctx.db
			.query("users")
			.withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
			.unique();

		if (!admin) {
			throw new ConvexError("User not found");
		}

		// Verify admin permissions
		const roles = admin.roles || [];
		const isAdmin = roles.includes("admin") || roles.includes("superadmin");

		if (!isAdmin) {
			throw new ConvexError("Insufficient permissions");
		}

		// Collect all token usage records
		const tokenUsage = await ctx.db.query("tokenUsage").collect();

		// Group by operation type
		const operationStats = new Map<
			string,
			{
				operationType: string;
				operationCount: number;
				billableTokens: number;
			}
		>();

		for (const usage of tokenUsage) {
			const existing = operationStats.get(usage.operationType) || {
				operationType: usage.operationType,
				operationCount: 0,
				billableTokens: 0,
			};

			existing.operationCount++;
			existing.billableTokens += usage.billableTokens;

			operationStats.set(usage.operationType, existing);
		}

		// Convert to array and sort by operation count descending
		const statsArray = Array.from(operationStats.values());
		statsArray.sort((a, b) => b.operationCount - a.operationCount);

		return statsArray;
	},
});

/**
 * Get user token accounts with enriched user details (admin only).
 *
 * Returns a list of token accounts joined with user information, optionally
 * filtered by account status. Useful for admin dashboards to view and manage
 * user accounts. Requires admin permissions (tokens.view_all).
 *
 * @param limit - Maximum number of accounts to return (default: 100)
 * @param status - Optional status filter ("active", "suspended", "blocked")
 * @returns Array of enriched account data with user details
 *
 * @throws {ConvexError} If user is not authenticated
 * @throws {ConvexError} If user lacks sufficient permissions
 *
 * @example
 * ```ts
 * // Get all active accounts
 * const accounts = await ctx.runQuery(api.billing.admin.getUserAccounts, {
 *   status: "active",
 *   limit: 50
 * });
 *
 * // Get all accounts regardless of status
 * const allAccounts = await ctx.runQuery(api.billing.admin.getUserAccounts);
 * ```
 */
export const getUserAccounts = query({
	args: {
		limit: v.optional(v.number()),
		status: v.optional(
			v.union(
				v.literal("active"),
				v.literal("suspended"),
				v.literal("blocked"),
			),
		),
	},
	handler: async (ctx: QueryCtx, { limit = 100, status }) => {
		// Verify authentication
		const identity = await ctx.auth.getUserIdentity();
		if (!identity) {
			throw new ConvexError("Not authenticated");
		}

		// Get the admin user
		const admin = await ctx.db
			.query("users")
			.withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
			.unique();

		if (!admin) {
			throw new ConvexError("User not found");
		}

		// Verify admin permissions
		const roles = admin.roles || [];
		const isAdmin = roles.includes("admin") || roles.includes("superadmin");

		if (!isAdmin) {
			throw new ConvexError("Insufficient permissions");
		}

		// Query token accounts with optional status filter
		let accountsQuery = status
			? ctx.db
					.query("tokenAccounts")
					.withIndex("by_status", (q) => q.eq("status", status))
			: ctx.db.query("tokenAccounts");

		const accounts = await accountsQuery.take(limit);

		// Enrich with user details
		const enrichedAccounts = await Promise.all(
			accounts.map(async (account) => {
				const user = await ctx.db.get(account.userId);
				return {
					...account,
					user: user
						? {
								_id: user._id,
								email: user.email,
								name: user.name,
								imageUrl: user.imageUrl,
								roles: user.roles,
							}
						: null,
				};
			}),
		);

		return enrichedAccounts;
	},
});

/**
 * Grant tokens to a user (admin only).
 *
 * Allows administrators to manually add tokens to a user's account.
 * Requires admin permissions (tokens.grant). Creates a transaction record
 * with type "admin_grant" and updates the user's balance.
 *
 * @param targetUserId - The user ID to grant tokens to
 * @param tokenAmount - The number of tokens to grant
 * @param reason - Reason for granting tokens (for audit trail)
 * @returns Success status with new balance
 *
 * @throws {ConvexError} If user is not authenticated
 * @throws {ConvexError} If user lacks sufficient permissions
 * @throws {ConvexError} If target user or account is not found
 *
 * @example
 * ```ts
 * const result = await ctx.runMutation(api.billing.admin.grantTokens, {
 *   targetUserId: userId,
 *   tokenAmount: 50000,
 *   reason: "Compensation for service outage"
 * });
 * console.log(`New balance: ${result.newBalance} tokens`);
 * ```
 */
export const grantTokens = mutation({
	args: {
		targetUserId: v.id("users"),
		tokenAmount: v.number(),
		reason: v.string(),
	},
	handler: async (
		ctx: MutationCtx,
		{ targetUserId, tokenAmount, reason },
	): Promise<{ success: boolean; newBalance: number }> => {
		// Verify authentication
		const identity = await ctx.auth.getUserIdentity();
		if (!identity) {
			throw new ConvexError("Not authenticated");
		}

		// Get the admin user
		const admin = await ctx.db
			.query("users")
			.withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
			.unique();

		if (!admin) {
			throw new ConvexError("Admin user not found");
		}

		// Verify admin permissions (tokens.grant)
		const roles = admin.roles || [];
		const hasPermission = roles.includes("superadmin"); // Only superadmins can grant tokens

		if (!hasPermission) {
			throw new ConvexError("Insufficient permissions: tokens.grant required");
		}

		// Get the target user account
		const targetAccount = await ctx.db
			.query("tokenAccounts")
			.withIndex("by_userId", (q) => q.eq("userId", targetUserId))
			.unique();

		if (!targetAccount) {
			throw new ConvexError("Target user account not found");
		}

		// Add tokens using the addTokens mutation
		const newBalance = await ctx.runMutation(api.billing.accounts.addTokens, {
			userId: targetUserId,
			workspaceId: targetAccount.workspaceId,
			tokenAmount,
			transactionType: "admin_grant",
			description: reason,
			adminUserId: admin._id,
		});

		return {
			success: true,
			newBalance,
		};
	},
});

