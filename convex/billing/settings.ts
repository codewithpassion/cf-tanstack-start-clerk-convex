import { ConvexError, v } from "convex/values";
import { mutation, query } from "../_generated/server";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import type { Id } from "../_generated/dataModel";

/**
 * Default system settings for token billing.
 * These are used when no settings record exists in the database.
 */
const DEFAULT_SETTINGS = {
	defaultTokenMultiplier: 1.5,
	imageGenerationCostDallE3: 6000,
	imageGenerationCostDallE2: 3000,
	imageGenerationCostGoogle: 4500,
	tokensPerUSD: 10000,
	minPurchaseAmountCents: 500,
	newUserBonusTokens: 10000,
	lowBalanceThreshold: 1000,
	criticalBalanceThreshold: 100,
};

/**
 * The singleton key used to store global system settings.
 */
const GLOBAL_SETTINGS_KEY = "global_settings";

/**
 * Get system settings for token billing.
 *
 * Returns the global settings record if it exists, otherwise returns default values.
 * This is a singleton pattern - there should only be one settings record with key="global_settings".
 *
 * @returns System settings object with all configuration values
 *
 * @example
 * ```ts
 * const settings = await ctx.runQuery(api.billing.settings.getSystemSettings);
 * const multiplier = settings.defaultTokenMultiplier;
 * const imageCost = settings.imageGenerationCostDallE3;
 * ```
 */
export const getSystemSettings = query({
	args: {},
	handler: async (ctx: QueryCtx) => {
		// Look up settings by key using the index for efficient lookup
		const settings = await ctx.db
			.query("systemSettings")
			.withIndex("by_key", (q) => q.eq("key", GLOBAL_SETTINGS_KEY))
			.unique();

		// Return existing settings if found
		if (settings) {
			return {
				key: settings.key,
				defaultTokenMultiplier: settings.defaultTokenMultiplier,
				imageGenerationCostDallE3: settings.imageGenerationCostDallE3,
				imageGenerationCostDallE2: settings.imageGenerationCostDallE2,
				imageGenerationCostGoogle: settings.imageGenerationCostGoogle,
				tokensPerUSD: settings.tokensPerUSD,
				minPurchaseAmountCents: settings.minPurchaseAmountCents,
				newUserBonusTokens: settings.newUserBonusTokens,
				lowBalanceThreshold: settings.lowBalanceThreshold,
				criticalBalanceThreshold: settings.criticalBalanceThreshold,
				updatedAt: settings.updatedAt,
				updatedBy: settings.updatedBy,
			};
		}

		// Return defaults if no settings record exists
		return {
			key: GLOBAL_SETTINGS_KEY,
			...DEFAULT_SETTINGS,
			updatedAt: Date.now(),
			updatedBy: undefined,
		};
	},
});

/**
 * Initialize default system settings if they don't exist.
 *
 * This mutation is idempotent - it only creates the settings record if one doesn't already exist.
 * Should be called during system initialization or first deployment.
 *
 * @returns The ID of the settings record (new or existing)
 *
 * @example
 * ```ts
 * // Call during system setup
 * await ctx.runMutation(api.billing.settings.initializeDefaultSettings);
 * ```
 */
export const initializeDefaultSettings = mutation({
	args: {},
	handler: async (ctx: MutationCtx): Promise<Id<"systemSettings">> => {
		// Check if settings already exist
		const existingSettings = await ctx.db
			.query("systemSettings")
			.withIndex("by_key", (q) => q.eq("key", GLOBAL_SETTINGS_KEY))
			.unique();

		// Return existing settings ID if found
		if (existingSettings) {
			return existingSettings._id;
		}

		// Create new settings record with defaults
		const settingsId = await ctx.db.insert("systemSettings", {
			key: GLOBAL_SETTINGS_KEY,
			defaultTokenMultiplier: DEFAULT_SETTINGS.defaultTokenMultiplier,
			imageGenerationCostDallE3: DEFAULT_SETTINGS.imageGenerationCostDallE3,
			imageGenerationCostDallE2: DEFAULT_SETTINGS.imageGenerationCostDallE2,
			imageGenerationCostGoogle: DEFAULT_SETTINGS.imageGenerationCostGoogle,
			tokensPerUSD: DEFAULT_SETTINGS.tokensPerUSD,
			minPurchaseAmountCents: DEFAULT_SETTINGS.minPurchaseAmountCents,
			newUserBonusTokens: DEFAULT_SETTINGS.newUserBonusTokens,
			lowBalanceThreshold: DEFAULT_SETTINGS.lowBalanceThreshold,
			criticalBalanceThreshold: DEFAULT_SETTINGS.criticalBalanceThreshold,
			updatedAt: Date.now(),
		});

		return settingsId;
	},
});

