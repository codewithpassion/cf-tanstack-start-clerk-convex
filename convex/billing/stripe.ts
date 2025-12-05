import { ConvexError, v } from "convex/values";
import { action, internalMutation } from "../_generated/server";
import { api, internal } from "../_generated/api";
import type { ActionCtx, MutationCtx } from "../_generated/server";
import { getStripeClient } from "../../src/lib/stripe";

/**
 * Create a Stripe checkout session for purchasing tokens.
 *
 * This action creates a Stripe checkout session that allows users to purchase
 * token packages. It handles Stripe customer creation/retrieval and sets up
 * the checkout with proper metadata for webhook processing.
 *
 * @param userId - The user's Convex ID
 * @param packageId - The token package ID to purchase
 * @param successUrl - URL to redirect to after successful payment
 * @param cancelUrl - URL to redirect to if payment is cancelled
 * @returns Object containing the Stripe session ID and checkout URL
 *
 * @throws {ConvexError} If user is not found
 * @throws {ConvexError} If token account is not found
 * @throws {ConvexError} If package is not found or inactive
 * @throws {Error} If Stripe API fails
 *
 * @example
 * ```ts
 * const { sessionId, url } = await ctx.runAction(api.billing.stripe.createCheckoutSession, {
 *   userId,
 *   packageId,
 *   successUrl: 'https://example.com/success',
 *   cancelUrl: 'https://example.com/cancel'
 * });
 * window.location.href = url; // Redirect to Stripe checkout
 * ```
 */
export const createCheckoutSession = action({
	args: {
		userId: v.id("users"),
		packageId: v.id("tokenPricing"),
		successUrl: v.string(),
		cancelUrl: v.string(),
	},
	handler: async (
		ctx: ActionCtx,
		{ userId, packageId, successUrl, cancelUrl },
	): Promise<{ sessionId: string; url: string }> => {
		// Get user
		const user = await ctx.runQuery(internal.users.getById, {
			userId,
		});
		if (!user) {
			throw new ConvexError("User not found");
		}

		// Get user's token account
		const account = await ctx.runQuery(api.billing.accounts.getAccount, {
			userId,
		});
		if (!account) {
			throw new ConvexError("Token account not found");
		}

		// Get package details
		const pkg = await ctx.runQuery(api.billing.pricing.getPackageById, {
			id: packageId,
		});
		if (!pkg) {
			throw new ConvexError("Package not found");
		}
		if (!pkg.active) {
			throw new ConvexError("Package is not active");
		}

		// Initialize Stripe client
		const stripe = getStripeClient();

		// Create or retrieve Stripe customer
		let customerId = account.stripeCustomerId;
		if (!customerId) {
			// Create new Stripe customer
			const customer = await stripe.customers.create({
				email: user.email,
				name: user.name || undefined,
				metadata: {
					userId: userId,
					workspaceId: account.workspaceId,
				},
			});
			customerId = customer.id;

			// Save customer ID to account
			await ctx.runMutation(
				internal.billing.accounts.updateStripeCustomer,
				{
					userId,
					stripeCustomerId: customerId,
				},
			);
		}

		// Create checkout session
		const session = await stripe.checkout.sessions.create({
			customer: customerId,
			mode: "payment",
			line_items: [
				{
					price: pkg.stripePriceId,
					quantity: 1,
				},
			],
			success_url: successUrl,
			cancel_url: cancelUrl,
			metadata: {
				userId,
				workspaceId: account.workspaceId,
				packageId,
				tokenAmount: pkg.tokenAmount.toString(),
				priceCents: pkg.priceCents.toString(),
			},
			payment_intent_data: {
				metadata: {
					userId,
					workspaceId: account.workspaceId,
					packageId,
					tokenAmount: pkg.tokenAmount.toString(),
					priceCents: pkg.priceCents.toString(),
				},
			},
		});

		if (!session.url) {
			throw new Error("Failed to create checkout session URL");
		}

		return {
			sessionId: session.id,
			url: session.url,
		};
	},
});

/**
 * Trigger auto-recharge for a user's account.
 *
 * This action is called when a user's token balance falls below the configured
 * threshold. It creates an off-session payment using the user's saved payment
 * method and adds tokens to their account upon success. If payment fails,
 * auto-recharge is automatically disabled.
 *
 * @param userId - The user's Convex ID
 * @param accountId - The token account ID (unused, kept for API compatibility)
 * @returns Result object with success status, payment intent ID, or failure reason
 *
 * @throws {ConvexError} If account is not found
 * @throws {ConvexError} If auto-recharge is not enabled
 * @throws {ConvexError} If auto-recharge is not properly configured
 * @throws {ConvexError} If no matching package found for recharge amount
 * @throws {ConvexError} If no default payment method is set
 *
 * @example
 * ```ts
 * // Called automatically when balance drops below threshold
 * const result = await ctx.runAction(api.billing.stripe.triggerAutoRecharge, {
 *   userId,
 *   accountId
 * });
 * if (result.success) {
 *   console.log(`Auto-recharged ${account.autoRechargeAmount} tokens`);
 * }
 * ```
 */
