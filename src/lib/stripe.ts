import Stripe from "stripe";

/**
 * Gets a Stripe client instance for server-side operations.
 *
 * This function creates and returns a configured Stripe client using the
 * secret key from environment variables. It's configured to work with
 * Cloudflare Workers by using the fetch-based HTTP client.
 *
 * @returns Configured Stripe client instance
 * @throws Error if STRIPE_SECRET_KEY is not configured
 *
 * @example
 * ```ts
 * const stripe = getStripeClient();
 * const customer = await stripe.customers.create({ email: 'user@example.com' });
 * ```
 */
export function getStripeClient(): Stripe {
	const secretKey = process.env.STRIPE_SECRET_KEY;

	if (!secretKey) {
		throw new Error(
			"STRIPE_SECRET_KEY is not configured in environment variables. " +
				"Please add it to your .env file or Cloudflare Workers environment.",
		);
	}

	return new Stripe(secretKey, {
		apiVersion: "2025-11-17.clover",
		httpClient: Stripe.createFetchHttpClient(), // Cloudflare Workers compatible
	});
}

/**
 * Gets the Stripe publishable key for client-side operations.
 *
 * This function retrieves the Stripe publishable key that should be used
 * with @stripe/stripe-js on the client side. The key is safe to expose
 * publicly and is used to tokenize payment information.
 *
 * @returns Stripe publishable key
 * @throws Error if VITE_STRIPE_PUBLISHABLE_KEY is not configured
 *
 * @example
 * ```ts
 * import { loadStripe } from '@stripe/stripe-js';
 *
 * const publishableKey = getStripePublishableKey();
 * const stripe = await loadStripe(publishableKey);
 * ```
 */
export function getStripePublishableKey(): string {
	const publishableKey = process.env.VITE_STRIPE_PUBLISHABLE_KEY;

	if (!publishableKey) {
		throw new Error(
			"VITE_STRIPE_PUBLISHABLE_KEY is not configured in environment variables. " +
				"Please add it to your .env file with the VITE_ prefix for client-side access.",
		);
	}

	return publishableKey;
}
