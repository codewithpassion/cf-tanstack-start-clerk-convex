import { ConvexError, v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import { internal } from "./_generated/api";
import {
	action,
	internalAction,
	internalMutation,
	internalQuery,
	mutation,
	query,
	type MutationCtx,
	type QueryCtx,
} from "./_generated/server";
import { requireOrgMember } from "./orgAuth";

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function validateSlug(slug: string) {
	if (slug.length < 3 || slug.length > 32 || !SLUG_RE.test(slug)) {
		throw new ConvexError(
			"Slug must be 3-32 chars, lowercase letters/numbers, hyphen-separated",
		);
	}
}

async function getCurrentUserOrThrow(
	ctx: QueryCtx | MutationCtx,
): Promise<Doc<"users">> {
	const identity = await ctx.auth.getUserIdentity();
	if (!identity) throw new ConvexError("Not authenticated");
	const user = await ctx.db
		.query("users")
		.withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
		.unique();
	if (!user) throw new ConvexError("User not synced");
	return user;
}

async function clerkRequest(
	path: string,
	init: { method?: string; body?: unknown } = {},
): Promise<unknown> {
	const secret = process.env.CLERK_SECRET_KEY;
	if (!secret) throw new ConvexError("CLERK_SECRET_KEY not configured");
	const res = await fetch(`https://api.clerk.com/v1${path}`, {
		method: init.method ?? "GET",
		headers: {
			Authorization: `Bearer ${secret}`,
			"Content-Type": "application/json",
		},
		body: init.body ? JSON.stringify(init.body) : undefined,
	});
	if (!res.ok) {
		const text = await res.text();
		throw new ConvexError(`Clerk API ${res.status}: ${text}`);
	}
	if (res.status === 204) return null;
	return await res.json();
}

export const create = action({
	args: {
		name: v.string(),
		slug: v.string(),
		description: v.optional(v.string()),
	},
	handler: async (ctx, { name, slug, description }): Promise<{ slug: string }> => {
		validateSlug(slug);

		const identity = await ctx.auth.getUserIdentity();
		if (!identity) throw new ConvexError("Not authenticated");

		const existing: Doc<"organizations"> | null = await ctx.runQuery(
			internal.organizations._getBySlugInternal,
			{ slug },
		);
		if (existing) {
			throw new ConvexError("Slug already taken");
		}

		const clerkOrg = (await clerkRequest("/organizations", {
			method: "POST",
			body: {
				name,
				slug,
				created_by: identity.subject,
			},
		})) as { id: string };

		await ctx.runMutation(internal.organizations._mirrorCreate, {
			name,
			slug,
			description,
			clerkOrgId: clerkOrg.id,
			creatorClerkUserId: identity.subject,
		});

		return { slug };
	},
});

export const _getBySlugInternal = internalQuery({
	args: { slug: v.string() },
	handler: async (ctx, { slug }) => {
		return await ctx.db
			.query("organizations")
			.withIndex("by_slug", (q) => q.eq("slug", slug))
			.unique();
	},
});

export const _mirrorCreate = internalMutation({
	args: {
		name: v.string(),
		slug: v.string(),
		description: v.optional(v.string()),
		clerkOrgId: v.string(),
		creatorClerkUserId: v.string(),
	},
	handler: async (
		ctx,
		{ name, slug, description, clerkOrgId, creatorClerkUserId },
	) => {
		const existing = await ctx.db
			.query("organizations")
			.withIndex("by_clerkOrgId", (q) => q.eq("clerkOrgId", clerkOrgId))
			.unique();
		const now = Date.now();
		let orgId: Id<"organizations">;
		if (existing) {
			await ctx.db.patch(existing._id, { name, slug, description, updatedAt: now });
			orgId = existing._id;
		} else {
			orgId = await ctx.db.insert("organizations", {
				name,
				slug,
				description,
				clerkOrgId,
				createdAt: now,
				updatedAt: now,
			});
		}

		const user = await ctx.db
			.query("users")
			.withIndex("by_clerkId", (q) => q.eq("clerkId", creatorClerkUserId))
			.unique();
		if (!user) return orgId;

		const existingMember = await ctx.db
			.query("organizationMembers")
			.withIndex("by_org_clerkUser", (q) =>
				q.eq("orgId", orgId).eq("clerkUserId", creatorClerkUserId),
			)
			.unique();
		if (!existingMember) {
			await ctx.db.insert("organizationMembers", {
				orgId,
				userId: user._id,
				clerkUserId: creatorClerkUserId,
				role: "admin",
				createdAt: now,
			});
		}

		return orgId;
	},
});

export const listMine = query({
	args: {},
	handler: async (ctx) => {
		const identity = await ctx.auth.getUserIdentity();
		if (!identity) return [];

		const memberships = await ctx.db
			.query("organizationMembers")
			.withIndex("by_clerkUser", (q) => q.eq("clerkUserId", identity.subject))
			.collect();

		const orgs = await Promise.all(
			memberships.map(async (m) => {
				const org = await ctx.db.get(m.orgId);
				if (!org) return null;
				return {
					_id: org._id,
					name: org.name,
					slug: org.slug,
					description: org.description,
					role: m.role,
				};
			}),
		);

		return orgs.filter((o): o is NonNullable<typeof o> => o !== null);
	},
});

export const getBySlug = query({
	args: { slug: v.string() },
	handler: async (ctx, { slug }) => {
		const org = await ctx.db
			.query("organizations")
			.withIndex("by_slug", (q) => q.eq("slug", slug))
			.unique();
		if (!org) return null;

		const identity = await ctx.auth.getUserIdentity();
		if (!identity) return null;

		const membership = await ctx.db
			.query("organizationMembers")
			.withIndex("by_org_clerkUser", (q) =>
				q.eq("orgId", org._id).eq("clerkUserId", identity.subject),
			)
			.unique();
		if (!membership) return null;

		return {
			_id: org._id,
			name: org.name,
			slug: org.slug,
			description: org.description,
			clerkOrgId: org.clerkOrgId,
			role: membership.role,
		};
	},
});

export const listMembers = query({
	args: { orgId: v.id("organizations") },
	handler: async (ctx, { orgId }) => {
		await requireOrgMember(ctx, orgId);
		const members = await ctx.db
			.query("organizationMembers")
			.withIndex("by_org", (q) => q.eq("orgId", orgId))
			.collect();

		return await Promise.all(
			members.map(async (m) => {
				const user = await ctx.db.get(m.userId);
				return {
					_id: m._id,
					role: m.role,
					createdAt: m.createdAt,
					clerkUserId: m.clerkUserId,
					user: user
						? {
							_id: user._id,
							email: user.email,
							name: user.name,
							imageUrl: user.imageUrl,
						}
						: null,
				};
			}),
		);
	},
});

async function countAdmins(
	ctx: QueryCtx | MutationCtx,
	orgId: Id<"organizations">,
): Promise<number> {
	const members = await ctx.db
		.query("organizationMembers")
		.withIndex("by_org", (q) => q.eq("orgId", orgId))
		.collect();
	return members.filter((m) => m.role === "admin").length;
}

export const updateMember = mutation({
	args: {
		orgId: v.id("organizations"),
		memberId: v.id("organizationMembers"),
		role: v.union(v.literal("admin"), v.literal("member")),
	},
	handler: async (ctx, { orgId, memberId, role }) => {
		const caller = await requireOrgMember(ctx, orgId, "admin");
		const target = await ctx.db.get(memberId);
		if (!target || target.orgId !== orgId) {
			throw new ConvexError("Member not found");
		}

		if (
			target._id === caller._id &&
			target.role === "admin" &&
			role !== "admin"
		) {
			const adminCount = await countAdmins(ctx, orgId);
			if (adminCount <= 1) {
				throw new ConvexError("Cannot demote the last admin");
			}
		}

		await ctx.db.patch(memberId, { role });
		await ctx.scheduler.runAfter(0, internal.organizations._pushClerkMembership, {
			orgId,
			clerkUserId: target.clerkUserId,
			role,
		});
	},
});

export const removeMember = mutation({
	args: {
		orgId: v.id("organizations"),
		memberId: v.id("organizationMembers"),
	},
	handler: async (ctx, { orgId, memberId }) => {
		const caller = await requireOrgMember(ctx, orgId, "admin");
		const target = await ctx.db.get(memberId);
		if (!target || target.orgId !== orgId) {
			throw new ConvexError("Member not found");
		}

		if (target._id === caller._id && target.role === "admin") {
			const adminCount = await countAdmins(ctx, orgId);
			if (adminCount <= 1) {
				throw new ConvexError("Cannot remove the last admin");
			}
		}

		await ctx.db.delete(memberId);
		await ctx.scheduler.runAfter(0, internal.organizations._pushClerkMembershipDelete, {
			orgId,
			clerkUserId: target.clerkUserId,
		});
	},
});

export const _pushClerkMembership = internalAction({
	args: {
		orgId: v.id("organizations"),
		clerkUserId: v.string(),
		role: v.union(v.literal("admin"), v.literal("member")),
	},
	handler: async (ctx, { orgId, clerkUserId, role }) => {
		const org: Doc<"organizations"> | null = await ctx.runQuery(
			internal.organizations._getOrgInternal,
			{ orgId },
		);
		if (!org) return;
		await clerkRequest(
			`/organizations/${org.clerkOrgId}/memberships/${clerkUserId}`,
			{
				method: "PATCH",
				body: { role: role === "admin" ? "org:admin" : "org:member" },
			},
		).catch(() => undefined);
	},
});

export const _pushClerkMembershipDelete = internalAction({
	args: {
		orgId: v.id("organizations"),
		clerkUserId: v.string(),
	},
	handler: async (ctx, { orgId, clerkUserId }) => {
		const org: Doc<"organizations"> | null = await ctx.runQuery(
			internal.organizations._getOrgInternal,
			{ orgId },
		);
		if (!org) return;
		await clerkRequest(
			`/organizations/${org.clerkOrgId}/memberships/${clerkUserId}`,
			{ method: "DELETE" },
		).catch(() => undefined);
	},
});

export const _getOrgInternal = internalQuery({
	args: { orgId: v.id("organizations") },
	handler: async (ctx, { orgId }) => {
		return await ctx.db.get(orgId);
	},
});

export const invite = action({
	args: {
		orgId: v.id("organizations"),
		email: v.string(),
		role: v.union(v.literal("admin"), v.literal("member")),
	},
	handler: async (ctx, { orgId, email, role }): Promise<{ id: string }> => {
		const ensured: { clerkOrgId: string; inviterClerkUserId: string } =
			await ctx.runMutation(internal.organizations._assertAdmin, { orgId });

		const invitation = (await clerkRequest(
			`/organizations/${ensured.clerkOrgId}/invitations`,
			{
				method: "POST",
				body: {
					email_address: email,
					role: role === "admin" ? "org:admin" : "org:member",
					inviter_user_id: ensured.inviterClerkUserId,
				},
			},
		)) as { id: string };

		return { id: invitation.id };
	},
});

export const _assertAdmin = internalMutation({
	args: { orgId: v.id("organizations") },
	handler: async (ctx, { orgId }) => {
		const membership = await requireOrgMember(ctx, orgId, "admin");
		const org = await ctx.db.get(orgId);
		if (!org) throw new ConvexError("Organization not found");
		return {
			clerkOrgId: org.clerkOrgId,
			inviterClerkUserId: membership.clerkUserId,
		};
	},
});

export const revokeInvite = action({
	args: {
		orgId: v.id("organizations"),
		invitationId: v.string(),
	},
	handler: async (ctx, { orgId, invitationId }): Promise<void> => {
		const ensured: { clerkOrgId: string; inviterClerkUserId: string } =
			await ctx.runMutation(internal.organizations._assertAdmin, { orgId });
		await clerkRequest(
			`/organizations/${ensured.clerkOrgId}/invitations/${invitationId}/revoke`,
			{
				method: "POST",
				body: { requesting_user_id: ensured.inviterClerkUserId },
			},
		);
	},
});

export const update = mutation({
	args: {
		orgId: v.id("organizations"),
		name: v.optional(v.string()),
		description: v.optional(v.string()),
	},
	handler: async (ctx, { orgId, name, description }) => {
		await requireOrgMember(ctx, orgId, "admin");
		const patch: Partial<Doc<"organizations">> = { updatedAt: Date.now() };
		if (name !== undefined) patch.name = name;
		if (description !== undefined) patch.description = description;
		await ctx.db.patch(orgId, patch);
	},
});

export const _syncOrgFromWebhook = internalMutation({
	args: {
		clerkOrgId: v.string(),
		name: v.string(),
		slug: v.string(),
	},
	handler: async (ctx, { clerkOrgId, name, slug }) => {
		const existing = await ctx.db
			.query("organizations")
			.withIndex("by_clerkOrgId", (q) => q.eq("clerkOrgId", clerkOrgId))
			.unique();
		const now = Date.now();
		if (existing) {
			await ctx.db.patch(existing._id, { name, slug, updatedAt: now });
			return existing._id;
		}
		return await ctx.db.insert("organizations", {
			name,
			slug,
			clerkOrgId,
			createdAt: now,
			updatedAt: now,
		});
	},
});

export const _deleteOrgFromWebhook = internalMutation({
	args: { clerkOrgId: v.string() },
	handler: async (ctx, { clerkOrgId }) => {
		const org = await ctx.db
			.query("organizations")
			.withIndex("by_clerkOrgId", (q) => q.eq("clerkOrgId", clerkOrgId))
			.unique();
		if (!org) return;
		const members = await ctx.db
			.query("organizationMembers")
			.withIndex("by_org", (q) => q.eq("orgId", org._id))
			.collect();
		for (const m of members) await ctx.db.delete(m._id);
		await ctx.db.delete(org._id);
	},
});

export const _syncMembershipFromWebhook = internalMutation({
	args: {
		clerkOrgId: v.string(),
		clerkUserId: v.string(),
		role: v.string(),
	},
	handler: async (ctx, { clerkOrgId, clerkUserId, role }) => {
		const org = await ctx.db
			.query("organizations")
			.withIndex("by_clerkOrgId", (q) => q.eq("clerkOrgId", clerkOrgId))
			.unique();
		if (!org) return;
		const user = await ctx.db
			.query("users")
			.withIndex("by_clerkId", (q) => q.eq("clerkId", clerkUserId))
			.unique();
		if (!user) return;

		const normalizedRole = role.includes("admin") ? "admin" : "member";

		const existing = await ctx.db
			.query("organizationMembers")
			.withIndex("by_org_clerkUser", (q) =>
				q.eq("orgId", org._id).eq("clerkUserId", clerkUserId),
			)
			.unique();
		if (existing) {
			await ctx.db.patch(existing._id, { role: normalizedRole });
			return existing._id;
		}
		return await ctx.db.insert("organizationMembers", {
			orgId: org._id,
			userId: user._id,
			clerkUserId,
			role: normalizedRole,
			createdAt: Date.now(),
		});
	},
});

export const _deleteMembershipFromWebhook = internalMutation({
	args: { clerkOrgId: v.string(), clerkUserId: v.string() },
	handler: async (ctx, { clerkOrgId, clerkUserId }) => {
		const org = await ctx.db
			.query("organizations")
			.withIndex("by_clerkOrgId", (q) => q.eq("clerkOrgId", clerkOrgId))
			.unique();
		if (!org) return;
		const membership = await ctx.db
			.query("organizationMembers")
			.withIndex("by_org_clerkUser", (q) =>
				q.eq("orgId", org._id).eq("clerkUserId", clerkUserId),
			)
			.unique();
		if (membership) await ctx.db.delete(membership._id);
	},
});

export { getCurrentUserOrThrow };
