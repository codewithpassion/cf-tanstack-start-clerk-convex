/**
 * Convex queries and mutations for content piece management.
 * Handles content piece CRUD operations with soft delete support,
 * filtering, pagination, and finalization workflow.
 */
import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { authorizeWorkspaceAccess } from "./lib/auth";

/**
 * Validation constants for content piece fields.
 */
const CONTENT_PIECE_TITLE_MAX_LENGTH = 200;
const CONTENT_PIECE_CONTENT_MAX_LENGTH = 500000;

/**
 * Validate content piece title.
 * @throws ConvexError if title is invalid
 */
function validateContentPieceTitle(title: string): string {
	const trimmed = title.trim();
	if (!trimmed) {
		throw new ConvexError("Content piece title is required");
	}
	if (trimmed.length > CONTENT_PIECE_TITLE_MAX_LENGTH) {
		throw new ConvexError(
			`Content piece title must be ${CONTENT_PIECE_TITLE_MAX_LENGTH} characters or less`
		);
	}
	return trimmed;
}

/**
 * Validate content piece content.
 * @throws ConvexError if content is invalid
 */
function validateContentPieceContent(content: string): string {
	if (!content) {
		throw new ConvexError("Content piece content is required");
	}
	if (content.length > CONTENT_PIECE_CONTENT_MAX_LENGTH) {
		throw new ConvexError(
			`Content piece content must be ${CONTENT_PIECE_CONTENT_MAX_LENGTH} characters or less`
		);
	}
	return content;
}

/**
 * Get a single content piece by ID with authorization check.
 * Returns the content piece if it exists, is not deleted, and belongs to the user's workspace.
 */
export const getContentPiece = query({
	args: {
		contentPieceId: v.id("contentPieces"),
	},
	handler: async (ctx, { contentPieceId }) => {
		const { workspace } = await authorizeWorkspaceAccess(ctx);

		const contentPiece = await ctx.db.get(contentPieceId);

		if (!contentPiece) {
			throw new ConvexError("Content piece not found");
		}

		// Verify content piece belongs to user's workspace via project
		const project = await ctx.db.get(contentPiece.projectId);
		if (!project || project.workspaceId !== workspace._id) {
			throw new ConvexError("Content piece not found");
		}

		if (contentPiece.deletedAt) {
			throw new ConvexError("Content piece not found");
		}

		return contentPiece;
	},
});

/**
 * Get a single content piece with its related entities.
 * Returns the content piece with category, persona, brandVoice, and parent content info.
 */
export const getContentPieceWithRelations = query({
	args: {
		contentPieceId: v.id("contentPieces"),
	},
	handler: async (ctx, { contentPieceId }) => {
		const { workspace } = await authorizeWorkspaceAccess(ctx);

		const contentPiece = await ctx.db.get(contentPieceId);

		if (!contentPiece) {
			throw new ConvexError("Content piece not found");
		}

		// Verify content piece belongs to user's workspace via project
		const project = await ctx.db.get(contentPiece.projectId);
		if (!project || project.workspaceId !== workspace._id) {
			throw new ConvexError("Content piece not found");
		}

		if (contentPiece.deletedAt) {
			throw new ConvexError("Content piece not found");
		}

		// Fetch related entities
		const category = await ctx.db.get(contentPiece.categoryId);

		const persona = contentPiece.personaId
			? await ctx.db.get(contentPiece.personaId)
			: null;

		const brandVoice = contentPiece.brandVoiceId
			? await ctx.db.get(contentPiece.brandVoiceId)
			: null;

		const parentContent = contentPiece.parentContentId
			? await ctx.db.get(contentPiece.parentContentId)
			: null;

		return {
			...contentPiece,
			category: category && !category.deletedAt ? category : null,
			persona: persona && !persona.deletedAt ? persona : null,
			brandVoice: brandVoice && !brandVoice.deletedAt ? brandVoice : null,
			parentContent:
				parentContent && !parentContent.deletedAt ? parentContent : null,
		};
	},
});

/**
 * List content pieces for a project with filtering and pagination.
 * Returns content pieces sorted by updatedAt descending (most recent first).
 */
