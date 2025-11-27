/**
 * Convex mutations and queries for knowledge base management.
 * Handles CRUD operations for knowledge base items scoped to categories.
 */
import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { authorizeWorkspaceAccess } from "./lib/auth";

/**
 * Validation: Title required, max 200 chars, non-empty after trim
 */
function validateTitle(title: string): void {
	const trimmed = title.trim();
	if (trimmed.length === 0) {
		throw new ConvexError("Title is required and cannot be empty");
	}
	if (trimmed.length > 200) {
		throw new ConvexError("Title must be 200 characters or less");
	}
}

/**
 * Validation: Content optional, max 50000 chars
 */
function validateContent(content: string | undefined): void {
	if (content !== undefined && content.length > 50000) {
		throw new ConvexError("Content must be 50000 characters or less");
	}
}

/**
 * List knowledge base items for a specific category.
 * Returns non-deleted items only.
 */
export const listKnowledgeBaseItems = query({
	args: {
		categoryId: v.id("categories"),
	},
	handler: async (ctx, { categoryId }) => {
		const { workspace } = await authorizeWorkspaceAccess(ctx);

		// Get the category to verify it exists and belongs to user's workspace
		const category = await ctx.db.get(categoryId);
		if (!category) {
			throw new ConvexError("Category not found");
		}

		// Verify category belongs to user's workspace
		const project = await ctx.db.get(category.projectId);
		if (!project) {
			throw new ConvexError("Project not found");
		}

		if (project.workspaceId !== workspace._id) {
			throw new ConvexError("You do not have permission to access this category");
		}

		// Query items by category, filtering out soft-deleted items
		const items = await ctx.db
			.query("knowledgeBaseItems")
			.withIndex("by_categoryId_deletedAt", (q) =>
				q.eq("categoryId", categoryId).eq("deletedAt", undefined),
			)
			.collect();

		return items;
	},
});

/**
 * Get a single knowledge base item with file data if attached.
 */
export const getKnowledgeBaseItem = query({
	args: {
		itemId: v.id("knowledgeBaseItems"),
	},
	handler: async (ctx, { itemId }) => {
		const { workspace } = await authorizeWorkspaceAccess(ctx);

		const item = await ctx.db.get(itemId);
		if (!item) {
			throw new ConvexError("Knowledge base item not found");
		}

		// Verify item belongs to user's workspace
		const project = await ctx.db.get(item.projectId);
		if (!project) {
			throw new ConvexError("Project not found");
		}

		if (project.workspaceId !== workspace._id) {
			throw new ConvexError("You do not have permission to access this item");
		}

		// Check if item is soft-deleted
		if (item.deletedAt) {
			throw new ConvexError("Knowledge base item has been deleted");
		}

		// Get file data if fileId is present
		let file = null;
		if (item.fileId) {
			file = await ctx.db.get(item.fileId);
		}

		return {
			...item,
			file,
		};
	},
});

/**
 * List all knowledge base items for a project across all categories.
 */
export const listKnowledgeBaseItemsByProject = query({
	args: {
		projectId: v.id("projects"),
	},
	handler: async (ctx, { projectId }) => {
		const { workspace } = await authorizeWorkspaceAccess(ctx);

		// Verify project belongs to user's workspace
		const project = await ctx.db.get(projectId);
		if (!project) {
			throw new ConvexError("Project not found");
		}

		if (project.workspaceId !== workspace._id) {
			throw new ConvexError("You do not have permission to access this project");
		}

		// Query items by project index, filter out soft-deleted
		const items = await ctx.db
			.query("knowledgeBaseItems")
			.withIndex("by_projectId", (q) => q.eq("projectId", projectId))
			.filter((q) => q.eq(q.field("deletedAt"), undefined))
			.collect();

		return items;
	},
});

/**
 * Create a new knowledge base item.
 */
