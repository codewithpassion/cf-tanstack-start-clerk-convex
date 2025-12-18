import { useState, useEffect, memo } from "react";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/api";
import type { Id } from "@/convex/dataModel";
import type { ProjectId, ContentFilters } from "@/types/entities";
import { LoadingState } from "@/components/shared/LoadingState";
import { FileText, Layers, Plus } from "lucide-react";
import { ContentArchiveView } from "@/components/content/ContentArchiveView";
import type { SearchResult } from "@/components/content/SearchResults";
import { Link } from "@tanstack/react-router";

export interface ProjectDashboardProps {
	projectId: ProjectId;
}

interface DashboardStatsProps {
	totalCount: number;
	draftCount: number;
	finalizedCount: number;
	categoriesCount: number;
	personasCount: number;
	hasAnimated: boolean;
}

/**
 * Memoized stats cards component that only re-renders when counts actually change.
 * This prevents the blink/flash when filters change.
 */
const DashboardStats = memo(function DashboardStats({
	totalCount,
	draftCount,
	finalizedCount,
	categoriesCount,
	personasCount,
	hasAnimated,
}: DashboardStatsProps) {
	return (
		<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
			{/* Total Content Card */}
			<div className={`${hasAnimated ? "" : "animate-fade-up-delay-1"} bg-gradient-to-br from-white via-slate-50 to-slate-100 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800/80 rounded-xl p-5 border border-slate-200 dark:border-slate-800 dark:border-t-2 dark:border-t-amber-400/30 flex items-center justify-between transition-all duration-300 hover:-translate-y-1 hover:shadow-lg dark:hover:shadow-[0_8px_30px_rgba(0,0,0,0.3),0_0_30px_rgba(251,191,36,0.15)]`}>
				<div>
					<p className="text-sm font-medium text-slate-500 dark:text-slate-400">Total Content</p>
					<p className="text-2xl font-bold text-slate-900 dark:text-amber-400 mt-1 font-['Lexend']">{totalCount}</p>
				</div>
				<div className="p-3 bg-slate-200 dark:bg-amber-500/10 rounded-lg dark:shadow-[0_0_20px_rgba(251,191,36,0.15)]">
					<FileText className="w-5 h-5 text-slate-600 dark:text-amber-400" />
				</div>
			</div>

			{/* Drafts Card */}
			<div className={`${hasAnimated ? "" : "animate-fade-up-delay-2"} bg-gradient-to-br from-white via-amber-50/30 to-amber-100/50 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800/80 rounded-xl p-5 border border-slate-200 dark:border-slate-800 dark:border-t-2 dark:border-t-amber-400/30 flex items-center justify-between transition-all duration-300 hover:-translate-y-1 hover:shadow-lg dark:hover:shadow-[0_8px_30px_rgba(0,0,0,0.3),0_0_30px_rgba(251,191,36,0.15)]`}>
				<div>
					<p className="text-sm font-medium text-slate-500 dark:text-slate-400">Drafts</p>
					<p className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1 font-['Lexend']">{draftCount}</p>
				</div>
				<div className="p-3 bg-amber-100 dark:bg-amber-500/10 rounded-lg dark:shadow-[0_0_20px_rgba(251,191,36,0.15)]">
					<FileText className="w-5 h-5 text-amber-600 dark:text-amber-400" />
				</div>
			</div>

			{/* Finalized Card */}
			<div className={`${hasAnimated ? "" : "animate-fade-up-delay-3"} bg-gradient-to-br from-white via-green-50/30 to-green-100/50 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800/80 rounded-xl p-5 border border-slate-200 dark:border-slate-800 dark:border-t-2 dark:border-t-amber-400/30 flex items-center justify-between transition-all duration-300 hover:-translate-y-1 hover:shadow-lg dark:hover:shadow-[0_8px_30px_rgba(0,0,0,0.3),0_0_30px_rgba(251,191,36,0.15)]`}>
				<div>
					<p className="text-sm font-medium text-slate-500 dark:text-slate-400">Finalized</p>
					<p className="text-2xl font-bold text-green-600 dark:text-amber-400 mt-1 font-['Lexend']">{finalizedCount}</p>
				</div>
				<div className="p-3 bg-green-100 dark:bg-amber-500/10 rounded-lg dark:shadow-[0_0_20px_rgba(251,191,36,0.15)]">
					<FileText className="w-5 h-5 text-green-600 dark:text-green-400" />
				</div>
			</div>

			{/* Assets Card */}
			<div className={`${hasAnimated ? "" : "animate-fade-up-delay-4"} bg-gradient-to-br from-white via-cyan-50/30 to-cyan-100/50 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800/80 rounded-xl p-5 border border-slate-200 dark:border-slate-800 dark:border-t-2 dark:border-t-amber-400/30 flex items-center justify-between transition-all duration-300 hover:-translate-y-1 hover:shadow-lg dark:hover:shadow-[0_8px_30px_rgba(0,0,0,0.3),0_0_30px_rgba(251,191,36,0.15)]`}>
				<div>
					<p className="text-sm font-medium text-slate-500 dark:text-slate-400">Assets</p>
					<div className="flex gap-3 mt-1 text-sm">
						<span className="font-medium text-slate-900 dark:text-amber-400 font-['Lexend']">{categoriesCount} Cats</span>
						<span className="text-slate-300 dark:text-slate-600">|</span>
						<span className="font-medium text-slate-900 dark:text-amber-400 font-['Lexend']">{personasCount} Personas</span>
					</div>
				</div>
				<div className="p-3 bg-cyan-100 dark:bg-amber-500/10 rounded-lg dark:shadow-[0_0_20px_rgba(251,191,36,0.15)]">
					<Layers className="w-5 h-5 text-cyan-600 dark:text-amber-400" />
				</div>
			</div>
		</div>
	);
});

