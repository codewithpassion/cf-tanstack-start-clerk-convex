import { httpRouter } from "convex/server";
import { internal } from "./_generated/api";
import { httpAction } from "./_generated/server";

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

export default http;