export const createKnowledgeBaseItem = mutation({
	args: {
		categoryId: v.id("categories"),
		title: v.string(),
		content: v.optional(v.string()),
		fileId: v.optional(v.id("files")),
	},
	handler: async (ctx, { categoryId, title, content, fileId }) => {
		const { workspace } = await authorizeWorkspaceAccess(ctx);

		// Validate inputs
		validateTitle(title);
		validateContent(content);

		// Get the category to verify it exists and get projectId
		const category = await ctx.db.get(categoryId);
		if (!category) {
			throw new ConvexError("Category not found");
		}

		// Verify category belongs to user's workspace
		const project = await ctx.db.get(category.projectId);
		if (!project) {
			throw new ConvexError("Project not found");
		}

		if (project.workspaceId !== workspace._id) {
			throw new ConvexError("You do not have permission to add items to this category");
		}

		// Check if category is soft-deleted
		if (category.deletedAt) {
			throw new ConvexError("Cannot add items to a deleted category");
		}

		// Verify file ownership if fileId is provided
		if (fileId) {
			const file = await ctx.db.get(fileId);
			if (!file) {
				throw new ConvexError("File not found");
			}
		}

		// Create the knowledge base item
		const now = Date.now();
		const itemData: {
			categoryId: Id<"categories">;
			projectId: Id<"projects">;
			title: string;
			content?: string;
			fileId?: Id<"files">;
			createdAt: number;
			updatedAt: number;
		} = {
			categoryId,
			projectId: category.projectId,
			title: title.trim(),
			createdAt: now,
			updatedAt: now,
		};

		if (content) {
			itemData.content = content;
		}

		if (fileId) {
			itemData.fileId = fileId;
		}

		const itemId = await ctx.db.insert("knowledgeBaseItems", itemData);
		return itemId;
	},
});

/**
 * Update a knowledge base item.
 */
export const updateKnowledgeBaseItem = mutation({
	args: {
		itemId: v.id("knowledgeBaseItems"),
		title: v.optional(v.string()),
		content: v.optional(v.string()),
	},
	handler: async (ctx, { itemId, title, content }) => {
		const { workspace } = await authorizeWorkspaceAccess(ctx);

		// Get the item
		const item = await ctx.db.get(itemId);
		if (!item) {
			throw new ConvexError("Knowledge base item not found");
		}

		// Verify item belongs to user's workspace
		const project = await ctx.db.get(item.projectId);
		if (!project) {
			throw new ConvexError("Project not found");
		}

		if (project.workspaceId !== workspace._id) {
			throw new ConvexError("You do not have permission to update this item");
		}

		// Check if item is soft-deleted
		if (item.deletedAt) {
			throw new ConvexError("Cannot update a deleted item");
		}

		// Validate inputs if provided
		if (title !== undefined) {
			validateTitle(title);
		}
		if (content !== undefined) {
			validateContent(content);
		}

		// Build update object
		const updateData: {
			title?: string;
			content?: string;
			updatedAt: number;
		} = {
			updatedAt: Date.now(),
		};

		if (title !== undefined) {
			updateData.title = title.trim();
		}

		if (content !== undefined) {
			updateData.content = content;
		}

		await ctx.db.patch(itemId, updateData);
		return { success: true };
	},
});

/**
 * Delete a knowledge base item (soft delete).
 */
export const deleteKnowledgeBaseItem = mutation({
	args: {
		itemId: v.id("knowledgeBaseItems"),
	},
	handler: async (ctx, { itemId }) => {
		const { workspace } = await authorizeWorkspaceAccess(ctx);

		// Get the item
		const item = await ctx.db.get(itemId);
		if (!item) {
			throw new ConvexError("Knowledge base item not found");
		}

		// Verify item belongs to user's workspace
		const project = await ctx.db.get(item.projectId);
		if (!project) {
			throw new ConvexError("Project not found");
		}

		if (project.workspaceId !== workspace._id) {
			throw new ConvexError("You do not have permission to delete this item");
		}

		// Soft delete by setting deletedAt
		await ctx.db.patch(itemId, {
			deletedAt: Date.now(),
		});

		return { success: true };
	},
});
