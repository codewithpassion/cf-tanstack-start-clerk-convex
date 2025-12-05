import { ConvexError, v } from "convex/values";
import { mutation, query } from "../_generated/server";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import type { Id } from "../_generated/dataModel";

/**
 * List all active token pricing packages.
 *
 * Returns all packages where active=true, ordered by sortOrder ascending.
 * This is a public query that doesn't require authentication, so users can
 * see available packages before signing up or purchasing.
 *
 * @returns Array of active pricing packages
 *
 * @example
 * ```ts
 * const packages = await ctx.runQuery(api.billing.pricing.listActivePackages);
 * packages.forEach(pkg => {
 *   console.log(`${pkg.packageName}: ${pkg.tokenAmount} tokens for $${pkg.priceCents / 100}`);
 * });
 * ```
 */
export const listActivePackages = query({
	args: {},
	handler: async (ctx: QueryCtx) => {
		// Query all active packages
		const packages = await ctx.db
			.query("tokenPricing")
			.withIndex("by_active", (q) => q.eq("active", true))
			.collect();

		// Sort by sortOrder ascending
		packages.sort((a, b) => a.sortOrder - b.sortOrder);

		return packages;
	},
});

/**
 * Get a specific token pricing package by ID.
 *
 * Returns the package details if it exists, or null if not found.
 * This is a public query that doesn't require authentication.
 *
 * @param id - The package ID
 * @returns Package object or null
 *
 * @example
 * ```ts
 * const package = await ctx.runQuery(api.billing.pricing.getPackageById, {
 *   id: packageId
 * });
 * if (package) {
 *   console.log(`Package: ${package.packageName}`);
 * }
 * ```
 */
export const getPackageById = query({
	args: {
		id: v.id("tokenPricing"),
	},
	handler: async (ctx: QueryCtx, { id }) => {
		const pkg = await ctx.db.get(id);
		return pkg;
	},
});

/**
 * Create a new token pricing package (admin only).
 *
 * Allows administrators to create new token packages for purchase.
 * Validates that the user has admin or superadmin role before proceeding.
 *
 * @param adminUserId - The ID of the admin user creating the package
 * @param packageName - Name of the package (e.g., "Starter", "Pro")
 * @param tokenAmount - Number of tokens in the package
 * @param priceCents - Price in cents (e.g., 1500 for $15.00)
 * @param stripePriceId - Stripe price ID for checkout
 * @param description - Optional description of the package
 * @param isPopular - Whether to mark as popular/featured (default: false)
 * @param sortOrder - Display order (lower numbers first)
 * @returns The new package ID
 *
 * @throws {ConvexError} If user is not authenticated
 * @throws {ConvexError} If user is not found
 * @throws {ConvexError} If user is not an admin or superadmin
 *
 * @example
 * ```ts
 * const packageId = await ctx.runMutation(api.billing.pricing.createPackage, {
 *   adminUserId: userId,
 *   packageName: "Pro",
 *   tokenAmount: 750000,
 *   priceCents: 6500,
 *   stripePriceId: "price_123456",
 *   description: "Best value for growing businesses",
 *   isPopular: true,
 *   sortOrder: 2
 * });
 * ```
 */
export const createPackage = mutation({
	args: {
		adminUserId: v.id("users"),
		packageName: v.string(),
		tokenAmount: v.number(),
		priceCents: v.number(),
		stripePriceId: v.string(),
		description: v.optional(v.string()),
		isPopular: v.boolean(),
		sortOrder: v.number(),
	},
	handler: async (
		ctx: MutationCtx,
		{
			adminUserId,
			packageName,
			tokenAmount,
			priceCents,
			stripePriceId,
			description,
			isPopular,
			sortOrder,
		},
	): Promise<Id<"tokenPricing">> => {
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

		// Create the package
		const now = Date.now();
		const packageId = await ctx.db.insert("tokenPricing", {
			packageName,
			tokenAmount,
			priceCents,
			stripePriceId,
			description,
			isPopular,
			sortOrder,
			active: true,
			createdAt: now,
			updatedAt: now,
		});

		return packageId;
	},
});

/**
 * Update an existing token pricing package (admin only).
 *
 * Allows administrators to modify package details. Only the fields provided
 * in the updates object will be changed. Always updates the updatedAt timestamp.
 *
 * @param adminUserId - The ID of the admin user updating the package
 * @param packageId - The ID of the package to update
 * @param updates - Partial object containing fields to update
 * @returns Success status
 *
 * @throws {ConvexError} If user is not authenticated
 * @throws {ConvexError} If user is not found
 * @throws {ConvexError} If user is not an admin or superadmin
 * @throws {ConvexError} If package is not found
 *
 * @example
 * ```ts
 * await ctx.runMutation(api.billing.pricing.updatePackage, {
 *   adminUserId: userId,
 *   packageId,
 *   updates: {
 *     priceCents: 5900, // Price change
 *     isPopular: true,
 *     active: false // Deactivate package
 *   }
 * });
 * ```
 */
