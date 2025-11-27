/**
 * Convex mutations and queries for file management.
 * Handles file record creation, updates, and ownership verification.
 */
import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { authorizeWorkspaceAccess } from "./lib/auth";

// File owner types
const fileOwnerTypes = v.union(
	v.literal("brandVoice"),
	v.literal("persona"),
	v.literal("knowledgeBaseItem"),
	v.literal("example"),
);

/**
 * Verify that the user owns the entity that the file belongs to.
 */
async function verifyFileOwnership(
	ctx: QueryCtx | MutationCtx,
	workspaceId: Id<"workspaces">,
	ownerType: string,
	ownerId: string,
): Promise<boolean> {
	// Based on owner type, trace back to workspace
	switch (ownerType) {
		case "brandVoice": {
			const brandVoice = await ctx.db.get(ownerId as Id<"brandVoices">);
			if (!brandVoice) return false;

			const project = await ctx.db.get(brandVoice.projectId);
			if (!project) return false;

			return project.workspaceId === workspaceId;
		}
		case "persona": {
			const persona = await ctx.db.get(ownerId as Id<"personas">);
			if (!persona) return false;

			const project = await ctx.db.get(persona.projectId);
			if (!project) return false;

			return project.workspaceId === workspaceId;
		}
		case "knowledgeBaseItem": {
			const item = await ctx.db.get(ownerId as Id<"knowledgeBaseItems">);
			if (!item) return false;

			const project = await ctx.db.get(item.projectId);
			if (!project) return false;

			return project.workspaceId === workspaceId;
		}
		case "example": {
			const example = await ctx.db.get(ownerId as Id<"examples">);
			if (!example) return false;

			const project = await ctx.db.get(example.projectId);
			if (!project) return false;

			return project.workspaceId === workspaceId;
		}
		default:
			return false;
	}
}

/**
 * Create a new file record after upload is confirmed.
 */
export const createFile = mutation({
	args: {
		ownerType: fileOwnerTypes,
		ownerId: v.string(),
		filename: v.string(),
		mimeType: v.string(),
		sizeBytes: v.number(),
		r2Key: v.string(),
		extractedText: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		const { workspace } = await authorizeWorkspaceAccess(ctx);

		// Verify ownership
		const isOwner = await verifyFileOwnership(
			ctx,
			workspace._id,
			args.ownerType,
			args.ownerId,
		);

		if (!isOwner) {
			throw new ConvexError("You do not have permission to add files to this entity");
		}

		// Build the file record with the appropriate owner field
		const fileData: {
			brandVoiceId?: Id<"brandVoices">;
			personaId?: Id<"personas">;
			knowledgeBaseItemId?: Id<"knowledgeBaseItems">;
			exampleId?: Id<"examples">;
			filename: string;
			mimeType: string;
			sizeBytes: number;
			r2Key: string;
			extractedText?: string;
			createdAt: number;
		} = {
			filename: args.filename,
			mimeType: args.mimeType,
			sizeBytes: args.sizeBytes,
			r2Key: args.r2Key,
			createdAt: Date.now(),
		};

		if (args.extractedText) {
			fileData.extractedText = args.extractedText;
		}

		// Set the appropriate owner field
		switch (args.ownerType) {
			case "brandVoice":
				fileData.brandVoiceId = args.ownerId as Id<"brandVoices">;
				break;
			case "persona":
				fileData.personaId = args.ownerId as Id<"personas">;
				break;
			case "knowledgeBaseItem":
				fileData.knowledgeBaseItemId = args.ownerId as Id<"knowledgeBaseItems">;
				break;
			case "example":
				fileData.exampleId = args.ownerId as Id<"examples">;
				break;
		}

		const fileId = await ctx.db.insert("files", fileData);
		return fileId;
	},
});

/**
 * Update extracted text for a file.
 */
