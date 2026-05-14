import { httpRouter } from "convex/server";
import { internal } from "./_generated/api";
import { httpAction } from "./_generated/server";

interface ClerkUserData {
	id: string;
	email_addresses?: Array<{ email_address: string }>;
	first_name?: string;
	last_name?: string;
	image_url?: string;
	public_metadata?: {
		roles?: string[];
		[key: string]: unknown;
	};
}

interface ClerkOrganizationData {
	id: string;
	name: string;
	slug: string;
}

interface ClerkMembershipData {
	organization: { id: string };
	public_user_data: { user_id: string };
	role: string;
}

type ClerkWebhookPayload =
	| {
		type: "user.created" | "user.updated" | "user.deleted";
		data: ClerkUserData;
	}
	| {
		type:
			| "organization.created"
			| "organization.updated"
			| "organization.deleted";
		data: ClerkOrganizationData;
	}
	| {
		type:
			| "organizationMembership.created"
			| "organizationMembership.updated"
			| "organizationMembership.deleted";
		data: ClerkMembershipData;
	};

const http = httpRouter();

http.route({
	path: "/clerk-webhook",
	method: "POST",
	handler: httpAction(async (ctx, request) => {
		const body = (await request.json()) as unknown;
		if (
			!body ||
			typeof body !== "object" ||
			!("type" in body) ||
			!("data" in body)
		) {
			return new Response("Invalid webhook payload", { status: 400 });
		}

		const payload = body as ClerkWebhookPayload;

		switch (payload.type) {
			case "user.created":
			case "user.updated": {
				const data = payload.data;
				const email = data.email_addresses?.[0]?.email_address;
				const name =
					[data.first_name, data.last_name].filter(Boolean).join(" ") ||
					undefined;
				const roles = (data.public_metadata?.roles as string[]) || ["user"];
				if (email) {
					await ctx.runMutation(internal.users.syncUserInternal, {
						clerkId: data.id,
						email,
						name,
						imageUrl: data.image_url,
						roles,
					});
				}
				break;
			}
			case "user.deleted": {
				await ctx.runMutation(internal.users.deleteUser, {
					clerkId: payload.data.id,
				});
				break;
			}
			case "organization.created":
			case "organization.updated": {
				const data = payload.data;
				await ctx.runMutation(internal.organizations._syncOrgFromWebhook, {
					clerkOrgId: data.id,
					name: data.name,
					slug: data.slug,
				});
				break;
			}
			case "organization.deleted": {
				await ctx.runMutation(internal.organizations._deleteOrgFromWebhook, {
					clerkOrgId: payload.data.id,
				});
				break;
			}
			case "organizationMembership.created":
			case "organizationMembership.updated": {
				const data = payload.data;
				await ctx.runMutation(
					internal.organizations._syncMembershipFromWebhook,
					{
						clerkOrgId: data.organization.id,
						clerkUserId: data.public_user_data.user_id,
						role: data.role,
					},
				);
				break;
			}
			case "organizationMembership.deleted": {
				const data = payload.data;
				await ctx.runMutation(
					internal.organizations._deleteMembershipFromWebhook,
					{
						clerkOrgId: data.organization.id,
						clerkUserId: data.public_user_data.user_id,
					},
				);
				break;
			}
		}

		return new Response(null, { status: 200 });
	}),
});

export default http;
