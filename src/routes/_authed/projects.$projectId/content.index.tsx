import { useState, useMemo } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/api";
import type { Id } from "@/convex/dataModel";
import type { ContentFilters } from "@/types/entities";
import { PageHeader } from "@/components/shared/PageHeader";
import { LoadingState } from "@/components/shared/LoadingState";
import { EmptyState } from "@/components/shared/EmptyState";
import { ContentArchiveView } from "@/components/content/ContentArchiveView";
import type { SearchResult } from "@/components/content/SearchResults";

/**
 * Content archive route.
 * Displays a filterable, sortable, paginated list of content pieces for a project.
 * Includes search functionality with optional cross-project search.
 */
export const Route = createFileRoute("/_authed/projects/$projectId/content/")({
	component: ContentArchivePage,
	validateSearch: (search: Record<string, unknown>): {
		page: number;
		pageSize: number;
		categoryId?: string;
		personaId?: string;
		brandVoiceId?: string;
		status?: "draft" | "finalized";
		dateFrom?: number;
		dateTo?: number;
	} => {
		return {
			page: Number(search.page) || 1,
			pageSize: Number(search.pageSize) || 25,
			categoryId: (search.categoryId as string) || undefined,
			personaId: (search.personaId as string) || undefined,
			brandVoiceId: (search.brandVoiceId as string) || undefined,
			status: (search.status as "draft" | "finalized") || undefined,
			dateFrom: search.dateFrom ? Number(search.dateFrom) : undefined,
			dateTo: search.dateTo ? Number(search.dateTo) : undefined,
		};
	},
});