export const listContentPieces = query({
	args: {
		projectId: v.id("projects"),
		filters: v.optional(
			v.object({
				categoryId: v.optional(v.id("categories")),
				personaId: v.optional(v.id("personas")),
				brandVoiceId: v.optional(v.id("brandVoices")),
				status: v.optional(v.union(v.literal("draft"), v.literal("finalized"))),
				dateFrom: v.optional(v.number()),
				dateTo: v.optional(v.number()),
			})
		),
		pagination: v.optional(
			v.object({
				limit: v.optional(v.number()),
				offset: v.optional(v.number()),
			})
		),
	},
	handler: async (ctx, { projectId, filters, pagination }) => {
		const { workspace } = await authorizeWorkspaceAccess(ctx);

		// Verify project exists and belongs to workspace
		const project = await ctx.db.get(projectId);
		if (!project || project.workspaceId !== workspace._id || project.deletedAt) {
			throw new ConvexError("Project not found");
		}

		// Query content pieces for the project
		let contentPieces = await ctx.db
			.query("contentPieces")
			.withIndex("by_projectId", (q) => q.eq("projectId", projectId))
			.collect();

		// Filter out soft-deleted content pieces
		contentPieces = contentPieces.filter((cp) => !cp.deletedAt);

		// Apply filters
		if (filters) {
			if (filters.categoryId) {
				contentPieces = contentPieces.filter(
					(cp) => cp.categoryId === filters.categoryId
				);
			}
			if (filters.personaId) {
				contentPieces = contentPieces.filter(
					(cp) => cp.personaId === filters.personaId
				);
			}
			if (filters.brandVoiceId) {
				contentPieces = contentPieces.filter(
					(cp) => cp.brandVoiceId === filters.brandVoiceId
				);
			}
			if (filters.status) {
				contentPieces = contentPieces.filter(
					(cp) => cp.status === filters.status
				);
			}
			if (filters.dateFrom) {
				contentPieces = contentPieces.filter(
					(cp) => cp.createdAt >= filters.dateFrom!
				);
			}
			if (filters.dateTo) {
				contentPieces = contentPieces.filter(
					(cp) => cp.createdAt <= filters.dateTo!
				);
			}
		}

		// Sort by updatedAt descending (most recent first)
		contentPieces.sort((a, b) => b.updatedAt - a.updatedAt);

		// Get total count before pagination
		const totalCount = contentPieces.length;

		// Apply pagination
		const limit = pagination?.limit ?? 25;
		const offset = pagination?.offset ?? 0;
		contentPieces = contentPieces.slice(offset, offset + limit);

		return {
			contentPieces,
			totalCount,
			hasMore: offset + limit < totalCount,
		};
	},
});

/**
 * Get derived content pieces for a parent content piece.
 * Returns all content pieces where parentContentId matches the given ID.
 */
export const getDerivedContent = query({
	args: {
		parentContentId: v.id("contentPieces"),
	},
	handler: async (ctx, { parentContentId }) => {
		const { workspace } = await authorizeWorkspaceAccess(ctx);

		// Verify parent content piece exists and belongs to workspace
		const parentContent = await ctx.db.get(parentContentId);
		if (!parentContent) {
			throw new ConvexError("Parent content piece not found");
		}

		const project = await ctx.db.get(parentContent.projectId);
		if (!project || project.workspaceId !== workspace._id) {
			throw new ConvexError("Parent content piece not found");
		}

		// Query derived content pieces
		const derivedContent = await ctx.db
			.query("contentPieces")
			.withIndex("by_parentContentId", (q) =>
				q.eq("parentContentId", parentContentId)
			)
			.collect();

		// Filter out soft-deleted and return with basic relations
		const activeContent = derivedContent.filter((cp) => !cp.deletedAt);

		// Fetch categories for display
		const contentWithCategory = await Promise.all(
			activeContent.map(async (cp) => {
				const category = await ctx.db.get(cp.categoryId);
				return {
					...cp,
					category: category && !category.deletedAt ? category : null,
				};
			})
		);

		return contentWithCategory;
	},
});

/**
 * Get content statistics for a project.
 * Returns counts by status and category.
 */
export const getContentStats = query({
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

		// Query all content pieces for the project
		const contentPieces = await ctx.db
			.query("contentPieces")
			.withIndex("by_projectId", (q) => q.eq("projectId", projectId))
			.collect();

		// Filter out soft-deleted
		const activeContent = contentPieces.filter((cp) => !cp.deletedAt);

		// Count by status
		const draftCount = activeContent.filter((cp) => cp.status === "draft").length;
		const finalizedCount = activeContent.filter(
			(cp) => cp.status === "finalized"
		).length;

		// Count by category
		const byCategory: Record<string, number> = {};
		for (const cp of activeContent) {
			const categoryId = cp.categoryId.toString();
			byCategory[categoryId] = (byCategory[categoryId] || 0) + 1;
		}

		return {
			totalCount: activeContent.length,
			draftCount,
			finalizedCount,
			byCategory,
		};
	},
});

/**
 * Create a new content piece.
 * Creates the content piece with required fields and logs activity.
 */
