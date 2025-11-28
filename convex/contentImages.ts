/**
 * Convex queries and mutations for content image management.
 * Handles attaching images to content pieces, caption editing, reordering, and detaching.
 */
import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { authorizeWorkspaceAccess } from "./lib/auth";

/**
 * Validation constants for content image fields.
 */
const CONTENT_IMAGE_CAPTION_MAX_LENGTH = 500;

/**
 * Validate content image caption if provided.
 * @throws ConvexError if caption is invalid
 */
function validateContentImageCaption(caption?: string): string | undefined {
	if (!caption) {
		return undefined;
	}

	const trimmed = caption.trim();
	if (trimmed.length > CONTENT_IMAGE_CAPTION_MAX_LENGTH) {
		throw new ConvexError(
			`Content image caption must be ${CONTENT_IMAGE_CAPTION_MAX_LENGTH} characters or less`
		);
	}

	return trimmed || undefined;
}

/**
 * List all images attached to a content piece.
 * Returns images ordered by sortOrder ascending with file metadata.
 */
export const listContentImages = query({
	args: {
		contentPieceId: v.id("contentPieces"),
	},
	handler: async (ctx, { contentPieceId }) => {
		const { workspace } = await authorizeWorkspaceAccess(ctx);

		// Verify content piece exists and belongs to workspace
		const contentPiece = await ctx.db.get(contentPieceId);
		if (!contentPiece) {
			throw new ConvexError("Content piece not found");
		}

		const project = await ctx.db.get(contentPiece.projectId);
		if (!project || project.workspaceId !== workspace._id) {
			throw new ConvexError("Content piece not found");
		}

		if (contentPiece.deletedAt) {
			throw new ConvexError("Content piece not found");
		}

		// Query all images for this content piece
		const images = await ctx.db
			.query("contentImages")
			.withIndex("by_contentPieceId", (q) => q.eq("contentPieceId", contentPieceId))
			.collect();

		// Sort by sortOrder ascending
		images.sort((a, b) => a.sortOrder - b.sortOrder);

		// Fetch file metadata for each image
		const imagesWithFiles = await Promise.all(
			images.map(async (image) => {
				const file = await ctx.db.get(image.fileId);
				return {
					...image,
					file: file
						? {
								_id: file._id,
								filename: file.filename,
								mimeType: file.mimeType,
								sizeBytes: file.sizeBytes,
								r2Key: file.r2Key,
								createdAt: file.createdAt,
							}
						: null,
				};
			})
		);

		return imagesWithFiles;
	},
});

/**
 * Attach an image to a content piece.
 * Creates a new content image record with the next available sortOrder.
 */
export const attachImage = mutation({
	args: {
		contentPieceId: v.id("contentPieces"),
		fileId: v.id("files"),
		caption: v.optional(v.string()),
		generatedPrompt: v.optional(v.string()),
	},
	handler: async (
		ctx,
		{ contentPieceId, fileId, caption, generatedPrompt }
	) => {
		const { workspace } = await authorizeWorkspaceAccess(ctx);

		// Verify content piece exists and belongs to workspace
		const contentPiece = await ctx.db.get(contentPieceId);
		if (!contentPiece) {
			throw new ConvexError("Content piece not found");
		}

		const project = await ctx.db.get(contentPiece.projectId);
		if (!project || project.workspaceId !== workspace._id) {
			throw new ConvexError("Content piece not found");
		}

		if (contentPiece.deletedAt) {
			throw new ConvexError("Cannot attach image to a deleted content piece");
		}

		// Verify file exists
		const file = await ctx.db.get(fileId);
		if (!file) {
			throw new ConvexError("File not found");
		}

		// Verify file is an image (basic MIME type check)
		if (!file.mimeType.startsWith("image/")) {
			throw new ConvexError("File must be an image");
		}

		// Validate caption
		const validatedCaption = validateContentImageCaption(caption);

		// Get current images to determine next sortOrder
		const existingImages = await ctx.db
			.query("contentImages")
			.withIndex("by_contentPieceId", (q) => q.eq("contentPieceId", contentPieceId))
			.collect();

		// Calculate next sortOrder (max + 1, or 1 if no images)
		const nextSortOrder = existingImages.length > 0
			? Math.max(...existingImages.map((img) => img.sortOrder)) + 1
			: 1;

		const now = Date.now();

		// Create the content image record
		const contentImageId = await ctx.db.insert("contentImages", {
			contentPieceId,
			fileId,
			caption: validatedCaption,
			sortOrder: nextSortOrder,
			generatedPrompt,
			createdAt: now,
		});

		return { contentImageId };
	},
});

