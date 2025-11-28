/**
 * Convex queries and mutations for image prompt template management.
 * Handles reusable AI image prompt templates for content creation.
 */
import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { authorizeWorkspaceAccess } from "./lib/auth";

/**
 * Validation constants for image prompt template fields.
 */
const TEMPLATE_NAME_MAX_LENGTH = 100;
const TEMPLATE_PROMPT_MAX_LENGTH = 2000;

/**
 * Validate template name.
 * @throws ConvexError if name is invalid
 */
function validateTemplateName(name: string): string {
	const trimmed = name.trim();
	if (!trimmed) {
		throw new ConvexError("Template name is required");
	}
	if (trimmed.length > TEMPLATE_NAME_MAX_LENGTH) {
		throw new ConvexError(
			`Template name must be ${TEMPLATE_NAME_MAX_LENGTH} characters or less`
		);
	}
	return trimmed;
}

/**
 * Validate prompt template.
 * @throws ConvexError if prompt template is invalid
 */
function validatePromptTemplate(promptTemplate: string): string {
	const trimmed = promptTemplate.trim();
	if (!trimmed) {
		throw new ConvexError("Prompt template is required");
	}
	if (trimmed.length > TEMPLATE_PROMPT_MAX_LENGTH) {
		throw new ConvexError(
			`Prompt template must be 2,000 characters or less`
		);
	}
	return trimmed;
}

/**
 * Verify that project exists and belongs to user's workspace.
 * @throws ConvexError if project not found or access denied
 */
async function verifyProjectAccess(
	ctx: { db: any },
	projectId: string,
	workspaceId: string
) {
	const project = await ctx.db.get(projectId);
	if (!project || project.workspaceId !== workspaceId) {
		throw new ConvexError("Project not found");
	}

	if (project.deletedAt) {
		throw new ConvexError("Cannot access deleted project");
	}

	return project;
}

/**
 * List image prompt templates for a project.
 * Returns templates ordered by createdAt descending (most recent first).
 */
export const listImagePromptTemplates = query({
	args: {
		projectId: v.id("projects"),
	},
	handler: async (ctx, { projectId }) => {
		const { workspace } = await authorizeWorkspaceAccess(ctx);

		// Verify project access
		await verifyProjectAccess(ctx, projectId, workspace._id);

		// Query all templates for this project
		const templates = await ctx.db
			.query("imagePromptTemplates")
			.withIndex("by_projectId", (q) => q.eq("projectId", projectId))
			.collect();

		// Sort by createdAt descending (most recent first)
		templates.sort((a, b) => b.createdAt - a.createdAt);

		return templates;
	},
});

/**
 * Create a new image prompt template.
 * Stores template with name, imageType, and promptTemplate for reuse.
 */
export const createImagePromptTemplate = mutation({
	args: {
		projectId: v.id("projects"),
		name: v.string(),
		imageType: v.union(
			v.literal("infographic"),
			v.literal("illustration"),
			v.literal("photo"),
			v.literal("diagram")
		),
		promptTemplate: v.string(),
	},
	handler: async (ctx, { projectId, name, imageType, promptTemplate }) => {
		const { workspace } = await authorizeWorkspaceAccess(ctx);

		// Verify project access
		await verifyProjectAccess(ctx, projectId, workspace._id);

		// Validate inputs
		const validatedName = validateTemplateName(name);
		const validatedPrompt = validatePromptTemplate(promptTemplate);

		const now = Date.now();

		// Create the template
		const templateId = await ctx.db.insert("imagePromptTemplates", {
			projectId,
			name: validatedName,
			imageType,
			promptTemplate: validatedPrompt,
			createdAt: now,
			updatedAt: now,
		});

		return { templateId };
	},
});

/**
 * Update an existing image prompt template.
 * Updates name and/or promptTemplate fields.
 */
export const updateImagePromptTemplate = mutation({
	args: {
		templateId: v.id("imagePromptTemplates"),
		name: v.optional(v.string()),
		promptTemplate: v.optional(v.string()),
	},
	handler: async (ctx, { templateId, name, promptTemplate }) => {
		const { workspace } = await authorizeWorkspaceAccess(ctx);

		// Verify template exists and belongs to workspace
		const template = await ctx.db.get(templateId);
		if (!template) {
			throw new ConvexError("Template not found");
		}

		const project = await ctx.db.get(template.projectId);
		if (!project || project.workspaceId !== workspace._id) {
			throw new ConvexError("Template not found");
		}

		// Build update object with only provided fields
		const updates: {
			name?: string;
			promptTemplate?: string;
			updatedAt: number;
		} = {
			updatedAt: Date.now(),
		};

		if (name !== undefined) {
			updates.name = validateTemplateName(name);
		}

		if (promptTemplate !== undefined) {
			updates.promptTemplate = validatePromptTemplate(promptTemplate);
		}

		// Update the template
		await ctx.db.patch(templateId, updates);

		return { success: true };
	},
});

/**
 * Delete an image prompt template.
 * Hard deletes the template record permanently.
 */
export const deleteImagePromptTemplate = mutation({
	args: {
		templateId: v.id("imagePromptTemplates"),
	},
	handler: async (ctx, { templateId }) => {
		const { workspace } = await authorizeWorkspaceAccess(ctx);

		// Verify template exists and belongs to workspace
		const template = await ctx.db.get(templateId);
		if (!template) {
			throw new ConvexError("Template not found");
		}

		const project = await ctx.db.get(template.projectId);
		if (!project || project.workspaceId !== workspace._id) {
			throw new ConvexError("Template not found");
		}

		// Hard delete the template
		await ctx.db.delete(templateId);

		return { success: true };
	},
});