/**
 * Project dashboard overview.
 * Shows stats, quick actions, and content list for a project.
 */
export function ProjectDashboard({ projectId }: ProjectDashboardProps) {
	// State for content list
	const [limit, setLimit] = useState(25);
	const [filters, setFilters] = useState<ContentFilters>({});
	const [searchQuery, setSearchQuery] = useState("");

	// Track if initial animation has played
	const [hasAnimated, setHasAnimated] = useState(false);

	// Persist filter visibility in localStorage
	const [showFilters, setShowFilters] = useState<boolean>(() => {
		if (typeof window === "undefined") return false;
		const stored = localStorage.getItem("contentFiltersVisible");
		return stored === "true";
	});

	useEffect(() => {
		setHasAnimated(true);
	}, []);

	useEffect(() => {
		if (typeof window !== "undefined") {
			localStorage.setItem("contentFiltersVisible", String(showFilters));
		}
	}, [showFilters]);

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
		<div className="container mx-auto pt-6 pb-6 space-y-8">
			{/* Stats Row */}
			<DashboardStats
				totalCount={totalCount}
				draftCount={draftCount}
				finalizedCount={finalizedCount}
				categoriesCount={categories.length}
				personasCount={personas.length}
				hasAnimated={hasAnimated}
			/>

			{/* Main Content - Content List */}
			<div className={`${hasAnimated ? "" : "animate-content-fade"} space-y-6`}>
				<div className="flex items-center justify-between">
					<h2 className="text-lg font-medium text-slate-900 dark:text-white font-['Lexend']">Content</h2>
					<Link
						to="/projects/$projectId/content/new"
						params={{ projectId }}
						className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 dark:bg-amber-500 dark:hover:bg-amber-400 text-white font-medium rounded-lg transition-all duration-300 hover:shadow-lg hover:shadow-amber-500/30 dark:hover:shadow-amber-400/30"
					>
						<Plus className="w-4 h-4" />
						New Content
					</Link>
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
					showFilters={showFilters}
					onShowFiltersChange={setShowFilters}
				/>
			</div>
		</div>
	);
}
