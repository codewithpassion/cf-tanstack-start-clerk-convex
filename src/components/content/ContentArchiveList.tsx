import type { ContentPiece } from "@/types/entities";
import { formatDistanceToNow } from "date-fns";
import { GitFork, ArrowRight } from "lucide-react";

export interface ContentArchiveListProps {
	contentPieces: (ContentPiece & {
		category: { name: string } | null;
		persona: { name: string } | null;
		brandVoice: { name: string } | null;
		parentContent?: { _id: string; title: string } | null;
		derivedCount?: number;
	})[];
	onEdit: (contentPieceId: string) => void;
	onDelete: (contentPieceId: string) => void;
	onSelectionChange: (selectedIds: string[]) => void;
	selectedIds: string[];
	sortColumn?: "title" | "category" | "status" | "createdAt" | "updatedAt";
	sortDirection?: "asc" | "desc";
	onSort?: (column: "title" | "category" | "status" | "createdAt" | "updatedAt") => void;
}

/**
 * Table view component for displaying content pieces in the archive.
 * Includes sortable column headers, row selection, and click-to-edit functionality.
 */
export function ContentArchiveList({
	contentPieces,
	onEdit,
	onDelete,
	onSelectionChange,
	selectedIds,
	sortColumn,
	sortDirection = "desc",
	onSort,
}: ContentArchiveListProps) {
	const handleSelectAll = (checked: boolean) => {
		if (checked) {
			onSelectionChange(contentPieces.map((cp) => cp._id));
		} else {
			onSelectionChange([]);
		}
	};

	const handleSelectOne = (contentPieceId: string, checked: boolean) => {
		if (checked) {
			onSelectionChange([...selectedIds, contentPieceId]);
		} else {
			onSelectionChange(selectedIds.filter((id) => id !== contentPieceId));
		}
	};

	const handleRowClick = (contentPieceId: string, e: React.MouseEvent) => {
		// Don't navigate if clicking on checkbox or action buttons
		const target = e.target as HTMLElement;
		if (
			target.tagName === "INPUT" ||
			target.tagName === "BUTTON" ||
			target.closest("button")
		) {
			return;
		}
		onEdit(contentPieceId);
	};

	const handleSortClick = (column: typeof sortColumn) => {
		if (onSort && column) {
			onSort(column);
		}
	};

	const SortIcon = ({ column }: { column: typeof sortColumn }) => {
		if (sortColumn !== column) {
			return (
				<svg
					className="ml-1 h-4 w-4 text-gray-400"
					fill="none"
					stroke="currentColor"
					viewBox="0 0 24 24"
				>
					<path
						strokeLinecap="round"
						strokeLinejoin="round"
						strokeWidth={2}
						d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"
					/>
				</svg>
			);
		}
		return sortDirection === "asc" ? (
			<svg
				className="ml-1 h-4 w-4 text-gray-700"
				fill="none"
				stroke="currentColor"
				viewBox="0 0 24 24"
			>
				<path
					strokeLinecap="round"
					strokeLinejoin="round"
					strokeWidth={2}
					d="M5 15l7-7 7 7"
				/>
			</svg>
		) : (
			<svg
				className="ml-1 h-4 w-4 text-gray-700"
				fill="none"
				stroke="currentColor"
				viewBox="0 0 24 24"
			>
				<path
					strokeLinecap="round"
					strokeLinejoin="round"
					strokeWidth={2}
					d="M19 9l-7 7-7-7"
				/>
			</svg>
		);
	};

	const StatusBadge = ({ status }: { status: "draft" | "finalized" }) => {
		const isDraft = status === "draft";
		return (
			<span
				className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
					isDraft
						? "bg-yellow-100 text-yellow-800"
						: "bg-green-100 text-green-800"
				}`}
			>
				{isDraft ? "Draft" : "Finalized"}
			</span>
		);
	};

	if (contentPieces.length === 0) {
		return (
			<div className="text-center py-12">
				<p className="text-gray-500 text-sm">No content pieces found</p>
			</div>
		);
	}

	const allSelected =
		contentPieces.length > 0 &&
		contentPieces.every((cp) => selectedIds.includes(cp._id));
	const someSelected = selectedIds.length > 0 && !allSelected;

	return (
		<div className="overflow-x-auto">
			<table className="min-w-full divide-y divide-gray-200">
				<thead className="bg-gray-50">
					<tr>
						<th className="px-3 py-3 text-left">
							<input
								type="checkbox"
								checked={allSelected}
								ref={(input) => {
									if (input) {
										input.indeterminate = someSelected;
									}
								}}
								onChange={(e) => handleSelectAll(e.target.checked)}
								className="h-4 w-4 rounded border-gray-300 text-cyan-600 focus:ring-cyan-500"
								aria-label="Select all content pieces"
							/>
						</th>
						<th
							className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
							onClick={() => handleSortClick("title")}
						>
							<div className="flex items-center">
								Title
								<SortIcon column="title" />
							</div>
						</th>
						<th
							className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
							onClick={() => handleSortClick("category")}
						>
							<div className="flex items-center">
								Category
								<SortIcon column="category" />
							</div>
						</th>
						<th
							className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
							onClick={() => handleSortClick("status")}
						>
							<div className="flex items-center">
								Status
								<SortIcon column="status" />
							</div>
						</th>
						<th
							className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
							onClick={() => handleSortClick("createdAt")}
						>
							<div className="flex items-center">
								Created
								<SortIcon column="createdAt" />
							</div>
						</th>
						<th
							className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
							onClick={() => handleSortClick("updatedAt")}
						>
							<div className="flex items-center">
								Updated
								<SortIcon column="updatedAt" />
							</div>
						</th>
						<th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
							Actions
						</th>
					</tr>
				</thead>
				<tbody className="bg-white divide-y divide-gray-200">
					{contentPieces.map((contentPiece) => (
						<tr
							key={contentPiece._id}
							className="hover:bg-gray-50 cursor-pointer"
							onClick={(e) => handleRowClick(contentPiece._id, e)}
						>
							<td className="px-3 py-4 whitespace-nowrap">
								<input
									type="checkbox"
									checked={selectedIds.includes(contentPiece._id)}
									onChange={(e) =>
										handleSelectOne(contentPiece._id, e.target.checked)
									}
									className="h-4 w-4 rounded border-gray-300 text-cyan-600 focus:ring-cyan-500"
									aria-label={`Select ${contentPiece.title}`}
									onClick={(e) => e.stopPropagation()}
								/>
							</td>
							<td className="px-6 py-4">
								<div className="text-sm font-medium text-gray-900">
									{contentPiece.title}
								</div>
								{contentPiece.persona && (
									<div className="text-xs text-gray-500">
										{contentPiece.persona.name}
									</div>
								)}
								{/* Repurpose relationship indicators */}
								<div className="flex flex-wrap items-center gap-2 mt-1">
									{contentPiece.parentContent && (
										<button
											type="button"
											onClick={(e) => {
												e.stopPropagation();
												onEdit(contentPiece.parentContent!._id);
											}}
											className="inline-flex items-center gap-1 text-xs text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full hover:bg-amber-100 transition-colors"
											title={`Derived from: ${contentPiece.parentContent.title}`}
										>
											<GitFork className="h-3 w-3" />
											<span className="max-w-[120px] truncate">
												← {contentPiece.parentContent.title}
											</span>
										</button>
									)}
									{contentPiece.derivedCount && contentPiece.derivedCount > 0 && (
										<span
											className="inline-flex items-center gap-1 text-xs text-cyan-700 bg-cyan-50 px-2 py-0.5 rounded-full"
											title={`Repurposed ${contentPiece.derivedCount} time${contentPiece.derivedCount > 1 ? "s" : ""}`}
										>
											<ArrowRight className="h-3 w-3" />
											<span>{contentPiece.derivedCount} repurposed</span>
										</span>
									)}
								</div>
							</td>
							<td className="px-6 py-4 whitespace-nowrap">
								<div className="text-sm text-gray-900">
									{contentPiece.category?.name || "—"}
								</div>
							</td>
							<td className="px-6 py-4 whitespace-nowrap">
								<StatusBadge status={contentPiece.status} />
							</td>
							<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
								{formatDistanceToNow(new Date(contentPiece.createdAt), {
									addSuffix: true,
								})}
							</td>
							<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
								{formatDistanceToNow(new Date(contentPiece.updatedAt), {
									addSuffix: true,
								})}
							</td>
							<td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
								<button
									type="button"
									onClick={(e) => {
										e.stopPropagation();
										onDelete(contentPiece._id);
									}}
									className="text-red-600 hover:text-red-900"
								>
									Delete
								</button>
							</td>
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
}
