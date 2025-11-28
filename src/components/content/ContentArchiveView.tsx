import { useState } from "react";
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
	})[];
	totalCount: number;
	categories: Pick<Category, "_id" | "name">[];
	personas: Pick<Persona, "_id" | "name">[];
	brandVoices: Pick<BrandVoice, "_id" | "name">[];
	filters: ContentFilters;
	onFiltersChange: (filters: ContentFilters) => void;
	onPageChange: (page: number) => void;
	onPageSizeChange: (pageSize: number) => void;
	onNavigateToContent: (contentPieceId: string) => void;
	onBulkDelete: (contentPieceIds: string[]) => void;
	currentPage: number;
	pageSize: number;
	searchQuery?: string;
	onSearchQueryChange?: (query: string) => void;
	searchResults?: SearchResult[];
	isSearching?: boolean;
	showCrossProjectSearch?: boolean;
	onCrossProjectSearchToggle?: (enabled: boolean) => void;
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
	onPageChange,
	onPageSizeChange,
	onNavigateToContent,
	onBulkDelete,
	currentPage,
	pageSize,
	searchQuery = "",
	onSearchQueryChange,
	searchResults = [],
	isSearching = false,
	showCrossProjectSearch = false,
	onCrossProjectSearchToggle,
}: ContentArchiveViewProps) {
	const [viewMode, setViewMode] = useState<ViewMode>("table");
	const [selectedIds, setSelectedIds] = useState<string[]>([]);
	const [sortColumn, setSortColumn] = useState<
		"title" | "category" | "status" | "createdAt" | "updatedAt"
	>("updatedAt");
	const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
	const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
	const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

	const handleSort = (column: typeof sortColumn) => {
		if (sortColumn === column) {
			setSortDirection(sortDirection === "asc" ? "desc" : "asc");
		} else {
			setSortColumn(column);
			setSortDirection("desc");
		}
	};

	const handleDelete = (contentPieceId: string) => {
		setDeleteTargetId(contentPieceId);
		setShowDeleteConfirm(true);
	};

	const handleConfirmDelete = () => {
		if (deleteTargetId) {
			onBulkDelete([deleteTargetId]);
			setDeleteTargetId(null);
		}
		setShowDeleteConfirm(false);
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

	const startIndex = (currentPage - 1) * pageSize + 1;
	const endIndex = Math.min(currentPage * pageSize, totalCount);
	const totalPages = Math.ceil(totalCount / pageSize);

	const canGoPrevious = currentPage > 1;
	const canGoNext = currentPage < totalPages;

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
							{onCrossProjectSearchToggle && (
								<label className="flex items-center gap-2 text-sm text-gray-700 whitespace-nowrap">
									<input
										type="checkbox"
										checked={showCrossProjectSearch}
										onChange={(e) => onCrossProjectSearchToggle(e.target.checked)}
										className="h-4 w-4 rounded border-gray-300 text-cyan-600 focus:ring-cyan-500"
									/>
									Search all projects
								</label>
							)}
						</div>
					</div>
				)}

				{/* Filters */}
				<ContentFiltersComponent
					categories={categories}
					personas={personas}
					brandVoices={brandVoices}
					filters={filters}
					onFiltersChange={onFiltersChange}
				/>
			</div>

			{/* View Mode Toggle and Bulk Actions */}
			<div className="flex items-center justify-between mb-4">
				<div className="flex items-center gap-4">
					{/* View Mode Toggle */}
					<div className="flex rounded-md shadow-sm">
						<button
							type="button"
							onClick={() => setViewMode("table")}
							className={`px-4 py-2 text-sm font-medium rounded-l-md border ${
								viewMode === "table"
									? "bg-cyan-600 text-white border-cyan-600"
									: "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
							}`}
						>
							Table
						</button>
						<button
							type="button"
							onClick={() => setViewMode("cards")}
							className={`px-4 py-2 text-sm font-medium rounded-r-md border-t border-r border-b ${
								viewMode === "cards"
									? "bg-cyan-600 text-white border-cyan-600"
									: "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
							}`}
						>
							Cards
						</button>
					</div>

					{/* Page Size Selector */}
					<div className="flex items-center gap-2">
						<label htmlFor="page-size" className="text-sm text-gray-700">
							Show:
						</label>
						<select
							id="page-size"
							value={pageSize}
							onChange={(e) => onPageSizeChange(Number(e.target.value))}
							className="rounded-md border-gray-300 shadow-sm focus:border-cyan-500 focus:ring-cyan-500 sm:text-sm"
						>
							<option value={10}>10</option>
							<option value={25}>25</option>
							<option value={50}>50</option>
						</select>
					</div>
				</div>

				{/* Bulk Actions */}
				{selectedIds.length > 0 && (
					<div className="flex items-center gap-4">
						<span className="text-sm text-gray-700">
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
					onDelete={handleDelete}
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

			{/* Pagination */}
			<div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6 mt-6">
				<div className="flex flex-1 justify-between sm:hidden">
					<button
						type="button"
						onClick={() => onPageChange(currentPage - 1)}
						disabled={!canGoPrevious}
						className="relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
					>
						Previous
					</button>
					<button
						type="button"
						onClick={() => onPageChange(currentPage + 1)}
						disabled={!canGoNext}
						className="relative ml-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
					>
						Next
					</button>
				</div>
				<div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
					<div>
						<p className="text-sm text-gray-700">
							Showing <span className="font-medium">{startIndex}</span> to{" "}
							<span className="font-medium">{endIndex}</span> of{" "}
							<span className="font-medium">{totalCount}</span> results
						</p>
					</div>
					<div>
						<nav
							className="isolate inline-flex -space-x-px rounded-md shadow-sm"
							aria-label="Pagination"
						>
							<button
								type="button"
								onClick={() => onPageChange(currentPage - 1)}
								disabled={!canGoPrevious}
								className="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50 disabled:cursor-not-allowed"
							>
								<span className="sr-only">Previous</span>
								<svg
									className="h-5 w-5"
									viewBox="0 0 20 20"
									fill="currentColor"
									aria-hidden="true"
								>
									<path
										fillRule="evenodd"
										d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z"
										clipRule="evenodd"
									/>
								</svg>
							</button>
							<span className="relative inline-flex items-center px-4 py-2 text-sm font-semibold text-gray-900 ring-1 ring-inset ring-gray-300 focus:outline-offset-0">
								Page {currentPage} of {totalPages}
							</span>
							<button
								type="button"
								onClick={() => onPageChange(currentPage + 1)}
								disabled={!canGoNext}
								className="relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50 disabled:cursor-not-allowed"
							>
								<span className="sr-only">Next</span>
								<svg
									className="h-5 w-5"
									viewBox="0 0 20 20"
									fill="currentColor"
									aria-hidden="true"
								>
									<path
										fillRule="evenodd"
										d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z"
										clipRule="evenodd"
									/>
								</svg>
							</button>
						</nav>
					</div>
				</div>
			</div>

			{/* Delete Confirmation Dialog */}
			<ConfirmDialog
				isOpen={showDeleteConfirm}
				onClose={() => {
					setShowDeleteConfirm(false);
					setDeleteTargetId(null);
				}}
				onConfirm={deleteTargetId ? handleConfirmDelete : handleConfirmBulkDelete}
				title={
					deleteTargetId
						? "Delete Content Piece"
						: `Delete ${selectedIds.length} Content Piece${selectedIds.length > 1 ? "s" : ""}`
				}
				message={
					deleteTargetId
						? "Are you sure you want to delete this content piece? This action cannot be undone."
						: `Are you sure you want to delete ${selectedIds.length} content piece${selectedIds.length > 1 ? "s" : ""}? This action cannot be undone.`
				}
				confirmLabel="Delete"
				cancelLabel="Cancel"
			/>
		</div>
	);
}
