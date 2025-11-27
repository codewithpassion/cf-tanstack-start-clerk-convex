/**
 * Convex queries and mutations for category management.
 * Handles category CRUD operations with soft delete support and reordering.
 */
import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { authorizeWorkspaceAccess } from "./lib/auth";

/**
 * Validation constants for category fields.
 */
const CATEGORY_NAME_MAX_LENGTH = 50;
const CATEGORY_DESCRIPTION_MAX_LENGTH = 2000;
const CATEGORY_FORMAT_GUIDELINES_MAX_LENGTH = 5000;

/**
 * Validate category name.
 * @throws ConvexError if name is invalid
 */
function validateCategoryName(name: string): string {
	const trimmed = name.trim();
	if (!trimmed) {
		throw new ConvexError("Category name is required");
	}
	if (trimmed.length > CATEGORY_NAME_MAX_LENGTH) {
		throw new ConvexError(`Category name must be ${CATEGORY_NAME_MAX_LENGTH} characters or less`);
	}
	return trimmed;
}

/**
 * Validate category description.
 * @throws ConvexError if description is invalid
 */
function validateCategoryDescription(description: string | undefined): string | undefined {
	if (!description) {
		return undefined;
	}
	const trimmed = description.trim();
	if (trimmed.length > CATEGORY_DESCRIPTION_MAX_LENGTH) {
		throw new ConvexError(`Category description must be ${CATEGORY_DESCRIPTION_MAX_LENGTH} characters or less`);
	}
	return trimmed || undefined;
}

/**
 * Validate category format guidelines.
 * @throws ConvexError if format guidelines are invalid
 */
function validateCategoryFormatGuidelines(formatGuidelines: string | undefined): string | undefined {
	if (!formatGuidelines) {
		return undefined;
	}
	const trimmed = formatGuidelines.trim();
	if (trimmed.length > CATEGORY_FORMAT_GUIDELINES_MAX_LENGTH) {
		throw new ConvexError(`Category format guidelines must be ${CATEGORY_FORMAT_GUIDELINES_MAX_LENGTH} characters or less`);
	}
	return trimmed || undefined;
}

/**
 * List all non-deleted categories for a project.
 * Returns categories sorted by sortOrder ascending.
 */
export const listCategories = query({
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

		const categories = await ctx.db
			.query("categories")
			.withIndex("by_projectId", (q) => q.eq("projectId", projectId))
			.collect();

		// Filter out soft-deleted categories and sort by sortOrder ascending
		return categories
			.filter((c) => !c.deletedAt)
			.sort((a, b) => a.sortOrder - b.sortOrder);
	},
});

/**
 * Get a single category by ID with authorization check.
 * Returns the category if it exists, is not deleted, and belongs to the user's workspace.
 */
export const getCategory = query({
	args: {
		categoryId: v.id("categories"),
	},
	handler: async (ctx, { categoryId }) => {
		const { workspace } = await authorizeWorkspaceAccess(ctx);

		const category = await ctx.db.get(categoryId);

		if (!category) {
			throw new ConvexError("Category not found");
		}

		// Verify project exists and belongs to workspace
		const project = await ctx.db.get(category.projectId);
		if (!project || project.workspaceId !== workspace._id || project.deletedAt) {
			throw new ConvexError("Category not found");
		}

		if (category.deletedAt) {
			throw new ConvexError("Category not found");
		}

		return category;
	},
});

/**
 * Create a new custom category for a project.
 * Custom categories are appended after default categories in sort order.
 */
export const createCategory = mutation({
	args: {
		projectId: v.id("projects"),
		name: v.string(),
		description: v.optional(v.string()),
		formatGuidelines: v.optional(v.string()),
	},
	handler: async (ctx, { projectId, name, description, formatGuidelines }) => {
		const { workspace } = await authorizeWorkspaceAccess(ctx);

		// Verify project exists and belongs to workspace
		const project = await ctx.db.get(projectId);
		if (!project || project.workspaceId !== workspace._id || project.deletedAt) {
			throw new ConvexError("Project not found");
		}

		// Validate inputs
		const validatedName = validateCategoryName(name);
		const validatedDescription = validateCategoryDescription(description);
		const validatedFormatGuidelines = validateCategoryFormatGuidelines(formatGuidelines);

		// Get the highest sortOrder to append the new category
		const categories = await ctx.db
			.query("categories")
			.withIndex("by_projectId", (q) => q.eq("projectId", projectId))
			.collect();

		const maxSortOrder = categories
			.filter((c) => !c.deletedAt)
			.reduce((max, c) => Math.max(max, c.sortOrder), 0);

		const now = Date.now();

		// Create the category
		const categoryId = await ctx.db.insert("categories", {
			projectId,
			name: validatedName,
			description: validatedDescription,
			formatGuidelines: validatedFormatGuidelines,
			isDefault: false,
			sortOrder: maxSortOrder + 1,
			createdAt: now,
			updatedAt: now,
		});

		return { categoryId };
	},
});

