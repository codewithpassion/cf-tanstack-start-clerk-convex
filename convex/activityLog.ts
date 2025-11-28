/**
 * Convex queries and mutations for activity log management.
 * Handles logging of workspace and project activities, and retrieval for dashboard feeds.
 */
import { ConvexError, v } from "convex/values";
import { internalMutation, query } from "./_generated/server";
import { authorizeWorkspaceAccess } from "./lib/auth";

/**
 * Validation constants for activity log fields.
 */
const ACTIVITY_LOG_METADATA_MAX_LENGTH = 5000;

/**
 * Default limit for activity feed queries (spec requirement).
 */
const DEFAULT_ACTIVITY_LIMIT = 10;

/**
 * Validate metadata if provided.
 * Must be valid JSON and within length limit.
 * @throws ConvexError if metadata is invalid
 */
function validateMetadata(metadata: string): string {
	if (metadata.length > ACTIVITY_LOG_METADATA_MAX_LENGTH) {
		throw new ConvexError(
			`Activity metadata must be ${ACTIVITY_LOG_METADATA_MAX_LENGTH} characters or less`
		);
	}

	// Validate JSON format
	try {
		JSON.parse(metadata);
	} catch {
		throw new ConvexError("Activity metadata must be valid JSON");
	}

	return metadata;
}

/**
 * Log an activity event (internal mutation).
 * Called by other mutations to record workspace and project activities.
 * Supports all activity types including content and project actions.
 */
export const logActivity = internalMutation({
	args: {
		workspaceId: v.id("workspaces"),
		projectId: v.id("projects"),
		contentPieceId: v.optional(v.id("contentPieces")),
		action: v.union(
			v.literal("content_created"),
			v.literal("content_edited"),
			v.literal("content_finalized"),
			v.literal("content_deleted"),
			v.literal("project_created"),
			v.literal("derived_content_created")
		),
		metadata: v.optional(v.string()),
	},
	handler: async (
		ctx,
		{ workspaceId, projectId, contentPieceId, action, metadata }
	) => {
		// Validate metadata if provided
		const validatedMetadata = metadata ? validateMetadata(metadata) : undefined;

		const now = Date.now();

		// Create the activity log entry
		const activityId = await ctx.db.insert("activityLog", {
			workspaceId,
			projectId,
			contentPieceId,
			action,
			metadata: validatedMetadata,
			createdAt: now,
		});

		return { activityId };
	},
});

/**
 * Get recent activity for a workspace.
 * Returns the most recent activities across all projects in the workspace.
 * Used for dashboard activity feed showing last 10 content actions.
 */
export const getRecentActivity = query({
	args: {
		workspaceId: v.id("workspaces"),
		limit: v.optional(v.number()),
	},
	handler: async (ctx, { workspaceId, limit }) => {
		const { workspace } = await authorizeWorkspaceAccess(ctx);

		// Verify requested workspace matches user's workspace
		if (workspaceId !== workspace._id) {
			throw new ConvexError("Unauthorized access to workspace activity");
		}

		// Query all activities for the workspace
		const activities = await ctx.db
			.query("activityLog")
			.withIndex("by_workspaceId_createdAt", (q) =>
				q.eq("workspaceId", workspaceId)
			)
			.order("desc")
			.take(limit ?? DEFAULT_ACTIVITY_LIMIT);

		// Fetch related entities for display (project names, content titles)
		const enrichedActivities = await Promise.all(
			activities.map(async (activity) => {
				const project = await ctx.db.get(activity.projectId);
				const contentPiece = activity.contentPieceId
					? await ctx.db.get(activity.contentPieceId)
					: null;

				return {
					...activity,
					project: project && !project.deletedAt ? project : null,
					contentPiece:
						contentPiece && !contentPiece.deletedAt ? contentPiece : null,
				};
			})
		);

		return enrichedActivities;
	},
});

/**
 * Get activity for a specific project.
 * Returns activities filtered to a single project, ordered by most recent.
 * Used for project-specific activity views.
 */
export const getProjectActivity = query({
	args: {
		projectId: v.id("projects"),
		limit: v.optional(v.number()),
	},
	handler: async (ctx, { projectId, limit }) => {
		const { workspace } = await authorizeWorkspaceAccess(ctx);

		// Verify project exists and belongs to user's workspace
		const project = await ctx.db.get(projectId);
		if (!project || project.workspaceId !== workspace._id || project.deletedAt) {
			throw new ConvexError("Project not found");
		}

		// Query activities for the specific project
		const activities = await ctx.db
			.query("activityLog")
			.withIndex("by_projectId", (q) => q.eq("projectId", projectId))
			.collect();

		// Sort by createdAt descending (most recent first)
		activities.sort((a, b) => b.createdAt - a.createdAt);

		// Apply limit (default 10)
		const activityLimit = limit ?? DEFAULT_ACTIVITY_LIMIT;
		const limitedActivities = activities.slice(0, activityLimit);

		// Fetch related content pieces for display
		const enrichedActivities = await Promise.all(
			limitedActivities.map(async (activity) => {
				const contentPiece = activity.contentPieceId
					? await ctx.db.get(activity.contentPieceId)
					: null;

				return {
					...activity,
					contentPiece:
						contentPiece && !contentPiece.deletedAt ? contentPiece : null,
				};
			})
		);

		return enrichedActivities;
	},
});
