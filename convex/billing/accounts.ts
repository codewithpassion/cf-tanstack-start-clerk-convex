import { ConvexError, v } from "convex/values";
import {
	internalMutation,
	mutation,
	query,
	type MutationCtx,
	type QueryCtx,
} from "../_generated/server";
import type { Id } from "../_generated/dataModel";
// import { api } from "../_generated/api";

/**
 * Initialize a token account for a new user with welcome bonus.
 *
 * This is idempotent - if an account already exists, it returns the existing account ID.
 * Creates the account with the system's configured welcome bonus and records the transaction.
 * Marks the user as having received their onboarding tokens.
 *
 * @param userId - The user's ID
 * @param workspaceId - The user's workspace ID
 * @returns The token account ID (new or existing)
 *
 * @example
 * ```ts
 * const accountId = await ctx.runMutation(api.billing.accounts.initializeAccount, {
 *   userId,
 *   workspaceId
 * });
 * ```
 */
export const initializeAccount = mutation({
	args: {
		userId: v.id("users"),
		workspaceId: v.id("workspaces"),
	},
	handler: async (
		ctx: MutationCtx,
		{ userId, workspaceId },
	): Promise<Id<"tokenAccounts">> => {
		// Check if account already exists
		const existingAccount = await ctx.db
			.query("tokenAccounts")
			.withIndex("by_userId", (q) => q.eq("userId", userId))
			.unique();

		if (existingAccount) {
			return existingAccount._id;
		}

		// Get system settings for welcome bonus
		const settings = await ctx.db
			.query("systemSettings")
			.withIndex("by_key", (q) => q.eq("key", "global_settings"))
			.unique();

		const welcomeBonus = settings?.newUserBonusTokens || 10000;

		// Create token account with welcome bonus
		const now = Date.now();
		const accountId = await ctx.db.insert("tokenAccounts", {
			userId,
			workspaceId,
			balance: welcomeBonus,
			lifetimeTokensPurchased: 0,
			lifetimeTokensUsed: 0,
			lifetimeActualTokensUsed: 0,
			lifetimeSpentCents: 0,
			autoRechargeEnabled: false,
			stripeCustomerId: undefined,
			defaultPaymentMethodId: undefined,
			currency: "usd",
			status: "active",
			createdAt: now,
			updatedAt: now,
		});

		// Record the welcome bonus transaction
		await ctx.db.insert("tokenTransactions", {
			userId,
			workspaceId,
			transactionType: "bonus",
			tokenAmount: welcomeBonus,
			balanceBefore: 0,
			balanceAfter: welcomeBonus,
			description: "Welcome bonus for new user",
			createdAt: now,
		});

		// Mark user as having received onboarding tokens
		const user = await ctx.db.get(userId);
		if (user) {
			await ctx.db.patch(userId, {
				onboardingTokensGranted: true,
				updatedAt: now,
			});
		}

		return accountId;
	},
});

/**
 * Get a user's token account details.
 *
 * @param userId - The user's ID
 * @returns Token account object or null if not found
 *
 * @example
 * ```ts
 * const account = await ctx.runQuery(api.billing.accounts.getAccount, { userId });
 * if (account) {
 *   console.log(`Balance: ${account.balance} tokens`);
 * }
 * ```
 */
export const getAccount = query({
	args: {
		userId: v.id("users"),
	},
	handler: async (ctx: QueryCtx, { userId }) => {
		const account = await ctx.db
			.query("tokenAccounts")
			.withIndex("by_userId", (q) => q.eq("userId", userId))
			.unique();

		return account;
	},
});

/**
 * Check if a user has sufficient balance for an operation.
 *
 * Performs pre-flight validation before AI operations to ensure the user
 * has enough tokens and their account is in good standing.
 *
 * @param userId - The user's ID
 * @param requiredTokens - The number of tokens required for the operation
 * @returns Object with balance check results
 *
 * @example
 * ```ts
 * const check = await ctx.runQuery(api.billing.accounts.checkBalance, {
 *   userId,
 *   requiredTokens: 5000
 * });
 * if (!check.sufficient) {
 *   throw new Error("Insufficient token balance");
 * }
 * ```
 */
export const checkBalance = query({
	args: {
		userId: v.id("users"),
		requiredTokens: v.number(),
	},
	handler: async (
		ctx: QueryCtx,
		{ userId, requiredTokens },
	): Promise<{
		sufficient: boolean;
		balance: number;
		required: number;
		accountStatus?: string;
	}> => {
		const account = await ctx.db
			.query("tokenAccounts")
			.withIndex("by_userId", (q) => q.eq("userId", userId))
			.unique();

		if (!account) {
			return {
				sufficient: false,
				balance: 0,
				required: requiredTokens,
				accountStatus: "not_found",
			};
		}

		const isActive = account.status === "active";
		const hasEnough = account.balance >= requiredTokens;

		return {
			sufficient: isActive && hasEnough,
			balance: account.balance,
			required: requiredTokens,
			accountStatus: account.status,
		};
	},
});