export const updateExtractedText = mutation({
	args: {
		fileId: v.id("files"),
		extractedText: v.string(),
	},
	handler: async (ctx, { fileId, extractedText }) => {
		const { workspace } = await authorizeWorkspaceAccess(ctx);

		// Get the file
		const file = await ctx.db.get(fileId);
		if (!file) {
			throw new ConvexError("File not found");
		}

		// Verify ownership through the file's owner
		let isOwner = false;
		if (file.brandVoiceId) {
			isOwner = await verifyFileOwnership(ctx, workspace._id, "brandVoice", file.brandVoiceId);
		} else if (file.personaId) {
			isOwner = await verifyFileOwnership(ctx, workspace._id, "persona", file.personaId);
		} else if (file.knowledgeBaseItemId) {
			isOwner = await verifyFileOwnership(ctx, workspace._id, "knowledgeBaseItem", file.knowledgeBaseItemId);
		} else if (file.exampleId) {
			isOwner = await verifyFileOwnership(ctx, workspace._id, "example", file.exampleId);
		}

		if (!isOwner) {
			throw new ConvexError("You do not have permission to update this file");
		}

		await ctx.db.patch(fileId, { extractedText });
		return { success: true };
	},
});

/**
 * Get a file by ID with ownership verification.
 */
export const getFile = query({
	args: {
		fileId: v.id("files"),
	},
	handler: async (ctx, { fileId }) => {
		const { workspace } = await authorizeWorkspaceAccess(ctx);

		const file = await ctx.db.get(fileId);
		if (!file) {
			return null;
		}

		// Verify ownership
		let isOwner = false;
		if (file.brandVoiceId) {
			isOwner = await verifyFileOwnership(ctx, workspace._id, "brandVoice", file.brandVoiceId);
		} else if (file.personaId) {
			isOwner = await verifyFileOwnership(ctx, workspace._id, "persona", file.personaId);
		} else if (file.knowledgeBaseItemId) {
			isOwner = await verifyFileOwnership(ctx, workspace._id, "knowledgeBaseItem", file.knowledgeBaseItemId);
		} else if (file.exampleId) {
			isOwner = await verifyFileOwnership(ctx, workspace._id, "example", file.exampleId);
		}

		if (!isOwner) {
			throw new ConvexError("You do not have permission to access this file");
		}

		return file;
	},
});

/**
 * Get file by R2 key (for internal use during upload confirmation).
 */
export const getFileByR2Key = query({
	args: {
		r2Key: v.string(),
	},
	handler: async (ctx, { r2Key }) => {
		const file = await ctx.db
			.query("files")
			.withIndex("by_r2Key", (q) => q.eq("r2Key", r2Key))
			.unique();

		return file;
	},
});

/**
 * Delete a file record (hard delete).
 */
export const deleteFile = mutation({
	args: {
		fileId: v.id("files"),
	},
	handler: async (ctx, { fileId }) => {
		const { workspace } = await authorizeWorkspaceAccess(ctx);

		const file = await ctx.db.get(fileId);
		if (!file) {
			throw new ConvexError("File not found");
		}

		// Verify ownership
		let isOwner = false;
		if (file.brandVoiceId) {
			isOwner = await verifyFileOwnership(ctx, workspace._id, "brandVoice", file.brandVoiceId);
		} else if (file.personaId) {
			isOwner = await verifyFileOwnership(ctx, workspace._id, "persona", file.personaId);
		} else if (file.knowledgeBaseItemId) {
			isOwner = await verifyFileOwnership(ctx, workspace._id, "knowledgeBaseItem", file.knowledgeBaseItemId);
		} else if (file.exampleId) {
			isOwner = await verifyFileOwnership(ctx, workspace._id, "example", file.exampleId);
		}

		if (!isOwner) {
			throw new ConvexError("You do not have permission to delete this file");
		}

		await ctx.db.delete(fileId);

		// Return r2Key so caller can delete from R2
		return { r2Key: file.r2Key };
	},
});

/**
 * Get the workspace ID for a given owner entity.
 * Used by server functions to generate R2 keys.
 */
export const getWorkspaceIdForOwner = query({
	args: {
		ownerType: fileOwnerTypes,
		ownerId: v.string(),
	},
	handler: async (ctx, { ownerType, ownerId }) => {
		const { workspace } = await authorizeWorkspaceAccess(ctx);

		// Verify ownership
		const isOwner = await verifyFileOwnership(
			ctx,
			workspace._id,
			ownerType,
			ownerId,
		);

		if (!isOwner) {
			throw new ConvexError("You do not have permission to access this entity");
		}

		return workspace._id;
	},
});
