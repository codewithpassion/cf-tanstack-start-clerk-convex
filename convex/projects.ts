/**
 * Convex queries and mutations for project management.
 * Handles project CRUD operations with soft delete support and default category seeding.
 */
import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { authorizeWorkspaceAccess } from "./lib/auth";

/**
 * Default categories created for each new project.
 * These provide common content formats with structure guidelines.
 */
const DEFAULT_CATEGORIES = [
	{
		name: "Blog Post",
		description: "Long-form content for your blog or website",
		formatGuidelines: `Word count: 800-2000 words
Structure: Title, introduction, 3-5 main sections with subheadings, conclusion
Tone: Informative and engaging
Include: Meta description (150-160 chars), featured image suggestion`,
		sortOrder: 1,
	},
	{
		name: "LinkedIn Article",
		description: "Professional long-form content for LinkedIn publishing",
		formatGuidelines: `Word count: 800-1500 words
Structure: Compelling headline, strong opening hook, clear sections, call-to-action
Tone: Professional yet conversational
Include: 3-5 relevant hashtags, engagement question at end`,
		sortOrder: 2,
	},
	{
		name: "LinkedIn Post",
		description: "Short-form professional content for LinkedIn feed",
		formatGuidelines: `Character limit: 3000 characters (optimal 1200-1500)
Structure: Hook in first line, value in body, CTA or question at end
Tone: Professional, authentic, conversational
Include: Line breaks for readability, 3-5 hashtags, optional emoji use`,
		sortOrder: 3,
	},
	{
		name: "Instagram Post",
		description: "Visual-first content with engaging caption",
		formatGuidelines: `Caption limit: 2200 characters (optimal 138-150 for feed visibility)
Structure: Hook, story/value, CTA
Tone: Casual, relatable, authentic
Include: Up to 30 hashtags (optimal 5-10), emoji usage encouraged, image direction`,
		sortOrder: 4,
	},
	{
		name: "X Thread",
		description: "Multi-post format for Twitter/X platform",
		formatGuidelines: `Per-post limit: 280 characters
Thread length: 5-15 posts optimal
Structure: Hook tweet, numbered points, summary/CTA final tweet
Tone: Concise, punchy, value-packed
Include: Thread numbering (1/X), strategic line breaks, minimal hashtags`,
		sortOrder: 5,
	},
	{
		name: "Case Study",
		description: "Structured business content showcasing results",
		formatGuidelines: `Word count: 1000-2500 words
Structure: Executive summary, challenge, solution, implementation, results, testimonial
Tone: Professional, data-driven, compelling
Include: Specific metrics, quotes, before/after comparison, visuals suggestions`,
		sortOrder: 6,
	},
];

/**
 * Validation constants for project fields.
 */
const PROJECT_NAME_MAX_LENGTH = 100;
const PROJECT_DESCRIPTION_MAX_LENGTH = 2000;

/**
 * Validate project name.
 * @throws ConvexError if name is invalid
 */
function validateProjectName(name: string): string {
	const trimmed = name.trim();
	if (!trimmed) {
		throw new ConvexError("Project name is required");
	}
	if (trimmed.length > PROJECT_NAME_MAX_LENGTH) {
		throw new ConvexError(`Project name must be ${PROJECT_NAME_MAX_LENGTH} characters or less`);
	}
	return trimmed;
}

/**
 * Validate project description.
 * @throws ConvexError if description is invalid
 */
function validateProjectDescription(description: string | undefined): string | undefined {
	if (!description) {
		return undefined;
	}
	const trimmed = description.trim();
	if (trimmed.length > PROJECT_DESCRIPTION_MAX_LENGTH) {
		throw new ConvexError(`Project description must be ${PROJECT_DESCRIPTION_MAX_LENGTH} characters or less`);
	}
	return trimmed || undefined;
}

/**
 * List all non-deleted projects for a workspace.
 * Returns projects sorted by updatedAt descending (most recent first).
 */
export const listProjects = query({
	args: {},
	handler: async (ctx) => {
		const { workspace } = await authorizeWorkspaceAccess(ctx);

		const projects = await ctx.db
			.query("projects")
			.withIndex("by_workspaceId", (q) => q.eq("workspaceId", workspace._id))
			.collect();

		// Filter out soft-deleted projects and sort by updatedAt descending
		return projects
			.filter((p) => !p.deletedAt)
			.sort((a, b) => b.updatedAt - a.updatedAt);
	},
});

/**
 * Get a single project by ID with authorization check.
 * Returns the project if it exists, is not deleted, and belongs to the user's workspace.
 */