/**
 * Deduct tokens from a user's account after AI usage.
 *
 * This is an internal mutation that should only be called from other backend functions.
 * Updates the account balance, records the transaction, and handles status changes.
 * If the balance goes negative, the account status is set to "suspended".
 * Automatically triggers auto-recharge if configured and threshold is reached.
 *
 * @param userId - The user's ID
 * @param workspaceId - The user's workspace ID
 * @param tokenUsageId - Reference to the tokenUsage record
 * @param billableTokens - The number of tokens to deduct (after markup)
 * @param actualTokens - The actual tokens used by the AI provider
 * @returns The new balance after deduction
 *
 * @throws {ConvexError} If account is not found
 *
 * @example
 * ```ts
 * const newBalance = await ctx.runMutation(internal.billing.accounts.deductTokens, {
 *   userId,
 *   workspaceId,
 *   tokenUsageId,
 *   billableTokens: 7500,
 *   actualTokens: 5000
 * });
 * ```
 */
export const deductTokens = internalMutation({
	args: {
		userId: v.id("users"),
		workspaceId: v.id("workspaces"),
		tokenUsageId: v.id("tokenUsage"),
		billableTokens: v.number(),
		actualTokens: v.number(),
	},
	handler: async (
		ctx: MutationCtx,
		{ userId, workspaceId, tokenUsageId, billableTokens, actualTokens },
	): Promise<number> => {
		// Get account
		const account = await ctx.db
			.query("tokenAccounts")
			.withIndex("by_userId", (q) => q.eq("userId", userId))
			.unique();

		if (!account) {
			throw new ConvexError("Token account not found");
		}

		const now = Date.now();
		const balanceBefore = account.balance;
		const newBalance = balanceBefore - billableTokens;

		// Determine new status
		const newStatus = newBalance < 0 ? "suspended" : account.status;

		// Update account
		await ctx.db.patch(account._id, {
			balance: newBalance,
			lifetimeTokensUsed: account.lifetimeTokensUsed + billableTokens,
			lifetimeActualTokensUsed:
				account.lifetimeActualTokensUsed + actualTokens,
			status: newStatus,
			updatedAt: now,
		});

		// Insert transaction record
		await ctx.db.insert("tokenTransactions", {
			userId,
			workspaceId,
			transactionType: "usage",
			tokenAmount: -billableTokens, // Negative for deduction
			balanceBefore,
			balanceAfter: newBalance,
			tokenUsageId,
			description: "Token usage for AI operation",
			createdAt: now,
		});

		// TODO: Auto-recharge implementation (Phase 4: Stripe Integration)
		// Check auto-recharge threshold and trigger if needed
		// if (
		// 	account.autoRechargeEnabled &&
		// 	account.autoRechargeThreshold !== undefined &&
		// 	account.autoRechargeAmount !== undefined &&
		// 	newBalance <= account.autoRechargeThreshold &&
		// 	newBalance >= 0 // Only auto-recharge if not already suspended
		// ) {
		// 	// Schedule auto-recharge
		// 	await ctx.scheduler.runAfter(
		// 		0,
		// 		api.billing.stripe.triggerAutoRecharge,
		// 		{
		// 			userId,
		// 			workspaceId,
		// 			accountId: account._id,
		// 			rechargeAmount: account.autoRechargeAmount,
		// 		},
		// 	);
		// }

		return newBalance;
	},
});

/**
 * Add tokens to a user's account.
 *
 * Used for purchases, admin grants, refunds, and auto-recharges.
 * Updates the account balance and lifetime stats, records the transaction,
 * and reactivates suspended accounts if balance becomes positive.
 *
 * @param userId - The user's ID
 * @param workspaceId - The user's workspace ID
 * @param tokenAmount - The number of tokens to add
 * @param amountCents - The cost in cents (optional, not used for grants)
 * @param transactionType - The type of transaction
 * @param stripePaymentIntentId - Stripe payment reference (optional)
 * @param description - Transaction description
 * @param adminUserId - Admin user ID for admin actions (optional)
 * @returns The new balance after addition
 *
 * @throws {ConvexError} If account is not found
 *
 * @example
 * ```ts
 * const newBalance = await ctx.runMutation(api.billing.accounts.addTokens, {
 *   userId,
 *   workspaceId,
 *   tokenAmount: 50000,
 *   amountCents: 500,
 *   transactionType: "purchase",
 *   stripePaymentIntentId: "pi_123456",
 *   description: "Purchased 50,000 token package"
 * });
 * ```
 */
