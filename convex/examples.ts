/**
 * Convex mutations and queries for examples library management.
 * Handles example CRUD operations scoped to categories.
 */
import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { authorizeWorkspaceAccess } from "./lib/auth";

/**
 * Validation constants for example fields.
 */
const VALIDATION = {
	TITLE_MAX_LENGTH: 200,
	CONTENT_MAX_LENGTH: 50000,
	NOTES_MAX_LENGTH: 2000,
} as const;

/**
 * Validate example field constraints.
 */
function validateExampleFields(fields: {
	title?: string;
	content?: string;
	notes?: string;
}) {
	if (fields.title !== undefined) {
		const trimmedTitle = fields.title.trim();
		if (trimmedTitle.length === 0) {
			throw new ConvexError("Title cannot be empty");
		}
		if (trimmedTitle.length > VALIDATION.TITLE_MAX_LENGTH) {
			throw new ConvexError(`Title cannot exceed ${VALIDATION.TITLE_MAX_LENGTH} characters`);
		}
	}

	if (fields.content !== undefined && fields.content.length > VALIDATION.CONTENT_MAX_LENGTH) {
		throw new ConvexError(`Content cannot exceed ${VALIDATION.CONTENT_MAX_LENGTH} characters`);
	}

	if (fields.notes !== undefined && fields.notes.length > VALIDATION.NOTES_MAX_LENGTH) {
		throw new ConvexError(`Notes cannot exceed ${VALIDATION.NOTES_MAX_LENGTH} characters`);
	}
}

/**
 * List examples for a specific category.
 * Returns non-deleted examples only.
 */
export const listExamples = query({
	args: {
		categoryId: v.id("categories"),
	},
	handler: async (ctx, { categoryId }) => {
		const { workspace } = await authorizeWorkspaceAccess(ctx);

		// Get category and verify it belongs to user's workspace
		const category = await ctx.db.get(categoryId);
		if (!category) {
			throw new ConvexError("Category not found");
		}

		const project = await ctx.db.get(category.projectId);
		if (!project || project.workspaceId !== workspace._id) {
			throw new ConvexError("You do not have permission to access this category");
		}

		// Get non-deleted examples for this category
		const examples = await ctx.db
			.query("examples")
			.withIndex("by_categoryId_deletedAt", (q) =>
				q.eq("categoryId", categoryId).eq("deletedAt", undefined)
			)
			.collect();

		return examples;
	},
});

/**
 * Get a single example by ID with file data if present.
 */
export const getExample = query({
	args: {
		exampleId: v.id("examples"),
	},
	handler: async (ctx, { exampleId }) => {
		const { workspace } = await authorizeWorkspaceAccess(ctx);

		const example = await ctx.db.get(exampleId);
		if (!example) {
			throw new ConvexError("Example not found");
		}

		// Check if soft deleted
		if (example.deletedAt) {
			throw new ConvexError("Example not found");
		}

		// Verify ownership through project
		const project = await ctx.db.get(example.projectId);
		if (!project || project.workspaceId !== workspace._id) {
			throw new ConvexError("You do not have permission to access this example");
		}

		// Get file data if present
		let file = null;
		if (example.fileId) {
			file = await ctx.db.get(example.fileId);
		}

		return {
			...example,
			file,
		};
	},
});

/**
 * List all examples for a project across all categories.
 * Useful for project-level overview or search.
 */
export const listExamplesByProject = query({
	args: {
		projectId: v.id("projects"),
	},
	handler: async (ctx, { projectId }) => {
		const { workspace } = await authorizeWorkspaceAccess(ctx);

		// Verify project belongs to user's workspace
		const project = await ctx.db.get(projectId);
		if (!project || project.workspaceId !== workspace._id) {
			throw new ConvexError("You do not have permission to access this project");
		}

		// Get non-deleted examples for this project
		const examples = await ctx.db
			.query("examples")
			.withIndex("by_projectId", (q) => q.eq("projectId", projectId))
			.filter((q) => q.eq(q.field("deletedAt"), undefined))
			.collect();

		return examples;
	},
});

/**
 * Create a new example in a category.
 */
export const createExample = mutation({
	args: {
		categoryId: v.id("categories"),
		title: v.string(),
		content: v.optional(v.string()),
		notes: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		const { workspace } = await authorizeWorkspaceAccess(ctx);

		// Validate fields
		validateExampleFields({
			title: args.title,
			content: args.content,
			notes: args.notes,
		});

		// Get category and verify ownership
		const category = await ctx.db.get(args.categoryId);
		if (!category) {
			throw new ConvexError("Category not found");
		}

		const project = await ctx.db.get(category.projectId);
		if (!project || project.workspaceId !== workspace._id) {
			throw new ConvexError("You do not have permission to add examples to this category");
		}

		// Create example
		const now = Date.now();
		const exampleId = await ctx.db.insert("examples", {
			categoryId: args.categoryId,
			projectId: category.projectId,
			title: args.title.trim(),
			content: args.content,
			notes: args.notes,
			createdAt: now,
			updatedAt: now,
		});

		return exampleId;
	},
});

/**
 * Update an existing example.
 */
export const updateExample = mutation({
	args: {
		exampleId: v.id("examples"),
		title: v.optional(v.string()),
		content: v.optional(v.string()),
		notes: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		const { workspace } = await authorizeWorkspaceAccess(ctx);

		// Validate fields
		validateExampleFields({
			title: args.title,
			content: args.content,
			notes: args.notes,
		});

		// Get example and verify ownership
		const example = await ctx.db.get(args.exampleId);
		if (!example || example.deletedAt) {
			throw new ConvexError("Example not found");
		}

		const project = await ctx.db.get(example.projectId);
		if (!project || project.workspaceId !== workspace._id) {
			throw new ConvexError("You do not have permission to update this example");
		}

		// Build update object
		const updateData: {
			title?: string;
			content?: string;
			notes?: string;
			updatedAt: number;
		} = {
			updatedAt: Date.now(),
		};

		if (args.title !== undefined) {
			updateData.title = args.title.trim();
		}
		if (args.content !== undefined) {
			updateData.content = args.content;
		}
		if (args.notes !== undefined) {
			updateData.notes = args.notes;
		}

		await ctx.db.patch(args.exampleId, updateData);

		return { success: true };
	},
});

/**
 * Soft delete an example.
 */
export const deleteExample = mutation({
	args: {
		exampleId: v.id("examples"),
	},
	handler: async (ctx, { exampleId }) => {
		const { workspace } = await authorizeWorkspaceAccess(ctx);

		// Get example and verify ownership
		const example = await ctx.db.get(exampleId);
		if (!example || example.deletedAt) {
			throw new ConvexError("Example not found");
		}

		const project = await ctx.db.get(example.projectId);
		if (!project || project.workspaceId !== workspace._id) {
			throw new ConvexError("You do not have permission to delete this example");
		}

		// Soft delete the example
		await ctx.db.patch(exampleId, {
			deletedAt: Date.now(),
		});

		return { success: true };
	},
});
