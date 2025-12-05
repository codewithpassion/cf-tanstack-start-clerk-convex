import { useState } from "react";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/api";
import type { Id } from "@/convex/dataModel";
import type { ProjectId, ContentFilters } from "@/types/entities";
import { LoadingState } from "@/components/shared/LoadingState";
import { FileText, Layers } from "lucide-react";
import { ContentArchiveView } from "@/components/content/ContentArchiveView";
import type { SearchResult } from "@/components/content/SearchResults";

export interface ProjectDashboardProps {
	projectId: ProjectId;
}

/**
 * Project dashboard overview.
 * Shows stats, quick actions, and content list for a project.
 */
export function ProjectDashboard({ projectId }: ProjectDashboardProps) {
	// State for content list
	const [limit, setLimit] = useState(25);
	const [filters, setFilters] = useState<ContentFilters>({});
	const [searchQuery, setSearchQuery] = useState("");

	// Query all data needed for dashboard
	const contentPiecesResult = useQuery(api.contentPieces.listContentPieces, {
		projectId: projectId as Id<"projects">,
		filters,
		pagination: { limit, offset: 0 },
	});

	const categories = useQuery(api.categories.listCategories, {
		projectId: projectId as Id<"projects">,
	});

	const personas = useQuery(api.personas.listPersonas, {
		projectId: projectId as Id<"projects">,
	});

	const brandVoices = useQuery(api.brandVoices.listBrandVoices, {
		projectId: projectId as Id<"projects">,
	});

	// Search query
	const searchResults = useQuery(
		api.search.searchContent,
		searchQuery.trim()
			? {
				query: searchQuery,
				projectId: projectId as Id<"projects">,
				limit: 10,
			}
			: "skip"
	);

	// Mutations
	const deleteContentPiece = useMutation(api.contentPieces.deleteContentPiece);

	// Loading state
	if (
		contentPiecesResult === undefined ||
		categories === undefined ||
		personas === undefined ||
		brandVoices === undefined
	) {
		return <LoadingState message="Loading dashboard..." />;
	}

	const { contentPieces, totalCount } = contentPiecesResult;

	// Calculate stats
	const draftCount = contentPieces.filter((cp) => cp.status === "draft").length;
	const finalizedCount = contentPieces.filter((cp) => cp.status === "finalized").length;

	// Prepare content pieces with relations
	const contentPiecesWithRelations = contentPieces.map((cp) => ({
		...cp,
		category: categories.find((c) => c._id === cp.categoryId) || null,
		persona: personas.find((p) => p._id === cp.personaId) || null,
		brandVoice: brandVoices.find((bv) => bv._id === cp.brandVoiceId) || null,
		parentContent: cp.parentContent,
		derivedCount: cp.derivedCount,
	}));

	// Map search results
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

	// Handlers
	const handleLoadMore = () => {
		setLimit((prev) => prev + 25);
	};

	const handleNavigateToContent = (contentPieceId: string) => {
		// Navigation is handled by the Link component in ContentCard/List, 
		// but we need this prop for the view component
		window.location.href = `/projects/${projectId}/content/${contentPieceId}`;
	};

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

	return (
		<div className="space-y-8">
			{/* Stats Row */}
			<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
				<div className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
					<div>
						<p className="text-sm font-medium text-slate-500 dark:text-slate-400">Total Content</p>
						<p className="text-2xl font-semibold text-slate-900 dark:text-white mt-1">{totalCount}</p>
					</div>
					<div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-lg">
						<FileText className="w-5 h-5 text-slate-600 dark:text-slate-400" />
					</div>
				</div>

				<div className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
					<div>
						<p className="text-sm font-medium text-slate-500 dark:text-slate-400">Drafts</p>
						<p className="text-2xl font-semibold text-slate-900 dark:text-white mt-1">{draftCount}</p>
					</div>
					<div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
						<FileText className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
					</div>
				</div>

				<div className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
					<div>
						<p className="text-sm font-medium text-slate-500 dark:text-slate-400">Finalized</p>
						<p className="text-2xl font-semibold text-slate-900 dark:text-white mt-1">{finalizedCount}</p>
					</div>
					<div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
						<FileText className="w-5 h-5 text-green-600 dark:text-green-400" />
					</div>
				</div>

				<div className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
					<div>
						<p className="text-sm font-medium text-slate-500 dark:text-slate-400">Assets</p>
						<div className="flex gap-3 mt-1 text-sm">
							<span className="font-medium text-slate-900 dark:text-white">{categories.length} Cats</span>
							<span className="text-slate-300 dark:text-slate-600">|</span>
							<span className="font-medium text-slate-900 dark:text-white">{personas.length} Personas</span>
						</div>
					</div>
					<div className="p-3 bg-cyan-50 dark:bg-cyan-900/20 rounded-lg">
						<Layers className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
					</div>
				</div>
			</div>

			{/* Main Content - Content List */}
			<div className="space-y-6">
				<div className="flex items-center justify-between">
					<h2 className="text-lg font-medium text-slate-900 dark:text-white">Content</h2>
				</div>

				<ContentArchiveView
					contentPieces={contentPiecesWithRelations}
					totalCount={totalCount}
					categories={categories}
					personas={personas}
					brandVoices={brandVoices}
					filters={filters}
					onFiltersChange={setFilters}
					onLoadMore={handleLoadMore}
					hasMore={contentPieces.length < totalCount}
					onNavigateToContent={handleNavigateToContent}
					onBulkDelete={handleBulkDelete}
					searchQuery={searchQuery}
					onSearchQueryChange={setSearchQuery}
					searchResults={mappedSearchResults}
					isSearching={searchQuery.length > 0 && searchResults === undefined}
					defaultViewMode="cards"
				/>
			</div>
		</div>
	);
}