function ContentArchivePage() {
	const { projectId } = Route.useParams();
	const navigate = useNavigate({ from: Route.fullPath });
	const search = Route.useSearch();

	const { page, pageSize, categoryId, personaId, brandVoiceId, status, dateFrom, dateTo } = search;

	// Search state
	const [searchQuery, setSearchQuery] = useState("");
	const [crossProjectSearch, setCrossProjectSearch] = useState(false);

	// Build filters object from URL params
	const filters: ContentFilters = useMemo(() => {
		const f: ContentFilters = {};
		if (categoryId) f.categoryId = categoryId as Id<"categories">;
		if (personaId) f.personaId = personaId as Id<"personas">;
		if (brandVoiceId) f.brandVoiceId = brandVoiceId as Id<"brandVoices">;
		if (status) f.status = status;
		if (dateFrom) f.dateFrom = dateFrom;
		if (dateTo) f.dateTo = dateTo;
		return f;
	}, [categoryId, personaId, brandVoiceId, status, dateFrom, dateTo]);

	// Query content pieces with pagination
	const contentPiecesResult = useQuery(api.contentPieces.listContentPieces, {
		projectId: projectId as Id<"projects">,
		filters,
		pagination: {
			limit: pageSize,
			offset: (page - 1) * pageSize,
		},
	});

	// Query related entities for filters
	const categories = useQuery(api.categories.listCategories, {
		projectId: projectId as Id<"projects">,
	});

	const personas = useQuery(api.personas.listPersonas, {
		projectId: projectId as Id<"projects">,
	});

	const brandVoices = useQuery(api.brandVoices.listBrandVoices, {
		projectId: projectId as Id<"projects">,
	});

	// Get workspace for cross-project search
	const workspace = useQuery(api.workspaces.getMyWorkspace);

	// Search query
	const searchResults = useQuery(
		api.search.searchContent,
		searchQuery.trim()
			? crossProjectSearch
				? {
						query: searchQuery,
						workspaceId: workspace?._id,
						limit: 10,
				  }
				: {
						query: searchQuery,
						projectId: projectId as Id<"projects">,
						limit: 10,
				  }
			: "skip"
	);

	// Mutations
	const deleteContentPiece = useMutation(api.contentPieces.deleteContentPiece);

	// Handle filter changes
	const handleFiltersChange = (newFilters: ContentFilters) => {
		navigate({
			search: {
				page: 1, // Reset to first page when filters change
				pageSize,
				categoryId: newFilters.categoryId?.toString(),
				personaId: newFilters.personaId?.toString(),
				brandVoiceId: newFilters.brandVoiceId?.toString(),
				status: newFilters.status,
				dateFrom: newFilters.dateFrom,
				dateTo: newFilters.dateTo,
			},
		});
	};

	// Handle pagination
	const handlePageChange = (newPage: number) => {
		navigate({
			search: {
				...search,
				page: newPage,
			},
		});
	};

	const handlePageSizeChange = (newPageSize: number) => {
		navigate({
			search: {
				...search,
				page: 1, // Reset to first page when page size changes
				pageSize: newPageSize,
			},
		});
	};

	// Handle navigation to content editor
	const handleNavigateToContent = (contentPieceId: string) => {
		navigate({
			to: "/projects/$projectId/content/$contentId",
			params: {
				projectId,
				contentId: contentPieceId,
			},
		});
	};

	// Handle bulk delete
	const handleBulkDelete = async (contentPieceIds: string[]) => {
		try {
			await Promise.all(
				contentPieceIds.map((id) =>
					deleteContentPiece({ contentPieceId: id as Id<"contentPieces"> })
				)
			);
		} catch (error) {
			console.error("Failed to delete content pieces:", error);
			alert("Failed to delete content pieces. Please try again.");
		}
	};

	// Handle create new content
	const handleCreateContent = () => {
		navigate({
			to: "/projects/$projectId/content/new",
			params: { projectId },
		});
	};

	// Loading states
	if (
		contentPiecesResult === undefined ||
		categories === undefined ||
		personas === undefined ||
		brandVoices === undefined
	) {
		return <LoadingState message="Loading content..." />;
	}

	const { contentPieces, totalCount } = contentPiecesResult;

	// Fetch related entities for each content piece
	// Note: In a production app, we'd use the getContentPieceWithRelations query
	// or batch these queries, but for now we'll use the data we have
	const contentPiecesWithRelations = contentPieces.map((cp) => ({
		...cp,
		category: categories.find((c) => c._id === cp.categoryId) || null,
		persona: personas.find((p) => p._id === cp.personaId) || null,
		brandVoice: brandVoices.find((bv) => bv._id === cp.brandVoiceId) || null,
	}));

	// Map search results to SearchResult type
	const mappedSearchResults: SearchResult[] =
		searchResults?.results?.map((result) => ({
			_id: result._id,
			title: result.title,
			snippet: result.snippet,
			categoryName: result.categoryName,
			projectName: result.projectName,
			projectId: result.projectId,
			status: result.status,
			updatedAt: result.updatedAt,
		})) || [];

	return (
		<div>
			<PageHeader
				title="Content"
				description="Manage and organize your content pieces"
				action={
					<button
						type="button"
						onClick={handleCreateContent}
						className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-cyan-600 hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500"
					>
						<svg
							className="-ml-1 mr-2 h-5 w-5"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={2}
								d="M12 4v16m8-8H4"
							/>
						</svg>
						Create Content
					</button>
				}
			/>

			{totalCount === 0 && Object.keys(filters).length === 0 && !searchQuery ? (
				<EmptyState
					title="No content yet"
					description="Get started by creating your first content piece"
				/>
			) : (
				<ContentArchiveView
					contentPieces={contentPiecesWithRelations}
					totalCount={totalCount}
					categories={categories}
					personas={personas}
					brandVoices={brandVoices}
					filters={filters}
					searchQuery={searchQuery}
					searchResults={mappedSearchResults}
					showCrossProjectSearch={crossProjectSearch}
					currentPage={page}
					pageSize={pageSize}
					onFiltersChange={handleFiltersChange}
					onSearchQueryChange={setSearchQuery}
					onCrossProjectSearchToggle={setCrossProjectSearch}
					onPageChange={handlePageChange}
					onPageSizeChange={handlePageSizeChange}
					onNavigateToContent={handleNavigateToContent}
					onBulkDelete={handleBulkDelete}
				/>
			)}
		</div>
	);
}
