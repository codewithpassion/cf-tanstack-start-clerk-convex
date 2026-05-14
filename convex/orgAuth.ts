import { ConvexError } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";

export type OrgRole = "admin" | "member";

export async function requireOrgMember(
	ctx: QueryCtx | MutationCtx,
	orgId: Id<"organizations">,
	requiredRole?: OrgRole,
): Promise<Doc<"organizationMembers">> {
	const identity = await ctx.auth.getUserIdentity();
	if (!identity) {
		throw new ConvexError("Forbidden");
	}

	const membership = await ctx.db
		.query("organizationMembers")
		.withIndex("by_org_clerkUser", (q) =>
			q.eq("orgId", orgId).eq("clerkUserId", identity.subject),
		)
		.unique();

	if (!membership) {
		throw new ConvexError("Forbidden");
	}

	if (requiredRole === "admin" && membership.role !== "admin") {
		throw new ConvexError("Forbidden");
	}

	return membership;
}

export async function getOrgMembership(
	ctx: QueryCtx | MutationCtx,
	orgId: Id<"organizations">,
): Promise<Doc<"organizationMembers"> | null> {
	const identity = await ctx.auth.getUserIdentity();
	if (!identity) return null;

	return await ctx.db
		.query("organizationMembers")
		.withIndex("by_org_clerkUser", (q) =>
			q.eq("orgId", orgId).eq("clerkUserId", identity.subject),
		)
		.unique();
}
