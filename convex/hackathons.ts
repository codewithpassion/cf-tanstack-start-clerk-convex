import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireAuth } from "./auth";

function generateSlug(name: string): string {
	return name
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-|-$/g, "");
}

export const create = mutation({
	args: {
		name: v.string(),
		description: v.string(),
		theme: v.optional(v.string()),
		visibility: v.union(v.literal("public"), v.literal("private")),
		problemModerationMode: v.union(v.literal("auto"), v.literal("manual")),
		solutionModerationMode: v.union(v.literal("auto"), v.literal("manual")),
	},
	handler: async (ctx, args) => {
		const user = await requireAuth(ctx);
		const baseSlug = generateSlug(args.name);
		let slug = baseSlug;
		let suffix = 2;

		// Ensure unique slug
		while (true) {
			const existing = await ctx.db
				.query("hackathons")
				.withIndex("by_slug", (q) => q.eq("slug", slug))
				.unique();
			if (!existing) break;
			slug = `${baseSlug}-${suffix}`;
			suffix++;
		}

		const now = Date.now();
		const id = await ctx.db.insert("hackathons", {
			name: args.name,
			slug,
			description: args.description,
			theme: args.theme,
			ownerId: user.clerkId,
			status: "draft",
			visibility: args.visibility,
			problemModerationMode: args.problemModerationMode,
			solutionModerationMode: args.solutionModerationMode,
			galleryPublic: false,
			createdAt: now,
			updatedAt: now,
		});

		return id;
	},
});

export const update = mutation({
	args: {
		id: v.id("hackathons"),
		name: v.optional(v.string()),
		description: v.optional(v.string()),
		theme: v.optional(v.string()),
		visibility: v.optional(
			v.union(v.literal("public"), v.literal("private")),
		),
		problemModerationMode: v.optional(
			v.union(v.literal("auto"), v.literal("manual")),
		),
		solutionModerationMode: v.optional(
			v.union(v.literal("auto"), v.literal("manual")),
		),
		galleryPublic: v.optional(v.boolean()),
	},
	handler: async (ctx, args) => {
		const user = await requireAuth(ctx);
		const hackathon = await ctx.db.get(args.id);
		if (!hackathon) throw new ConvexError("Hackathon not found");

		// Check if owner or organiser
		const isOwner = hackathon.ownerId === user.clerkId;
		if (!isOwner) {
			const role = await ctx.db
				.query("hackathonRoles")
				.withIndex("by_hackathon_user", (q) =>
					q.eq("hackathonId", args.id).eq("userId", user.clerkId),
				)
				.unique();
			if (!role || role.role !== "organiser") {
				throw new ConvexError("Not authorized to update this hackathon");
			}
		}

		const { id, ...updates } = args;
		// Filter out undefined values
		const patch: Record<string, unknown> = { updatedAt: Date.now() };
		for (const [key, value] of Object.entries(updates)) {
			if (value !== undefined) {
				patch[key] = value;
			}
		}

		// Regenerate slug if name changed
		if (updates.name) {
			const baseSlug = generateSlug(updates.name);
			let slug = baseSlug;
			let suffix = 2;
			while (true) {
				const existing = await ctx.db
					.query("hackathons")
					.withIndex("by_slug", (q) => q.eq("slug", slug))
					.unique();
				if (!existing || existing._id === id) break;
				slug = `${baseSlug}-${suffix}`;
				suffix++;
			}
			patch.slug = slug;
		}

		await ctx.db.patch(id, patch);
	},
});

export const archive = mutation({
	args: { id: v.id("hackathons") },
	handler: async (ctx, args) => {
		const user = await requireAuth(ctx);
		const hackathon = await ctx.db.get(args.id);
		if (!hackathon) throw new ConvexError("Hackathon not found");
		if (hackathon.ownerId !== user.clerkId) {
			throw new ConvexError("Only the owner can archive this hackathon");
		}

		await ctx.db.patch(args.id, {
			status: "archived",
			archivedAt: Date.now(),
			archivedBy: user.clerkId,
			updatedAt: Date.now(),
		});
	},
});

export const remove = mutation({
	args: { id: v.id("hackathons") },
	handler: async (ctx, args) => {
		const user = await requireAuth(ctx);
		const hackathon = await ctx.db.get(args.id);
		if (!hackathon) throw new ConvexError("Hackathon not found");
		if (hackathon.ownerId !== user.clerkId) {
			throw new ConvexError("Only the owner can delete this hackathon");
		}

		await ctx.db.delete(args.id);
	},
});

export const getById = query({
	args: { id: v.id("hackathons") },
	handler: async (ctx, args) => {
		return await ctx.db.get(args.id);
	},
});

