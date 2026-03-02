import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireAuth } from "./auth";

export const getMyProfile = query({
	args: {},
	handler: async (ctx) => {
		const user = await requireAuth(ctx);

		const profile = await ctx.db
			.query("userProfiles")
			.withIndex("by_user", (q) => q.eq("userId", user.clerkId))
			.unique();

		return profile ?? null;
	},
});

export const getProfile = query({
	args: { userId: v.string() },
	handler: async (ctx, args) => {
		const profile = await ctx.db
			.query("userProfiles")
			.withIndex("by_user", (q) => q.eq("userId", args.userId))
			.unique();

		return profile ?? null;
	},
});

export const updateProfile = mutation({
	args: {
		bio: v.optional(v.string()),
		location: v.optional(v.string()),
		skills: v.optional(v.array(v.string())),
		githubUrl: v.optional(v.string()),
		linkedinUrl: v.optional(v.string()),
		portfolioUrl: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		const user = await requireAuth(ctx);

		const existing = await ctx.db
			.query("userProfiles")
			.withIndex("by_user", (q) => q.eq("userId", user.clerkId))
			.unique();

		const data = {
			userId: user.clerkId,
			bio: args.bio,
			location: args.location,
			skills: args.skills,
			githubUrl: args.githubUrl,
			linkedinUrl: args.linkedinUrl,
			portfolioUrl: args.portfolioUrl,
			updatedAt: Date.now(),
		};

		if (existing) {
			await ctx.db.patch(existing._id, data);
		} else {
			await ctx.db.insert("userProfiles", data);
		}
	},
});