export const addTokens = mutation({
	args: {
		userId: v.id("users"),
		workspaceId: v.id("workspaces"),
		tokenAmount: v.number(),
		amountCents: v.optional(v.number()),
		transactionType: v.union(
			v.literal("purchase"),
			v.literal("admin_grant"),
			v.literal("refund"),
			v.literal("auto_recharge"),
		),
		stripePaymentIntentId: v.optional(v.string()),
		description: v.string(),
		adminUserId: v.optional(v.id("users")),
	},
	handler: async (
		ctx: MutationCtx,
		{
			userId,
			workspaceId,
			tokenAmount,
			amountCents,
			transactionType,
			stripePaymentIntentId,
			description,
			adminUserId,
		},
	): Promise<number> => {
		// Get account
		const account = await ctx.db
			.query("tokenAccounts")
			.withIndex("by_userId", (q) => q.eq("userId", userId))
			.unique();

		if (!account) {
			throw new ConvexError("Token account not found");
		}

		const now = Date.now();
		const balanceBefore = account.balance;
		const newBalance = balanceBefore + tokenAmount;

		// Determine new status - reactivate if balance becomes positive
		const newStatus = newBalance >= 0 ? "active" : account.status;

		// Build update object
		const updateData: {
			balance: number;
			lifetimeTokensPurchased: number;
			lifetimeSpentCents: number;
			status: "active" | "suspended" | "blocked";
			updatedAt: number;
			lastPurchaseAt?: number;
		} = {
			balance: newBalance,
			lifetimeTokensPurchased:
				account.lifetimeTokensPurchased + tokenAmount,
			lifetimeSpentCents:
				account.lifetimeSpentCents + (amountCents || 0),
			status: newStatus,
			updatedAt: now,
		};

		// Update lastPurchaseAt for purchases and auto-recharges
		if (
			transactionType === "purchase" ||
			transactionType === "auto_recharge"
		) {
			updateData.lastPurchaseAt = now;
		}

		// Update account
		await ctx.db.patch(account._id, updateData);

		// Insert transaction record
		await ctx.db.insert("tokenTransactions", {
			userId,
			workspaceId,
			transactionType,
			tokenAmount,
			balanceBefore,
			balanceAfter: newBalance,
			amountCents,
			stripePaymentIntentId,
			adminUserId,
			description,
			createdAt: now,
		});

		return newBalance;
	},
});

/**
 * Update auto-recharge settings for a user's account.
 *
 * Allows users to configure automatic token purchases when their balance
 * falls below a certain threshold.
 *
 * @param userId - The user's ID
 * @param enabled - Whether to enable auto-recharge
 * @param threshold - The balance threshold to trigger recharge (optional)
 * @param amount - The number of tokens to purchase on recharge (optional)
 * @returns Success status
 *
 * @throws {ConvexError} If account is not found
 *
 * @example
 * ```ts
 * await ctx.runMutation(api.billing.accounts.updateAutoRecharge, {
 *   userId,
 *   enabled: true,
 *   threshold: 5000,
 *   amount: 50000
 * });
 * ```
 */
export const updateAutoRecharge = mutation({
	args: {
		userId: v.id("users"),
		enabled: v.boolean(),
		threshold: v.optional(v.number()),
		amount: v.optional(v.number()),
	},
	handler: async (
		ctx: MutationCtx,
		{ userId, enabled, threshold, amount },
	): Promise<boolean> => {
		// Get account
		const account = await ctx.db
			.query("tokenAccounts")
			.withIndex("by_userId", (q) => q.eq("userId", userId))
			.unique();

		if (!account) {
			throw new ConvexError("Token account not found");
		}

		// Update account with new auto-recharge settings
		await ctx.db.patch(account._id, {
			autoRechargeEnabled: enabled,
			autoRechargeThreshold: threshold,
			autoRechargeAmount: amount,
			updatedAt: Date.now(),
		});

		return true;
	},
});

/**
 * Get transaction history for a user.
 *
 * Returns a paginated list of all token transactions for the user,
 * ordered by most recent first.
 *
 * @param userId - The user's ID
 * @param limit - Maximum number of transactions to return (default: 50)
 * @returns Array of transaction records
 *
 * @example
 * ```ts
 * const transactions = await ctx.runQuery(api.billing.accounts.getTransactions, {
 *   userId,
 *   limit: 25
 * });
 * ```
 */
export const getTransactions = query({
	args: {
		userId: v.id("users"),
		limit: v.optional(v.number()),
	},
	handler: async (ctx: QueryCtx, { userId, limit = 50 }) => {
		const transactions = await ctx.db
			.query("tokenTransactions")
			.withIndex("by_userId_createdAt", (q) => q.eq("userId", userId))
			.order("desc")
			.take(limit);

		return transactions;
	},
});

/**
 * Update Stripe customer ID on a token account.
 *
 * This is an internal mutation used by the Stripe integration to save
 * the Stripe customer ID after creating a new customer.
 *
 * @param userId - The user's ID
 * @param stripeCustomerId - The Stripe customer ID to save
 * @returns Success status
 *
 * @throws {ConvexError} If account is not found
 *
 * @internal This is an internal mutation not meant to be called directly
 */
export const updateStripeCustomer = internalMutation({
	args: {
		userId: v.id("users"),
		stripeCustomerId: v.string(),
	},
	handler: async (
		ctx: MutationCtx,
		{ userId, stripeCustomerId },
	): Promise<boolean> => {
		// Get account
		const account = await ctx.db
			.query("tokenAccounts")
			.withIndex("by_userId", (q) => q.eq("userId", userId))
			.unique();

		if (!account) {
			throw new ConvexError("Token account not found");
		}

		// Update account with Stripe customer ID
		await ctx.db.patch(account._id, {
			stripeCustomerId,
			updatedAt: Date.now(),
		});

		return true;
	},
});
