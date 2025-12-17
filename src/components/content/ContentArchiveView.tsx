import { useState, useEffect } from "react";
import type { ContentPiece, Category, Persona, BrandVoice, ContentFilters } from "@/types/entities";
import { ContentArchiveList } from "./ContentArchiveList";
import { ContentFilters as ContentFiltersComponent } from "./ContentFilters";
import { ContentCard } from "./ContentCard";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { SearchInput } from "./SearchInput";
import { SearchResults, type SearchResult } from "./SearchResults";

export interface ContentArchiveViewProps {
	contentPieces: (ContentPiece & {
		category: { name: string } | null;
		persona: { name: string } | null;
		brandVoice: { name: string } | null;
		parentContent?: { _id: string; title: string } | null;
		derivedCount?: number;
	})[];
	totalCount: number;
	categories: Pick<Category, "_id" | "name">[];
	personas: Pick<Persona, "_id" | "name">[];
	brandVoices: Pick<BrandVoice, "_id" | "name">[];
	filters: ContentFilters;
	onFiltersChange: (filters: ContentFilters) => void;
	onLoadMore: () => void;
	hasMore: boolean;
	onNavigateToContent: (contentPieceId: string) => void;
	onBulkDelete: (contentPieceIds: string[]) => void;
	searchQuery?: string;
	onSearchQueryChange?: (query: string) => void;
	searchResults?: SearchResult[];
	isSearching?: boolean;
	showCrossProjectSearch?: boolean;
	onCrossProjectSearchToggle?: (enabled: boolean) => void;
	defaultViewMode?: ViewMode;
}

type ViewMode = "table" | "cards";

/**
 * Main content archive view component that orchestrates the filter controls,
 * content list/cards, pagination, bulk actions, and search.
 */
