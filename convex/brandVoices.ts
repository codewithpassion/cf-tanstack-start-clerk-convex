/**
 * Convex queries and mutations for brand voice management.
 * Handles brand voice CRUD operations with soft delete support and file attachment.
 */
import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { authorizeWorkspaceAccess } from "./lib/auth";

/**
 * Validation constants for brand voice fields.
 */
const BRAND_VOICE_NAME_MAX_LENGTH = 100;
const BRAND_VOICE_DESCRIPTION_MAX_LENGTH = 5000;

/**
 * Validate brand voice name.
 * @throws ConvexError if name is invalid
 */
function validateBrandVoiceName(name: string): string {
	const trimmed = name.trim();
	if (!trimmed) {
		throw new ConvexError("Brand voice name is required");
	}
	if (trimmed.length > BRAND_VOICE_NAME_MAX_LENGTH) {
		throw new ConvexError(`Brand voice name must be ${BRAND_VOICE_NAME_MAX_LENGTH} characters or less`);
	}
	return trimmed;
}

/**
 * Validate brand voice description.
 * @throws ConvexError if description is invalid
 */
function validateBrandVoiceDescription(description: string | undefined): string | undefined {
	if (!description) {
		return undefined;
	}
	const trimmed = description.trim();
	if (trimmed.length > BRAND_VOICE_DESCRIPTION_MAX_LENGTH) {
		throw new ConvexError(`Brand voice description must be ${BRAND_VOICE_DESCRIPTION_MAX_LENGTH} characters or less`);
	}
	return trimmed || undefined;
}

/**
 * List all non-deleted brand voices for a project.
 * Returns brand voices sorted by createdAt descending (newest first).
 */
export const listBrandVoices = query({
	args: {
		projectId: v.id("projects"),
	},
	handler: async (ctx, { projectId }) => {
		const { workspace } = await authorizeWorkspaceAccess(ctx);

		// Verify project exists and belongs to workspace
		const project = await ctx.db.get(projectId);
		if (!project || project.workspaceId !== workspace._id || project.deletedAt) {
			throw new ConvexError("Project not found");
		}

		const brandVoices = await ctx.db
			.query("brandVoices")
			.withIndex("by_projectId", (q) => q.eq("projectId", projectId))
			.collect();

		// Filter out soft-deleted brand voices and sort by createdAt descending
		return brandVoices
			.filter((bv) => !bv.deletedAt)
			.sort((a, b) => b.createdAt - a.createdAt);
	},
});

/**
 * Get a single brand voice by ID with authorization check.
 * Returns the brand voice if it exists, is not deleted, and belongs to the user's workspace.
 */
export const getBrandVoice = query({
	args: {
		brandVoiceId: v.id("brandVoices"),
	},
	handler: async (ctx, { brandVoiceId }) => {
		const { workspace } = await authorizeWorkspaceAccess(ctx);

		const brandVoice = await ctx.db.get(brandVoiceId);

		if (!brandVoice) {
			throw new ConvexError("Brand voice not found");
		}

		// Verify brand voice belongs to user's workspace via project
		const project = await ctx.db.get(brandVoice.projectId);
		if (!project || project.workspaceId !== workspace._id) {
			throw new ConvexError("Brand voice not found");
		}

		if (brandVoice.deletedAt) {
			throw new ConvexError("Brand voice not found");
		}

		return brandVoice;
	},
});

/**
 * Get all files attached to a brand voice.
 * Returns files with metadata and extracted text.
 */
export const getBrandVoiceFiles = query({
	args: {
		brandVoiceId: v.id("brandVoices"),
	},
	handler: async (ctx, { brandVoiceId }) => {
		const { workspace } = await authorizeWorkspaceAccess(ctx);

		// Verify brand voice exists and belongs to user's workspace
		const brandVoice = await ctx.db.get(brandVoiceId);
		if (!brandVoice) {
			throw new ConvexError("Brand voice not found");
		}

		const project = await ctx.db.get(brandVoice.projectId);
		if (!project || project.workspaceId !== workspace._id) {
			throw new ConvexError("Brand voice not found");
		}

		if (brandVoice.deletedAt) {
			throw new ConvexError("Brand voice not found");
		}

		// Get all files for this brand voice
		const files = await ctx.db
			.query("files")
			.withIndex("by_brandVoiceId", (q) => q.eq("brandVoiceId", brandVoiceId))
			.collect();

		return files;
	},
});