export const getBySlug = query({
	args: { slug: v.string() },
	handler: async (ctx, args) => {
		const hackathon = await ctx.db
			.query("hackathons")
			.withIndex("by_slug", (q) => q.eq("slug", args.slug))
			.unique();

		if (!hackathon) return null;

		// If private, check if the current user is a member
		if (hackathon.visibility === "private") {
			const identity = await ctx.auth.getUserIdentity();
			if (!identity) return null;
			const clerkId = identity.subject;
			if (hackathon.ownerId === clerkId) return hackathon;

			const role = await ctx.db
				.query("hackathonRoles")
				.withIndex("by_hackathon_user", (q) =>
					q.eq("hackathonId", hackathon._id).eq("userId", clerkId),
				)
				.unique();
			if (!role) return null;
		}

		return hackathon;
	},
});

export const listMyHackathons = query({
	args: {},
	handler: async (ctx) => {
		const user = await requireAuth(ctx);
		return await ctx.db
			.query("hackathons")
			.withIndex("by_owner", (q) => q.eq("ownerId", user.clerkId))
			.collect();
	},
});

export const listPublic = query({
	args: { search: v.optional(v.string()) },
	handler: async (ctx, args) => {
		let hackathons = await ctx.db
			.query("hackathons")
			.withIndex("by_visibility", (q) => q.eq("visibility", "public"))
			.collect();

		// Filter out archived
		hackathons = hackathons.filter((h) => h.status !== "archived");

		// Filter by search term
		if (args.search) {
			const searchLower = args.search.toLowerCase();
			hackathons = hackathons.filter(
				(h) =>
					h.name.toLowerCase().includes(searchLower) ||
					h.description.toLowerCase().includes(searchLower),
			);
		}

		// Sort newest first
		hackathons.sort((a, b) => b.createdAt - a.createdAt);

		return hackathons;
	},
});

export const updateStatus = mutation({
	args: {
		id: v.id("hackathons"),
		status: v.union(
			v.literal("draft"),
			v.literal("open"),
			v.literal("active"),
			v.literal("judging"),
			v.literal("closed"),
			v.literal("archived"),
		),
	},
	handler: async (ctx, args) => {
		const user = await requireAuth(ctx);
		const hackathon = await ctx.db.get(args.id);
		if (!hackathon) throw new ConvexError("Hackathon not found");
		if (hackathon.ownerId !== user.clerkId) {
			throw new ConvexError("Only the owner can change status");
		}

		const patch: Record<string, unknown> = {
			status: args.status,
			updatedAt: Date.now(),
		};

		if (args.status === "archived") {
			patch.archivedAt = Date.now();
			patch.archivedBy = user.clerkId;
		}

		await ctx.db.patch(args.id, patch);
	},
});

export const updateContent = mutation({
	args: {
		id: v.id("hackathons"),
		sponsorsContent: v.optional(v.string()),
		prizesContent: v.optional(v.string()),
		rulesContent: v.optional(v.string()),
		eligibilityContent: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		const user = await requireAuth(ctx);
		const hackathon = await ctx.db.get(args.id);
		if (!hackathon) throw new ConvexError("Hackathon not found");

		const isOwner = hackathon.ownerId === user.clerkId;
		if (!isOwner) {
			const role = await ctx.db
				.query("hackathonRoles")
				.withIndex("by_hackathon_user", (q) =>
					q.eq("hackathonId", args.id).eq("userId", user.clerkId),
				)
				.unique();
			if (!role || role.role !== "organiser") {
				throw new ConvexError("Not authorized to update content");
			}
		}

		const { id, ...updates } = args;
		const patch: Record<string, unknown> = { updatedAt: Date.now() };
		for (const [key, value] of Object.entries(updates)) {
			if (value !== undefined) {
				patch[key] = value;
			}
		}

		await ctx.db.patch(id, patch);
	},
});

export const updateDates = mutation({
	args: {
		id: v.id("hackathons"),
		startDate: v.optional(v.number()),
		endDate: v.optional(v.number()),
		submissionCutoff: v.optional(v.number()),
	},
	handler: async (ctx, args) => {
		const user = await requireAuth(ctx);
		const hackathon = await ctx.db.get(args.id);
		if (!hackathon) throw new ConvexError("Hackathon not found");

		const isOwner = hackathon.ownerId === user.clerkId;
		if (!isOwner) {
			const role = await ctx.db
				.query("hackathonRoles")
				.withIndex("by_hackathon_user", (q) =>
					q.eq("hackathonId", args.id).eq("userId", user.clerkId),
				)
				.unique();
			if (!role || role.role !== "organiser") {
				throw new ConvexError("Not authorized to update dates");
			}
		}

		const { id, ...updates } = args;
		const patch: Record<string, unknown> = { updatedAt: Date.now() };
		for (const [key, value] of Object.entries(updates)) {
			if (value !== undefined) {
				patch[key] = value;
			}
		}

		await ctx.db.patch(id, patch);
	},
});
