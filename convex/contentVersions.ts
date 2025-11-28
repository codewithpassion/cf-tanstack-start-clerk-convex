/**
 * Convex queries and mutations for content version control.
 * Handles version creation, retrieval, pagination, restore, and finalized version tracking.
 */
import { ConvexError, v } from "convex/values";
import { internalMutation, mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { authorizeWorkspaceAccess } from "./lib/auth";

/**
 * Validation constants for content version fields.
 */
const CONTENT_VERSION_LABEL_MAX_LENGTH = 100;
const CONTENT_VERSION_CONTENT_MAX_LENGTH = 500000;

/**
 * Default pagination limit for version history (spec requirement).
 */
const DEFAULT_VERSION_LIMIT = 50;

/**
 * Validate version label if provided.
 * @throws ConvexError if label is invalid
 */
function validateVersionLabel(label: string): string {
	const trimmed = label.trim();
	if (trimmed.length > CONTENT_VERSION_LABEL_MAX_LENGTH) {
		throw new ConvexError(
			`Version label must be ${CONTENT_VERSION_LABEL_MAX_LENGTH} characters or less`
		);
	}
	return trimmed;
}

/**
 * Validate version content.
 * @throws ConvexError if content is invalid
 */
function validateVersionContent(content: string): string {
	if (!content) {
		throw new ConvexError("Version content is required");
	}
	if (content.length > CONTENT_VERSION_CONTENT_MAX_LENGTH) {
		throw new ConvexError(
			`Version content must be ${CONTENT_VERSION_CONTENT_MAX_LENGTH} characters or less`
		);
	}
	return content;
}

/**
 * Create a new content version (internal mutation).
 * Called automatically when content is saved or finalized.
 * Auto-increments versionNumber based on existing versions.
 */
export const createVersion = internalMutation({
	args: {
		contentPieceId: v.id("contentPieces"),
		content: v.string(),
		label: v.optional(v.string()),
		isFinalizedVersion: v.optional(v.boolean()),
		finalizedVersionNumber: v.optional(v.number()),
	},
	handler: async (
		ctx,
		{ contentPieceId, content, label, isFinalizedVersion, finalizedVersionNumber }
	) => {
		// Validate content
		const validatedContent = validateVersionContent(content);

		// Validate label if provided
		const validatedLabel = label ? validateVersionLabel(label) : undefined;

		// Get existing versions to calculate next version number
		const existingVersions = await ctx.db
			.query("contentVersions")
			.withIndex("by_contentPieceId", (q) => q.eq("contentPieceId", contentPieceId))
			.collect();

		const nextVersionNumber = existingVersions.length + 1;

		const now = Date.now();

		// Create the version
		const versionId = await ctx.db.insert("contentVersions", {
			contentPieceId,
			versionNumber: nextVersionNumber,
			content: validatedContent,
			label: validatedLabel,
			isFinalizedVersion: isFinalizedVersion ?? false,
			finalizedVersionNumber,
			createdAt: now,
		});

		return { versionId, versionNumber: nextVersionNumber };
	},
});

/**
 * List versions for a content piece with pagination.
 * Returns versions ordered by versionNumber descending (most recent first).
 * Defaults to 50 most recent versions with offset support for older versions.
 */
export const listVersions = query({
	args: {
		contentPieceId: v.id("contentPieces"),
		limit: v.optional(v.number()),
		offset: v.optional(v.number()),
	},
	handler: async (ctx, { contentPieceId, limit, offset }) => {
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

		// Query all versions for this content piece
		let versions = await ctx.db
			.query("contentVersions")
			.withIndex("by_contentPieceId", (q) => q.eq("contentPieceId", contentPieceId))
			.collect();

		// Sort by versionNumber descending (most recent first)
		versions.sort((a, b) => b.versionNumber - a.versionNumber);

		// Get total count before pagination
		const totalCount = versions.length;

		// Apply pagination (default limit 50, offset 0)
		const pageLimit = limit ?? DEFAULT_VERSION_LIMIT;
		const pageOffset = offset ?? 0;
		versions = versions.slice(pageOffset, pageOffset + pageLimit);

		return {
			versions,
			totalCount,
			hasMore: pageOffset + pageLimit < totalCount,
		};
	},
});

/**
 * Get a single version by ID.
 * Returns the version if it exists and belongs to the user's workspace.
 */
export const getVersion = query({
	args: {
		versionId: v.id("contentVersions"),
	},
	handler: async (ctx, { versionId }) => {
		const { workspace } = await authorizeWorkspaceAccess(ctx);

		const version = await ctx.db.get(versionId);
		if (!version) {
			throw new ConvexError("Version not found");
		}

		// Verify version belongs to user's workspace via content piece -> project
		const contentPiece = await ctx.db.get(version.contentPieceId);
		if (!contentPiece) {
			throw new ConvexError("Version not found");
		}

		const project = await ctx.db.get(contentPiece.projectId);
		if (!project || project.workspaceId !== workspace._id) {
			throw new ConvexError("Version not found");
		}

		if (contentPiece.deletedAt) {
			throw new ConvexError("Version not found");
		}

		return version;
	},
});

/**
 * Restore a version to become the current content.
 * Non-destructive: creates a new version with the restored content and updates the content piece.
 */
export const restoreVersion = mutation({
	args: {
		versionId: v.id("contentVersions"),
	},
	handler: async (ctx, { versionId }) => {
		const { workspace } = await authorizeWorkspaceAccess(ctx);

		// Get the version to restore
		const version = await ctx.db.get(versionId);
		if (!version) {
			throw new ConvexError("Version not found");
		}

		// Verify content piece exists and belongs to workspace
		const contentPiece = await ctx.db.get(version.contentPieceId);
		if (!contentPiece) {
			throw new ConvexError("Content piece not found");
		}

		const project = await ctx.db.get(contentPiece.projectId);
		if (!project || project.workspaceId !== workspace._id) {
			throw new ConvexError("Content piece not found");
		}

		if (contentPiece.deletedAt) {
			throw new ConvexError("Cannot restore version of a deleted content piece");
		}

		if (contentPiece.status === "finalized") {
			throw new ConvexError(
				"Cannot restore version of a finalized content piece. Unfinalize it first."
			);
		}

		const now = Date.now();

		// Update the content piece with the restored content
		await ctx.db.patch(version.contentPieceId, {
			content: version.content,
			updatedAt: now,
		});

		// Create a new version to preserve the restore action (non-destructive)
		const existingVersions = await ctx.db
			.query("contentVersions")
			.withIndex("by_contentPieceId", (q) =>
				q.eq("contentPieceId", version.contentPieceId)
			)
			.collect();

		const nextVersionNumber = existingVersions.length + 1;
		const restoreLabel = `Restored from v${version.versionNumber}`;

		const newVersionId = await ctx.db.insert("contentVersions", {
			contentPieceId: version.contentPieceId,
			versionNumber: nextVersionNumber,
			content: version.content,
			label: restoreLabel,
			isFinalizedVersion: false,
			createdAt: now,
		});

		// Log activity using internal mutation
		await ctx.runMutation(internal.activityLog.logActivity, {
			workspaceId: workspace._id,
			projectId: contentPiece.projectId,
			contentPieceId: version.contentPieceId,
			action: "content_edited",
			metadata: JSON.stringify({
				restored: true,
				fromVersion: version.versionNumber,
			}),
		});

		return {
			success: true,
			newVersionId,
			newVersionNumber: nextVersionNumber,
		};
	},
});

/**
 * Get only finalized versions for a content piece.
 * Returns versions where isFinalizedVersion is true, ordered by versionNumber descending.
 */
export const getFinalizedVersions = query({
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

		// Query all versions for this content piece
		const versions = await ctx.db
			.query("contentVersions")
			.withIndex("by_contentPieceId", (q) => q.eq("contentPieceId", contentPieceId))
			.collect();

		// Filter only finalized versions
		const finalizedVersions = versions.filter((v) => v.isFinalizedVersion);

		// Sort by versionNumber descending (most recent first)
		finalizedVersions.sort((a, b) => b.versionNumber - a.versionNumber);

		return finalizedVersions;
	},
});
