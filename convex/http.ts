import { httpRouter } from "convex/server";
import { internal } from "./_generated/api";
import { httpAction } from "./_generated/server";
import Stripe from "stripe";
import { api } from "./_generated/api";

// Type for Clerk webhook payload
interface ClerkWebhookPayload {
	type: string;
	data: {
		id: string;
		email_addresses?: Array<{ email_address: string }>;
		first_name?: string;
		last_name?: string;
		image_url?: string;
		public_metadata?: {
			roles?: string[];
			[key: string]: unknown;
		};
	};
}

const http = httpRouter();

// Webhook endpoint for Clerk to sync user data
http.route({
	path: "/clerk-webhook",
	method: "POST",
	handler: httpAction(async (ctx, request) => {
		const body = (await request.json()) as unknown;

		// Type guard to ensure we have the expected structure
		if (
			!body ||
			typeof body !== "object" ||
			!("type" in body) ||
			!("data" in body)
		) {
			return new Response("Invalid webhook payload", { status: 400 });
		}

		const payload = body as ClerkWebhookPayload;

		// Verify the webhook signature here if needed
		// const signature = request.headers.get("svix-signature");

		const { type, data } = payload;

		switch (type) {
			case "user.created":
			case "user.updated": {
				const {
					id,
					email_addresses,
					first_name,
					last_name,
					image_url,
					public_metadata,
				} = data;
				const email = email_addresses?.[0]?.email_address;
				const name =
					[first_name, last_name].filter(Boolean).join(" ") || undefined;
				const roles = (public_metadata?.roles as string[]) || ["user"];

				if (email) {
					await ctx.runMutation(internal.users.syncUserInternal, {
						clerkId: id,
						email,
						name,
						imageUrl: image_url,
						roles,
					});
				}
				break;
			}

			case "user.deleted": {
				await ctx.runMutation(internal.users.deleteUser, {
					clerkId: data.id,
				});
				break;
			}
		}

		return new Response(null, { status: 200 });
	}),
});

// Webhook endpoint for Stripe to handle payment events
http.route({
	path: "/stripe-webhook",
	method: "POST",
	handler: httpAction(async (ctx, request) => {
		try {
			// Get the signature from headers
			const signature = request.headers.get("stripe-signature");
			if (!signature) {
				return new Response("Missing stripe-signature header", {
					status: 400,
				});
			}

			// Get the webhook secret
			const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
			if (!webhookSecret) {
				console.error("STRIPE_WEBHOOK_SECRET not configured");
				return new Response("Webhook secret not configured", { status: 500 });
			}

			// Get raw body as text
			const body = await request.text();

			// Initialize Stripe client
			const secretKey = process.env.STRIPE_SECRET_KEY;
			if (!secretKey) {
				console.error("STRIPE_SECRET_KEY not configured");
				return new Response("Stripe secret key not configured", {
					status: 500,
				});
			}

			const stripe = new Stripe(secretKey, {
				apiVersion: "2025-11-17.clover",
				httpClient: Stripe.createFetchHttpClient(),
			});

			// Verify the webhook signature and construct event
			let event: Stripe.Event;
			try {
				event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
			} catch (err) {
				const errorMessage =
					err instanceof Error ? err.message : "Unknown error";
				console.error(`Webhook signature verification failed: ${errorMessage}`);
				return new Response(`Webhook signature verification failed`, {
					status: 400,
				});
			}

			// Handle different event types
			switch (event.type) {
				case "checkout.session.completed": {
					const session = event.data.object as Stripe.Checkout.Session;

					// Only process if payment was successful
					if (session.payment_status === "paid") {
						const metadata = session.metadata;
						if (metadata) {
							const userId = metadata.userId;
							const workspaceId = metadata.workspaceId;
							const tokenAmount = Number.parseInt(metadata.tokenAmount || "0");
							const priceCents = Number.parseInt(metadata.priceCents || "0");

							if (userId && workspaceId && tokenAmount > 0) {
								// Add tokens to the user's account
								await ctx.runMutation(api.billing.accounts.addTokens, {
									userId: userId as any, // Type cast needed for ID
									workspaceId: workspaceId as any,
									tokenAmount,
									amountCents: priceCents,
									transactionType: "purchase",
									stripePaymentIntentId: session.payment_intent as string,
									description: `Purchase: ${tokenAmount} tokens via checkout`,
								});

								console.log(
									`Checkout completed: Added ${tokenAmount} tokens to user ${userId}`,
								);
							}
						}
					}
					break;
				}

				case "payment_intent.succeeded": {
					const paymentIntent = event.data.object as Stripe.PaymentIntent;
					const metadata = paymentIntent.metadata;

					// Check if this is an auto-recharge payment
					if (metadata?.autoRecharge === "true") {
						console.log(
							`Auto-recharge payment succeeded for user ${metadata.userId}`,
						);
						// Auto-recharge already handled in triggerAutoRecharge action
					}
					break;
				}

				case "charge.refunded": {
					const charge = event.data.object as Stripe.Charge;
					const metadata = charge.metadata;

					if (metadata) {
						const userId = metadata.userId;
						const workspaceId = metadata.workspaceId;
						const tokenAmount = Number.parseInt(metadata.tokenAmount || "0");

						if (userId && workspaceId && tokenAmount > 0) {
							// Deduct tokens from the user's account (negative amount for refund)
							await ctx.runMutation(api.billing.accounts.addTokens, {
								userId: userId as any,
								workspaceId: workspaceId as any,
								tokenAmount: -tokenAmount, // Negative to deduct
								transactionType: "refund",
								stripePaymentIntentId: charge.payment_intent as string,
								description: `Refund: ${tokenAmount} tokens refunded`,
							});

							console.log(
								`Refund processed: Deducted ${tokenAmount} tokens from user ${userId}`,
							);
						}
					}
					break;
				}

				default:
					// Log unhandled event types
					console.log(`Unhandled event type: ${event.type}`);
			}

			// Return 200 OK for all events
			return new Response(null, { status: 200 });
		} catch (error) {
			const errorMessage =
				error instanceof Error ? error.message : "Unknown error";
			console.error(`Webhook handler error: ${errorMessage}`);
			return new Response(`Webhook handler error: ${errorMessage}`, {
				status: 500,
			});
		}
	}),
});

export default http;