export const getProject = query({
	args: {
		projectId: v.id("projects"),
	},
	handler: async (ctx, { projectId }) => {
		const { workspace } = await authorizeWorkspaceAccess(ctx);

		const project = await ctx.db.get(projectId);

		if (!project) {
			throw new ConvexError("Project not found");
		}

		if (project.workspaceId !== workspace._id) {
			throw new ConvexError("Project not found");
		}

		if (project.deletedAt) {
			throw new ConvexError("Project not found");
		}

		return project;
	},
});

/**
 * Get statistics for a project.
 * Returns counts of categories, brand voices, personas, and content pieces.
 * Also includes the most recent activity timestamp for the project.
 */
export const getProjectStats = query({
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

		// Count non-deleted categories
		const categories = await ctx.db
			.query("categories")
			.withIndex("by_projectId", (q) => q.eq("projectId", projectId))
			.collect();
		const categoriesCount = categories.filter((c) => !c.deletedAt).length;

		// Count non-deleted brand voices
		const brandVoices = await ctx.db
			.query("brandVoices")
			.withIndex("by_projectId", (q) => q.eq("projectId", projectId))
			.collect();
		const brandVoicesCount = brandVoices.filter((bv) => !bv.deletedAt).length;

		// Count non-deleted personas
		const personas = await ctx.db
			.query("personas")
			.withIndex("by_projectId", (q) => q.eq("projectId", projectId))
			.collect();
		const personasCount = personas.filter((p) => !p.deletedAt).length;

		// Count non-deleted content pieces
		const contentPieces = await ctx.db
			.query("contentPieces")
			.withIndex("by_projectId", (q) => q.eq("projectId", projectId))
			.collect();
		const activeContent = contentPieces.filter((cp) => !cp.deletedAt);
		const contentCount = activeContent.length;

		// Get most recent activity timestamp for the project
		const recentActivities = await ctx.db
			.query("activityLog")
			.withIndex("by_projectId", (q) => q.eq("projectId", projectId))
			.collect();

		// Sort activities by createdAt descending and get the most recent
		const sortedActivities = recentActivities.sort((a, b) => b.createdAt - a.createdAt);
		const recentActivityAt = sortedActivities.length > 0 ? sortedActivities[0].createdAt : undefined;

		return {
			categoriesCount,
			brandVoicesCount,
			personasCount,
			contentCount,
			recentActivityAt,
		};
	},
});

/**
 * Create a new project with default categories.
 * Creates the project and seeds it with 6 default content categories.
 */
export const createProject = mutation({
	args: {
		name: v.string(),
		description: v.optional(v.string()),
	},
	handler: async (ctx, { name, description }) => {
		const { workspace } = await authorizeWorkspaceAccess(ctx);

		// Validate inputs
		const validatedName = validateProjectName(name);
		const validatedDescription = validateProjectDescription(description);

		const now = Date.now();

		// Create the project
		const projectId = await ctx.db.insert("projects", {
			workspaceId: workspace._id,
			name: validatedName,
			description: validatedDescription,
			createdAt: now,
			updatedAt: now,
		});

		// Create default categories for the new project
		for (const category of DEFAULT_CATEGORIES) {
			await ctx.db.insert("categories", {
				projectId,
				name: category.name,
				description: category.description,
				formatGuidelines: category.formatGuidelines,
				isDefault: true,
				sortOrder: category.sortOrder,
				createdAt: now,
				updatedAt: now,
			});
		}

		return { projectId };
	},
});

/**
 * Update an existing project.
 * Updates the specified fields and sets updatedAt to current timestamp.
 */
export const updateProject = mutation({
	args: {
		projectId: v.id("projects"),
		name: v.optional(v.string()),
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
			throw new ConvexError("Cannot update a deleted project");
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
			updates.name = validateProjectName(name);
		}

		if (description !== undefined) {
			updates.description = validateProjectDescription(description);
		}

		await ctx.db.patch(projectId, updates);

		return { success: true };
	},
});

/**
 * Soft delete a project.
 * Sets deletedAt timestamp instead of permanently removing the record.
 */
export const deleteProject = mutation({
	args: {
		projectId: v.id("projects"),
	},
	handler: async (ctx, { projectId }) => {
		const { workspace } = await authorizeWorkspaceAccess(ctx);

		// Verify project exists and belongs to workspace
		const project = await ctx.db.get(projectId);
		if (!project || project.workspaceId !== workspace._id) {
			throw new ConvexError("Project not found");
		}

		if (project.deletedAt) {
			throw new ConvexError("Project is already deleted");
		}

		// Soft delete by setting deletedAt timestamp
		await ctx.db.patch(projectId, {
			deletedAt: Date.now(),
			updatedAt: Date.now(),
		});

		return { success: true };
	},
});