export const createContentPiece = mutation({
	args: {
		projectId: v.id("projects"),
		categoryId: v.id("categories"),
		personaId: v.optional(v.id("personas")),
		brandVoiceId: v.optional(v.id("brandVoices")),
		title: v.string(),
		content: v.string(),
	},
	handler: async (
		ctx,
		{ projectId, categoryId, personaId, brandVoiceId, title, content }
	) => {
		const { workspace } = await authorizeWorkspaceAccess(ctx);

		// Verify project exists and belongs to workspace
		const project = await ctx.db.get(projectId);
		if (!project || project.workspaceId !== workspace._id) {
			throw new ConvexError("Project not found");
		}

		if (project.deletedAt) {
			throw new ConvexError("Cannot add content to a deleted project");
		}

		// Verify category exists and belongs to project
		const category = await ctx.db.get(categoryId);
		if (!category || category.projectId !== projectId || category.deletedAt) {
			throw new ConvexError("Category not found");
		}

		// Verify persona if provided
		if (personaId) {
			const persona = await ctx.db.get(personaId);
			if (!persona || persona.projectId !== projectId || persona.deletedAt) {
				throw new ConvexError("Persona not found");
			}
		}

		// Verify brand voice if provided
		if (brandVoiceId) {
			const brandVoice = await ctx.db.get(brandVoiceId);
			if (
				!brandVoice ||
				brandVoice.projectId !== projectId ||
				brandVoice.deletedAt
			) {
				throw new ConvexError("Brand voice not found");
			}
		}

		// Validate inputs
		const validatedTitle = validateContentPieceTitle(title);
		const validatedContent = validateContentPieceContent(content);

		const now = Date.now();

		// Create the content piece
		const contentPieceId = await ctx.db.insert("contentPieces", {
			projectId,
			categoryId,
			personaId,
			brandVoiceId,
			title: validatedTitle,
			content: validatedContent,
			status: "draft",
			createdAt: now,
			updatedAt: now,
		});

		// Log activity using internal mutation
		await ctx.runMutation(internal.activityLog.logActivity, {
			workspaceId: workspace._id,
			projectId,
			contentPieceId,
			action: "content_created",
		});

		return { contentPieceId };
	},
});

/**
 * Update an existing content piece.
 * Updates title and/or content fields and triggers version creation.
 */
export const updateContentPiece = mutation({
	args: {
		contentPieceId: v.id("contentPieces"),
		title: v.optional(v.string()),
		content: v.optional(v.string()),
	},
	handler: async (ctx, { contentPieceId, title, content }) => {
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
			throw new ConvexError("Cannot update a deleted content piece");
		}

		if (contentPiece.status === "finalized") {
			throw new ConvexError(
				"Cannot update a finalized content piece. Unfinalize it first."
			);
		}

		// Build update object with only provided fields
		const updates: {
			title?: string;
			content?: string;
			updatedAt: number;
		} = {
			updatedAt: Date.now(),
		};

		if (title !== undefined) {
			updates.title = validateContentPieceTitle(title);
		}

		if (content !== undefined) {
			updates.content = validateContentPieceContent(content);
		}

		// Update the content piece
		await ctx.db.patch(contentPieceId, updates);

		// Create a new version if content changed (using internal mutation)
		if (content !== undefined) {
			await ctx.runMutation(internal.contentVersions.createVersion, {
				contentPieceId,
				content: updates.content ?? contentPiece.content,
				isFinalizedVersion: false,
			});
		}

		return { success: true };
	},
});

/**
 * Soft delete a content piece.
 * Sets deletedAt timestamp and logs activity.
 */
export const deleteContentPiece = mutation({
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
			throw new ConvexError("Content piece is already deleted");
		}

		const now = Date.now();

		// Soft delete the content piece
		await ctx.db.patch(contentPieceId, {
			deletedAt: now,
			updatedAt: now,
		});

		// Log activity using internal mutation
		await ctx.runMutation(internal.activityLog.logActivity, {
			workspaceId: workspace._id,
			projectId: contentPiece.projectId,
			contentPieceId,
			action: "content_deleted",
		});

		return { success: true };
	},
});

/**
 * Finalize a content piece.
 * Changes status to "finalized", increments version, and creates finalized version record.
 */