export const updatePackage = mutation({
	args: {
		adminUserId: v.id("users"),
		packageId: v.id("tokenPricing"),
		updates: v.object({
			packageName: v.optional(v.string()),
			tokenAmount: v.optional(v.number()),
			priceCents: v.optional(v.number()),
			stripePriceId: v.optional(v.string()),
			description: v.optional(v.string()),
			isPopular: v.optional(v.boolean()),
			sortOrder: v.optional(v.number()),
			active: v.optional(v.boolean()),
		}),
	},
	handler: async (
		ctx: MutationCtx,
		{ adminUserId, packageId, updates },
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

		// Get the package
		const pkg = await ctx.db.get(packageId);
		if (!pkg) {
			throw new ConvexError("Package not found");
		}

		// Build the update object with only provided fields
		const updateData: Record<string, string | number | boolean> = {
			updatedAt: Date.now(),
		};

		// Add each optional field if provided
		if (updates.packageName !== undefined) {
			updateData.packageName = updates.packageName;
		}
		if (updates.tokenAmount !== undefined) {
			updateData.tokenAmount = updates.tokenAmount;
		}
		if (updates.priceCents !== undefined) {
			updateData.priceCents = updates.priceCents;
		}
		if (updates.stripePriceId !== undefined) {
			updateData.stripePriceId = updates.stripePriceId;
		}
		if (updates.description !== undefined) {
			updateData.description = updates.description;
		}
		if (updates.isPopular !== undefined) {
			updateData.isPopular = updates.isPopular;
		}
		if (updates.sortOrder !== undefined) {
			updateData.sortOrder = updates.sortOrder;
		}
		if (updates.active !== undefined) {
			updateData.active = updates.active;
		}

		// Update the package
		await ctx.db.patch(packageId, updateData);

		return { success: true };
	},
});

/**
 * Seed default token pricing packages (for initial setup).
 *
 * Creates 4 default packages if no packages exist in the database:
 * - Starter: 150,000 tokens for $15.00
 * - Pro: 750,000 tokens for $65.00 (marked as popular)
 * - Business: 2,250,000 tokens for $175.00
 * - Enterprise: 7,500,000 tokens for $500.00
 *
 * This mutation is idempotent - it only creates packages if none exist.
 * Should be called during system initialization or first deployment.
 * Uses placeholder Stripe price IDs that should be replaced with real ones.
 *
 * @returns Object containing package IDs or message if packages already exist
 *
 * @example
 * ```ts
 * // Call during system setup
 * const result = await ctx.runMutation(api.billing.pricing.seedDefaultPackages);
 * console.log(result.message); // "Default packages created" or "Packages already exist"
 * ```
 */
export const seedDefaultPackages = mutation({
	args: {},
	handler: async (
		ctx: MutationCtx,
	): Promise<
		| { message: string; packageIds?: Id<"tokenPricing">[] }
		| { message: string }
	> => {
		// Check if any packages already exist
		const existingPackages = await ctx.db.query("tokenPricing").take(1);

		if (existingPackages.length > 0) {
			return { message: "Packages already exist, skipping seed" };
		}

		const now = Date.now();
		const packageIds: Id<"tokenPricing">[] = [];

		// Create Starter package
		const starterId = await ctx.db.insert("tokenPricing", {
			packageName: "Starter",
			tokenAmount: 150000,
			priceCents: 1500, // $15.00
			stripePriceId: "stripe_price_placeholder_starter",
			description: "Perfect for trying out the platform",
			isPopular: false,
			sortOrder: 1,
			active: true,
			createdAt: now,
			updatedAt: now,
		});
		packageIds.push(starterId);

		// Create Pro package (popular)
		const proId = await ctx.db.insert("tokenPricing", {
			packageName: "Pro",
			tokenAmount: 750000,
			priceCents: 6500, // $65.00
			stripePriceId: "stripe_price_placeholder_pro",
			description: "Best value for growing businesses",
			isPopular: true,
			sortOrder: 2,
			active: true,
			createdAt: now,
			updatedAt: now,
		});
		packageIds.push(proId);

		// Create Business package
		const businessId = await ctx.db.insert("tokenPricing", {
			packageName: "Business",
			tokenAmount: 2250000,
			priceCents: 17500, // $175.00
			stripePriceId: "stripe_price_placeholder_business",
			description: "For teams and scaling operations",
			isPopular: false,
			sortOrder: 3,
			active: true,
			createdAt: now,
			updatedAt: now,
		});
		packageIds.push(businessId);

		// Create Enterprise package
		const enterpriseId = await ctx.db.insert("tokenPricing", {
			packageName: "Enterprise",
			tokenAmount: 7500000,
			priceCents: 50000, // $500.00
			stripePriceId: "stripe_price_placeholder_enterprise",
			description: "Maximum capacity for large organizations",
			isPopular: false,
			sortOrder: 4,
			active: true,
			createdAt: now,
			updatedAt: now,
		});
		packageIds.push(enterpriseId);

		return {
			message: "Default packages created successfully",
			packageIds,
		};
	},
});