export function ContentArchiveView({
	contentPieces,
	totalCount,
	categories,
	personas,
	brandVoices,
	filters,
	onFiltersChange,
	onLoadMore,
	hasMore,
	onNavigateToContent,
	onBulkDelete,
	searchQuery = "",
	onSearchQueryChange,
	searchResults = [],
	isSearching = false,
	showCrossProjectSearch = false,
	onCrossProjectSearchToggle,
	defaultViewMode = "table",
}: ContentArchiveViewProps) {
	// Initialize view mode from localStorage or use default
	const [viewMode, setViewMode] = useState<ViewMode>(() => {
		if (typeof window === "undefined") return defaultViewMode;
		const stored = localStorage.getItem("contentArchiveViewMode");
		return (stored === "table" || stored === "cards") ? stored : defaultViewMode;
	});
	const [selectedIds, setSelectedIds] = useState<string[]>([]);

	// Persist view mode to localStorage whenever it changes
	useEffect(() => {
		if (typeof window !== "undefined") {
			localStorage.setItem("contentArchiveViewMode", viewMode);
		}
	}, [viewMode]);
	const [sortColumn, setSortColumn] = useState<
		"title" | "category" | "status" | "createdAt" | "updatedAt"
	>("updatedAt");
	const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
	const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
	const [showFilters, setShowFilters] = useState(false);

	const handleSort = (column: typeof sortColumn) => {
		if (sortColumn === column) {
			setSortDirection(sortDirection === "asc" ? "desc" : "asc");
		} else {
			setSortColumn(column);
			setSortDirection("desc");
		}
	};

	const handleBulkDelete = () => {
		if (selectedIds.length > 0) {
			setShowDeleteConfirm(true);
		}
	};

	const handleConfirmBulkDelete = () => {
		onBulkDelete(selectedIds);
		setSelectedIds([]);
		setShowDeleteConfirm(false);
	};

	const handleSearchResultClick = (contentPieceId: string, _projectId: string) => {
		onNavigateToContent(contentPieceId);
		// Clear search when navigating to a result
		if (onSearchQueryChange) {
			onSearchQueryChange("");
		}
	};

	return (
		<div>
			{/* Search and Filters */}
			<div className="mb-6 space-y-4">
				{/* Search Input */}
				{onSearchQueryChange && (
					<div className="relative">
						<div className="flex items-center gap-4">
							<div className="flex-1">
								<SearchInput
									value={searchQuery}
									onChange={onSearchQueryChange}
									onSearch={onSearchQueryChange}
									isLoading={isSearching}
									placeholder="Search content by title or content..."
								/>
								{searchQuery && (
									<SearchResults
										results={searchResults}
										query={searchQuery}
										isLoading={isSearching}
										onResultClick={handleSearchResultClick}
										showProjectName={showCrossProjectSearch}
									/>
								)}
							</div>

							<button
								type="button"
								onClick={() => setShowFilters(!showFilters)}
								className={`px-4 py-2 text-sm font-medium rounded-md border transition-colors ${showFilters
									? "bg-slate-100 text-slate-900 border-slate-300 dark:bg-slate-800 dark:text-white dark:border-slate-700"
									: "bg-white text-slate-700 border-slate-300 hover:bg-slate-50 dark:bg-slate-900 dark:text-slate-300 dark:border-slate-700 dark:hover:bg-slate-800"
									}`}
							>
								{showFilters ? "Hide Filters" : "Show Filters"}
							</button>

							{onCrossProjectSearchToggle && (
								<label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300 whitespace-nowrap">
									<input
										type="checkbox"
										checked={showCrossProjectSearch}
										onChange={(e) => onCrossProjectSearchToggle(e.target.checked)}
										className="h-4 w-4 rounded border-slate-300 dark:border-slate-600 text-cyan-600 focus:ring-cyan-500 dark:bg-slate-800"
									/>
									Search all projects
								</label>
							)}
						</div>
					</div>
				)}

				{/* Filters */}
				{showFilters && (
					<ContentFiltersComponent
						categories={categories}
						personas={personas}
						brandVoices={brandVoices}
						filters={filters}
						onFiltersChange={onFiltersChange}
					/>
				)}
			</div>

			{/* View Mode Toggle and Bulk Actions */}
			<div className="flex items-center justify-between mb-4">
				<div className="flex items-center gap-4">
					{/* View Mode Toggle */}
					<div className="flex rounded-md shadow-sm">
						<button
							type="button"
							onClick={() => setViewMode("table")}
							className={`px-4 py-2 text-sm font-medium rounded-l-md border ${viewMode === "table"
								? "bg-cyan-600 text-white border-cyan-600"
								: "bg-white text-slate-700 border-slate-300 hover:bg-slate-50 dark:bg-slate-900 dark:text-slate-300 dark:border-slate-700 dark:hover:bg-slate-800"
								}`}
						>
							Table
						</button>
						<button
							type="button"
							onClick={() => setViewMode("cards")}
							className={`px-4 py-2 text-sm font-medium rounded-r-md border-t border-r border-b ${viewMode === "cards"
								? "bg-cyan-600 text-white border-cyan-600"
								: "bg-white text-slate-700 border-slate-300 hover:bg-slate-50 dark:bg-slate-900 dark:text-slate-300 dark:border-slate-700 dark:hover:bg-slate-800"
								}`}
						>
							Cards
						</button>
					</div>
				</div>

				{/* Bulk Actions */}
				{selectedIds.length > 0 && (
					<div className="flex items-center gap-4">
						<span className="text-sm text-slate-700">
							{selectedIds.length} selected
						</span>
						<button
							type="button"
							onClick={handleBulkDelete}
							className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
						>
							Delete Selected
						</button>
					</div>
				)}
			</div>

			{/* Content Display */}
			{viewMode === "table" ? (
				<ContentArchiveList
					contentPieces={contentPieces}
					onEdit={onNavigateToContent}
					onSelectionChange={setSelectedIds}
					selectedIds={selectedIds}
					sortColumn={sortColumn}
					sortDirection={sortDirection}
					onSort={handleSort}
				/>
			) : (
				<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
					{contentPieces.map((contentPiece) => (
						<ContentCard
							key={contentPiece._id}
							contentPiece={contentPiece}
							onClick={onNavigateToContent}
							isSelected={selectedIds.includes(contentPiece._id)}
							onSelect={(id, selected) => {
								if (selected) {
									setSelectedIds([...selectedIds, id]);
								} else {
									setSelectedIds(selectedIds.filter((sid) => sid !== id));
								}
							}}
						/>
					))}
				</div>
			)}

			{/* Load More */}
			{hasMore ? (
				<div className="mt-8 flex justify-center">
					<button
						type="button"
						onClick={onLoadMore}
						className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-cyan-600 hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500"
					>
						Load More
					</button>
				</div>
			) : (
				totalCount > 0 && (
					<div className="mt-8 flex justify-center">
						<div className="bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-sm px-4 py-2 rounded-full border border-slate-200 dark:border-slate-700">
							No more content to load
						</div>
					</div>
				)
			)}

			{/* Delete Confirmation Dialog */}
			<ConfirmDialog
				isOpen={showDeleteConfirm}
				onClose={() => {
					setShowDeleteConfirm(false);
				}}
				onConfirm={handleConfirmBulkDelete}
				title={`Delete ${selectedIds.length} Content Piece${selectedIds.length > 1 ? "s" : ""}`}
				message={`Are you sure you want to delete ${selectedIds.length} content piece${selectedIds.length > 1 ? "s" : ""}? This action cannot be undone.`}
				confirmLabel="Delete"
				cancelLabel="Cancel"
			/>
		</div>
	);
}