/**
 * Update the caption of an existing content image.
 */
export const updateImageCaption = mutation({
	args: {
		contentImageId: v.id("contentImages"),
		caption: v.optional(v.string()),
	},
	handler: async (ctx, { contentImageId, caption }) => {
		const { workspace } = await authorizeWorkspaceAccess(ctx);

		// Verify content image exists
		const contentImage = await ctx.db.get(contentImageId);
		if (!contentImage) {
			throw new ConvexError("Content image not found");
		}

		// Verify ownership via content piece
		const contentPiece = await ctx.db.get(contentImage.contentPieceId);
		if (!contentPiece) {
			throw new ConvexError("Content image not found");
		}

		const project = await ctx.db.get(contentPiece.projectId);
		if (!project || project.workspaceId !== workspace._id) {
			throw new ConvexError("Content image not found");
		}

		if (contentPiece.deletedAt) {
			throw new ConvexError("Cannot update image for a deleted content piece");
		}

		// Validate caption
		const validatedCaption = validateContentImageCaption(caption);

		// Update the caption
		await ctx.db.patch(contentImageId, {
			caption: validatedCaption,
		});

		return { success: true };
	},
});

/**
 * Reorder images for a content piece.
 * Updates sortOrder for each image based on array position.
 */
export const reorderImages = mutation({
	args: {
		contentPieceId: v.id("contentPieces"),
		imageIds: v.array(v.id("contentImages")),
	},
	handler: async (ctx, { contentPieceId, imageIds }) => {
		const { workspace } = await authorizeWorkspaceAccess(ctx);

		// Verify content piece exists and belongs to workspace
		const contentPiece = await ctx.db.get(contentPieceId);
		if (!contentPiece) {
			throw new ConvexError("Content piece not found");
		}

		const project = await ctx.db.get(contentPiece.projectId);
		if (!project || project.workspaceId !== workspace._id) {
			throw new ConvexError("Content piece not found");
		}

		if (contentPiece.deletedAt) {
			throw new ConvexError("Cannot reorder images for a deleted content piece");
		}

		// Verify all images belong to this content piece
		const images = await Promise.all(
			imageIds.map((imageId) => ctx.db.get(imageId))
		);

		for (const image of images) {
			if (!image) {
				throw new ConvexError("One or more images not found");
			}
			if (image.contentPieceId !== contentPieceId) {
				throw new ConvexError("All images must belong to the specified content piece");
			}
		}

		// Update sortOrder for each image based on position in array
		await Promise.all(
			imageIds.map((imageId, index) =>
				ctx.db.patch(imageId, {
					sortOrder: index + 1, // 1-indexed
				})
			)
		);

		return { success: true };
	},
});

/**
 * Detach an image from a content piece.
 * Removes the content image record. The file remains in storage.
 */
export const detachImage = mutation({
	args: {
		contentImageId: v.id("contentImages"),
	},
	handler: async (ctx, { contentImageId }) => {
		const { workspace } = await authorizeWorkspaceAccess(ctx);

		// Verify content image exists
		const contentImage = await ctx.db.get(contentImageId);
		if (!contentImage) {
			throw new ConvexError("Content image not found");
		}

		// Verify ownership via content piece
		const contentPiece = await ctx.db.get(contentImage.contentPieceId);
		if (!contentPiece) {
			throw new ConvexError("Content image not found");
		}

		const project = await ctx.db.get(contentPiece.projectId);
		if (!project || project.workspaceId !== workspace._id) {
			throw new ConvexError("Content image not found");
		}

		if (contentPiece.deletedAt) {
			throw new ConvexError("Cannot detach image from a deleted content piece");
		}

		// Delete the content image record
		await ctx.db.delete(contentImageId);

		return { success: true };
	},
});