/**
 * Update system settings (admin only).
 *
 * Allows administrators to modify global billing configuration.
 * Only the fields provided in the updates object will be changed.
 *
 * @param adminUserId - The ID of the admin user making the update
 * @param updates - Partial object containing fields to update
 * @returns Success status
 *
 * @throws {ConvexError} If user is not authenticated
 * @throws {ConvexError} If user is not found
 * @throws {ConvexError} If user is not an admin or superadmin
 * @throws {ConvexError} If settings record doesn't exist
 *
 * @example
 * ```ts
 * await ctx.runMutation(api.billing.settings.updateSystemSettings, {
 *   adminUserId: userId,
 *   updates: {
 *     defaultTokenMultiplier: 1.8,
 *     newUserBonusTokens: 15000,
 *   }
 * });
 * ```
 */
export const updateSystemSettings = mutation({
	args: {
		adminUserId: v.id("users"),
		updates: v.object({
			defaultTokenMultiplier: v.optional(v.number()),
			imageGenerationCostDallE3: v.optional(v.number()),
			imageGenerationCostDallE2: v.optional(v.number()),
			imageGenerationCostGoogle: v.optional(v.number()),
			tokensPerUSD: v.optional(v.number()),
			minPurchaseAmountCents: v.optional(v.number()),
			newUserBonusTokens: v.optional(v.number()),
			lowBalanceThreshold: v.optional(v.number()),
			criticalBalanceThreshold: v.optional(v.number()),
		}),
	},
	handler: async (
		ctx: MutationCtx,
		{ adminUserId, updates },
	): Promise<{ success: boolean }> => {
		// Verify authentication
		const identity = await ctx.auth.getUserIdentity();
		if (!identity) {
			throw new ConvexError("Not authenticated");
		}

		// Get the admin user and verify they exist
		const adminUser = await ctx.db.get(adminUserId);
		if (!adminUser) {
			throw new ConvexError("Admin user not found");
		}

		// Verify the user has admin or superadmin role
		const roles = adminUser.roles || [];
		const isAdmin = roles.includes("admin") || roles.includes("superadmin");

		if (!isAdmin) {
			throw new ConvexError(
				"Unauthorized: Admin or superadmin access required",
			);
		}

		// Get the settings record
		const settings = await ctx.db
			.query("systemSettings")
			.withIndex("by_key", (q) => q.eq("key", GLOBAL_SETTINGS_KEY))
			.unique();

		if (!settings) {
			throw new ConvexError(
				"System settings not found. Please initialize default settings first.",
			);
		}

		// Build the update object with only provided fields
		const updateData: Record<string, number | Id<"users">> = {
			updatedAt: Date.now(),
			updatedBy: adminUserId,
		};

		// Add each optional field if provided
		if (updates.defaultTokenMultiplier !== undefined) {
			updateData.defaultTokenMultiplier = updates.defaultTokenMultiplier;
		}
		if (updates.imageGenerationCostDallE3 !== undefined) {
			updateData.imageGenerationCostDallE3 = updates.imageGenerationCostDallE3;
		}
		if (updates.imageGenerationCostDallE2 !== undefined) {
			updateData.imageGenerationCostDallE2 = updates.imageGenerationCostDallE2;
		}
		if (updates.imageGenerationCostGoogle !== undefined) {
			updateData.imageGenerationCostGoogle = updates.imageGenerationCostGoogle;
		}
		if (updates.tokensPerUSD !== undefined) {
			updateData.tokensPerUSD = updates.tokensPerUSD;
		}
		if (updates.minPurchaseAmountCents !== undefined) {
			updateData.minPurchaseAmountCents = updates.minPurchaseAmountCents;
		}
		if (updates.newUserBonusTokens !== undefined) {
			updateData.newUserBonusTokens = updates.newUserBonusTokens;
		}
		if (updates.lowBalanceThreshold !== undefined) {
			updateData.lowBalanceThreshold = updates.lowBalanceThreshold;
		}
		if (updates.criticalBalanceThreshold !== undefined) {
			updateData.criticalBalanceThreshold = updates.criticalBalanceThreshold;
		}

		// Update the settings record
		await ctx.db.patch(settings._id, updateData);

		return { success: true };
	},
});