export const triggerAutoRecharge = action({
	args: {
		userId: v.id("users"),
		accountId: v.id("tokenAccounts"),
	},
	handler: async (
		ctx: ActionCtx,
		{ userId },
	): Promise<{
		success: boolean;
		paymentIntentId?: string;
		reason?: string;
	}> => {
		// Get account
		const account = await ctx.runQuery(api.billing.accounts.getAccount, {
			userId,
		});
		if (!account) {
			throw new ConvexError("Token account not found");
		}

		// Validate auto-recharge is enabled
		if (!account.autoRechargeEnabled) {
			throw new ConvexError("Auto-recharge is not enabled");
		}

		// Validate auto-recharge configuration
		if (
			account.autoRechargeAmount === undefined ||
			account.autoRechargeThreshold === undefined
		) {
			throw new ConvexError(
				"Auto-recharge is not properly configured (missing amount or threshold)",
			);
		}

		// Validate Stripe customer and payment method
		if (!account.stripeCustomerId) {
			await ctx.runMutation(api.billing.accounts.updateAutoRecharge, {
				userId,
				enabled: false,
			});
			return {
				success: false,
				reason: "No Stripe customer ID found. Auto-recharge disabled.",
			};
		}

		if (!account.defaultPaymentMethodId) {
			await ctx.runMutation(api.billing.accounts.updateAutoRecharge, {
				userId,
				enabled: false,
			});
			return {
				success: false,
				reason: "No default payment method set. Auto-recharge disabled.",
			};
		}

		// Find package matching the auto-recharge amount
		const packages = await ctx.runQuery(
			api.billing.pricing.listActivePackages,
		);
		const matchingPackage = packages.find(
			(p) => p.tokenAmount === account.autoRechargeAmount,
		);

		if (!matchingPackage) {
			throw new ConvexError(
				`No active package found with ${account.autoRechargeAmount} tokens`,
			);
		}

		// Initialize Stripe client
		const stripe = getStripeClient();

		try {
			// Create off-session payment intent
			const paymentIntent = await stripe.paymentIntents.create({
				amount: matchingPackage.priceCents,
				currency: account.currency,
				customer: account.stripeCustomerId,
				payment_method: account.defaultPaymentMethodId,
				off_session: true,
				confirm: true,
				metadata: {
					userId,
					workspaceId: account.workspaceId,
					packageId: matchingPackage._id,
					tokenAmount: matchingPackage.tokenAmount.toString(),
					autoRecharge: "true",
				},
			});

			// Check if payment succeeded
			if (paymentIntent.status === "succeeded") {
				// Add tokens to account
				await ctx.runMutation(api.billing.accounts.addTokens, {
					userId,
					workspaceId: account.workspaceId,
					tokenAmount: matchingPackage.tokenAmount,
					amountCents: matchingPackage.priceCents,
					transactionType: "auto_recharge",
					stripePaymentIntentId: paymentIntent.id,
					description: `Auto-recharge: ${matchingPackage.packageName} package`,
				});

				return {
					success: true,
					paymentIntentId: paymentIntent.id,
				};
			}

			// Payment did not succeed, disable auto-recharge
			await ctx.runMutation(api.billing.accounts.updateAutoRecharge, {
				userId,
				enabled: false,
			});

			return {
				success: false,
				reason: `Payment failed with status: ${paymentIntent.status}. Auto-recharge disabled.`,
			};
		} catch (error) {
			// Payment failed, disable auto-recharge
			await ctx.runMutation(api.billing.accounts.updateAutoRecharge, {
				userId,
				enabled: false,
			});

			const errorMessage =
				error instanceof Error ? error.message : "Unknown error";

			return {
				success: false,
				reason: `Payment failed: ${errorMessage}. Auto-recharge disabled.`,
			};
		}
	},
});

/**
 * Internal mutation to update Stripe customer ID on account.
 *
 * This is a helper function called after creating a new Stripe customer
 * to save the customer ID to the user's token account for future use.
 *
 * @param userId - The user's Convex ID
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