/**
 * Update an existing category.
 * Updates the specified fields and sets updatedAt to current timestamp.
 */
export const updateCategory = mutation({
	args: {
		categoryId: v.id("categories"),
		name: v.optional(v.string()),
		description: v.optional(v.string()),
		formatGuidelines: v.optional(v.string()),
	},
	handler: async (ctx, { categoryId, name, description, formatGuidelines }) => {
		const { workspace } = await authorizeWorkspaceAccess(ctx);

		// Verify category exists
		const category = await ctx.db.get(categoryId);
		if (!category || category.deletedAt) {
			throw new ConvexError("Category not found");
		}

		// Verify project exists and belongs to workspace
		const project = await ctx.db.get(category.projectId);
		if (!project || project.workspaceId !== workspace._id || project.deletedAt) {
			throw new ConvexError("Category not found");
		}

		// Build update object with only provided fields
		const updates: {
			name?: string;
			description?: string | undefined;
			formatGuidelines?: string | undefined;
			updatedAt: number;
		} = {
			updatedAt: Date.now(),
		};

		if (name !== undefined) {
			updates.name = validateCategoryName(name);
		}

		if (description !== undefined) {
			updates.description = validateCategoryDescription(description);
		}

		if (formatGuidelines !== undefined) {
			updates.formatGuidelines = validateCategoryFormatGuidelines(formatGuidelines);
		}

		await ctx.db.patch(categoryId, updates);

		return { success: true };
	},
});

/**
 * Soft delete a category.
 * Sets deletedAt timestamp instead of permanently removing the record.
 * Both default and custom categories can be soft deleted.
 */
export const deleteCategory = mutation({
	args: {
		categoryId: v.id("categories"),
	},
	handler: async (ctx, { categoryId }) => {
		const { workspace } = await authorizeWorkspaceAccess(ctx);

		// Verify category exists
		const category = await ctx.db.get(categoryId);
		if (!category) {
			throw new ConvexError("Category not found");
		}

		// Verify project exists and belongs to workspace
		const project = await ctx.db.get(category.projectId);
		if (!project || project.workspaceId !== workspace._id || project.deletedAt) {
			throw new ConvexError("Category not found");
		}

		if (category.deletedAt) {
			throw new ConvexError("Category is already deleted");
		}

		// Soft delete by setting deletedAt timestamp
		await ctx.db.patch(categoryId, {
			deletedAt: Date.now(),
			updatedAt: Date.now(),
		});

		return { success: true };
	},
});

/**
 * Reorder categories for a project.
 * Updates sortOrder based on the position in the provided array.
 */
export const reorderCategories = mutation({
	args: {
		projectId: v.id("projects"),
		categoryIds: v.array(v.id("categories")),
	},
	handler: async (ctx, { projectId, categoryIds }) => {
		const { workspace } = await authorizeWorkspaceAccess(ctx);

		// Verify project exists and belongs to workspace
		const project = await ctx.db.get(projectId);
		if (!project || project.workspaceId !== workspace._id || project.deletedAt) {
			throw new ConvexError("Project not found");
		}

		// Verify all categories exist and belong to the project
		const categories = await ctx.db
			.query("categories")
			.withIndex("by_projectId", (q) => q.eq("projectId", projectId))
			.collect();

		const activeCategoryIds = categories
			.filter((c) => !c.deletedAt)
			.map((c) => c._id);

		// Verify all provided category IDs are valid and belong to this project
		for (const categoryId of categoryIds) {
			if (!activeCategoryIds.includes(categoryId)) {
				throw new ConvexError("Invalid category ID or category does not belong to this project");
			}
		}

		// Verify all active categories are included in the reorder
		if (categoryIds.length !== activeCategoryIds.length) {
			throw new ConvexError("All active categories must be included in reorder");
		}

		const now = Date.now();

		// Update sortOrder for each category based on position in array
		for (let i = 0; i < categoryIds.length; i++) {
			await ctx.db.patch(categoryIds[i], {
				sortOrder: i + 1, // 1-indexed
				updatedAt: now,
			});
		}

		return { success: true };
	},
});