/**
 * Create a new brand voice.
 * Creates the brand voice with the specified name and optional description.
 */
export const createBrandVoice = mutation({
	args: {
		projectId: v.id("projects"),
		name: v.string(),
		description: v.optional(v.string()),
	},
	handler: async (ctx, { projectId, name, description }) => {
		const { workspace } = await authorizeWorkspaceAccess(ctx);

		// Verify project exists and belongs to workspace
		const project = await ctx.db.get(projectId);
		if (!project || project.workspaceId !== workspace._id) {
			throw new ConvexError("Project not found");
		}

		if (project.deletedAt) {
			throw new ConvexError("Cannot add brand voice to a deleted project");
		}

		// Validate inputs
		const validatedName = validateBrandVoiceName(name);
		const validatedDescription = validateBrandVoiceDescription(description);

		const now = Date.now();

		// Create the brand voice
		const brandVoiceId = await ctx.db.insert("brandVoices", {
			projectId,
			name: validatedName,
			description: validatedDescription,
			createdAt: now,
			updatedAt: now,
		});

		return { brandVoiceId };
	},
});

/**
 * Update an existing brand voice.
 * Updates the specified fields and sets updatedAt to current timestamp.
 */
export const updateBrandVoice = mutation({
	args: {
		brandVoiceId: v.id("brandVoices"),
		name: v.optional(v.string()),
		description: v.optional(v.string()),
	},
	handler: async (ctx, { brandVoiceId, name, description }) => {
		const { workspace } = await authorizeWorkspaceAccess(ctx);

		// Verify brand voice exists and belongs to workspace
		const brandVoice = await ctx.db.get(brandVoiceId);
		if (!brandVoice) {
			throw new ConvexError("Brand voice not found");
		}

		const project = await ctx.db.get(brandVoice.projectId);
		if (!project || project.workspaceId !== workspace._id) {
			throw new ConvexError("Brand voice not found");
		}

		if (brandVoice.deletedAt) {
			throw new ConvexError("Cannot update a deleted brand voice");
		}

		// Build update object with only provided fields
		const updates: {
			name?: string;
			description?: string;
			updatedAt: number;
		} = {
			updatedAt: Date.now(),
		};

		if (name !== undefined) {
			updates.name = validateBrandVoiceName(name);
		}

		if (description !== undefined) {
			updates.description = validateBrandVoiceDescription(description);
		}

		await ctx.db.patch(brandVoiceId, updates);

		return { success: true };
	},
});

/**
 * Soft delete a brand voice and hard delete associated files.
 * Sets deletedAt timestamp on brand voice and removes file records and R2 objects.
 */
export const deleteBrandVoice = mutation({
	args: {
		brandVoiceId: v.id("brandVoices"),
	},
	handler: async (ctx, { brandVoiceId }) => {
		const { workspace } = await authorizeWorkspaceAccess(ctx);

		// Verify brand voice exists and belongs to workspace
		const brandVoice = await ctx.db.get(brandVoiceId);
		if (!brandVoice) {
			throw new ConvexError("Brand voice not found");
		}

		const project = await ctx.db.get(brandVoice.projectId);
		if (!project || project.workspaceId !== workspace._id) {
			throw new ConvexError("Brand voice not found");
		}

		if (brandVoice.deletedAt) {
			throw new ConvexError("Brand voice is already deleted");
		}

		// Get all associated files for deletion
		const files = await ctx.db
			.query("files")
			.withIndex("by_brandVoiceId", (q) => q.eq("brandVoiceId", brandVoiceId))
			.collect();

		// Collect R2 keys for deletion by caller
		const r2Keys = files.map((file) => file.r2Key);

		// Hard delete all associated files
		for (const file of files) {
			await ctx.db.delete(file._id);
		}

		// Soft delete the brand voice by setting deletedAt timestamp
		const now = Date.now();
		await ctx.db.patch(brandVoiceId, {
			deletedAt: now,
			updatedAt: now,
		});

		// Return R2 keys so caller can delete from R2 storage
		return { success: true, r2Keys };
	},
});