export const finalizeContentPiece = mutation({
	args: {
		contentPieceId: v.id("contentPieces"),
		label: v.optional(v.string()),
	},
	handler: async (ctx, { contentPieceId, label }) => {
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
			throw new ConvexError("Cannot finalize a deleted content piece");
		}

		if (contentPiece.status === "finalized") {
			throw new ConvexError("Content piece is already finalized");
		}

		const now = Date.now();

		// Calculate next finalized version number
		const nextFinalizedVersion = (contentPiece.currentFinalizedVersion ?? 0) + 1;

		// Update the content piece
		await ctx.db.patch(contentPieceId, {
			status: "finalized",
			currentFinalizedVersion: nextFinalizedVersion,
			updatedAt: now,
		});

		// Create finalized version record (using internal mutation)
		await ctx.runMutation(internal.contentVersions.createVersion, {
			contentPieceId,
			content: contentPiece.content,
			label: label ?? `Finalized v${nextFinalizedVersion}`,
			isFinalizedVersion: true,
			finalizedVersionNumber: nextFinalizedVersion,
		});

		// Log activity using internal mutation
		await ctx.runMutation(internal.activityLog.logActivity, {
			workspaceId: workspace._id,
			projectId: contentPiece.projectId,
			contentPieceId,
			action: "content_finalized",
			metadata: JSON.stringify({ finalizedVersion: nextFinalizedVersion }),
		});

		return { success: true, finalizedVersion: nextFinalizedVersion };
	},
});

/**
 * Unfinalize a content piece.
 * Changes status back to "draft" to allow editing.
 */
export const unfinalizeContentPiece = mutation({
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
			throw new ConvexError("Cannot unfinalize a deleted content piece");
		}

		if (contentPiece.status === "draft") {
			throw new ConvexError("Content piece is already a draft");
		}

		const now = Date.now();

		// Update the content piece status back to draft
		await ctx.db.patch(contentPieceId, {
			status: "draft",
			updatedAt: now,
		});

		return { success: true };
	},
});

/**
 * Create derived content from an existing content piece.
 * Creates a new content piece with parent reference and inherited properties.
 * Optionally accepts persona/brandVoice overrides and initial content.
 */
export const createDerivedContent = mutation({
	args: {
		parentContentId: v.id("contentPieces"),
		categoryId: v.id("categories"),
		title: v.string(),
		personaId: v.optional(v.id("personas")),
		brandVoiceId: v.optional(v.id("brandVoices")),
		content: v.optional(v.string()),
	},
	handler: async (
		ctx,
		{ parentContentId, categoryId, title, personaId, brandVoiceId, content }
	) => {
		const { workspace } = await authorizeWorkspaceAccess(ctx);

		// Verify parent content piece exists and belongs to workspace
		const parentContent = await ctx.db.get(parentContentId);
		if (!parentContent) {
			throw new ConvexError("Parent content piece not found");
		}

		const project = await ctx.db.get(parentContent.projectId);
		if (!project || project.workspaceId !== workspace._id) {
			throw new ConvexError("Parent content piece not found");
		}

		if (parentContent.deletedAt) {
			throw new ConvexError("Cannot derive from a deleted content piece");
		}

		// Verify category exists and belongs to project
		const category = await ctx.db.get(categoryId);
		if (
			!category ||
			category.projectId !== parentContent.projectId ||
			category.deletedAt
		) {
			throw new ConvexError("Category not found");
		}

		// Use provided persona or inherit from parent
		const finalPersonaId = personaId ?? parentContent.personaId;

		// Verify persona if provided
		if (finalPersonaId) {
			const persona = await ctx.db.get(finalPersonaId);
			if (
				!persona ||
				persona.projectId !== parentContent.projectId ||
				persona.deletedAt
			) {
				throw new ConvexError("Persona not found");
			}
		}

		// Use provided brand voice or inherit from parent
		const finalBrandVoiceId = brandVoiceId ?? parentContent.brandVoiceId;

		// Verify brand voice if provided
		if (finalBrandVoiceId) {
			const brandVoice = await ctx.db.get(finalBrandVoiceId);
			if (
				!brandVoice ||
				brandVoice.projectId !== parentContent.projectId ||
				brandVoice.deletedAt
			) {
				throw new ConvexError("Brand voice not found");
			}
		}

		// Validate title
		const validatedTitle = validateContentPieceTitle(title);

		// Validate content if provided
		const validatedContent = content
			? validateContentPieceContent(content)
			: "";

		const now = Date.now();

		// Create the derived content piece
		const contentPieceId = await ctx.db.insert("contentPieces", {
			projectId: parentContent.projectId,
			categoryId,
			personaId: finalPersonaId,
			brandVoiceId: finalBrandVoiceId,
			parentContentId,
			title: validatedTitle,
			content: validatedContent,
			status: "draft",
			createdAt: now,
			updatedAt: now,
		});

		// Log activity using internal mutation
		await ctx.runMutation(internal.activityLog.logActivity, {
			workspaceId: workspace._id,
			projectId: parentContent.projectId,
			contentPieceId,
			action: "derived_content_created",
			metadata: JSON.stringify({ parentContentId }),
		});

		return { contentPieceId };
	},
});
