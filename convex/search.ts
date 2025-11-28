/**
 * Convex queries for content search functionality.
 * Provides full-text search across content pieces with project and workspace scoping.
 */
import { ConvexError, v } from "convex/values";
import { query } from "./_generated/server";
import { authorizeWorkspaceAccess } from "./lib/auth";

/**
 * Maximum length for search result snippets.
 */
const SNIPPET_LENGTH = 150;

/**
 * Maximum number of search results per page.
 */
const MAX_RESULTS_PER_PAGE = 50;

/**
 * Extract a snippet around the first occurrence of the search query in text.
 * Returns up to SNIPPET_LENGTH characters with the match near the center.
 */
function extractSnippet(text: string, query: string): string {
	const lowerText = text.toLowerCase();
	const lowerQuery = query.toLowerCase();
	const matchIndex = lowerText.indexOf(lowerQuery);

	if (matchIndex === -1) {
		// No match found, return beginning of text
		return text.substring(0, SNIPPET_LENGTH) + (text.length > SNIPPET_LENGTH ? "..." : "");
	}

	// Calculate snippet start position (put match near center)
	const halfSnippet = Math.floor(SNIPPET_LENGTH / 2);
	const start = Math.max(0, matchIndex - halfSnippet);
	const end = Math.min(text.length, start + SNIPPET_LENGTH);

	let snippet = text.substring(start, end);

	// Add ellipsis if we're not at the beginning/end
	if (start > 0) {
		snippet = "..." + snippet;
	}
	if (end < text.length) {
		snippet = snippet + "...";
	}

	return snippet;
}

/**
 * Search content pieces by title and content.
 * Supports both project-scoped and cross-project (workspace-scoped) search.
 */
export const searchContent = query({
	args: {
		query: v.string(),
		projectId: v.optional(v.id("projects")),
		workspaceId: v.optional(v.id("workspaces")),
		limit: v.optional(v.number()),
		offset: v.optional(v.number()),
	},
	handler: async (ctx, { query: searchQuery, projectId, workspaceId, limit, offset }) => {
		const { workspace } = await authorizeWorkspaceAccess(ctx);

		// Validate that either projectId or workspaceId is provided
		if (!projectId && !workspaceId) {
			throw new ConvexError("Either projectId or workspaceId must be provided");
		}

		// If workspaceId is provided, verify it matches the user's workspace
		if (workspaceId && workspaceId !== workspace._id) {
			throw new ConvexError("Invalid workspace");
		}

		// If projectId is provided, verify it belongs to the user's workspace
		if (projectId) {
			const project = await ctx.db.get(projectId);
			if (!project || project.workspaceId !== workspace._id || project.deletedAt) {
				throw new ConvexError("Project not found");
			}
		}

		// Validate search query
		const trimmedQuery = searchQuery.trim();
		if (!trimmedQuery) {
			return {
				results: [],
				totalCount: 0,
				hasMore: false,
			};
		}

		// Get all content pieces based on scope
		let contentPieces;
		if (projectId) {
			// Project-scoped search
			contentPieces = await ctx.db
				.query("contentPieces")
				.withIndex("by_projectId", (q) => q.eq("projectId", projectId))
				.collect();
		} else {
			// Workspace-scoped search (cross-project)
			// Get all projects in workspace first
			const projects = await ctx.db
				.query("projects")
				.withIndex("by_workspaceId", (q) => q.eq("workspaceId", workspace._id))
				.collect();

			const activeProjects = projects.filter((p) => !p.deletedAt);

			// Get content from all active projects
			const allContent = await Promise.all(
				activeProjects.map((project) =>
					ctx.db
						.query("contentPieces")
						.withIndex("by_projectId", (q) => q.eq("projectId", project._id))
						.collect()
				)
			);

			contentPieces = allContent.flat();
		}

		// Filter out soft-deleted content
		contentPieces = contentPieces.filter((cp) => !cp.deletedAt);

		// Perform case-insensitive search on title and content
		const lowerQuery = trimmedQuery.toLowerCase();
		const matchingPieces = contentPieces.filter((cp) => {
			const titleMatch = cp.title.toLowerCase().includes(lowerQuery);
			const contentMatch = cp.content.toLowerCase().includes(lowerQuery);
			return titleMatch || contentMatch;
		});

		// Sort by relevance (title matches first, then by updated date)
		matchingPieces.sort((a, b) => {
			const aTitleMatch = a.title.toLowerCase().includes(lowerQuery);
			const bTitleMatch = b.title.toLowerCase().includes(lowerQuery);

			if (aTitleMatch && !bTitleMatch) {
				return -1;
			}
			if (!aTitleMatch && bTitleMatch) {
				return 1;
			}

			// Both have same match type, sort by updated date
			return b.updatedAt - a.updatedAt;
		});

		// Get total count before pagination
		const totalCount = matchingPieces.length;

		// Apply pagination
		const pageLimit = Math.min(limit ?? 25, MAX_RESULTS_PER_PAGE);
		const pageOffset = offset ?? 0;
		const paginatedPieces = matchingPieces.slice(pageOffset, pageOffset + pageLimit);

		// Build search results with snippets and metadata
		const results = await Promise.all(
			paginatedPieces.map(async (cp) => {
				// Fetch category for display
				const category = await ctx.db.get(cp.categoryId);

				// Fetch project for cross-project search
				const project = await ctx.db.get(cp.projectId);

				// Extract snippet from content
				const snippet = extractSnippet(cp.content, trimmedQuery);

				return {
					_id: cp._id,
					title: cp.title,
					snippet,
					categoryName: category && !category.deletedAt ? category.name : null,
					projectName: project && !project.deletedAt ? project.name : null,
					projectId: cp.projectId,
					status: cp.status,
					updatedAt: cp.updatedAt,
				};
			})
		);

		return {
			results,
			totalCount,
			hasMore: pageOffset + pageLimit < totalCount,
		};
	},
});
