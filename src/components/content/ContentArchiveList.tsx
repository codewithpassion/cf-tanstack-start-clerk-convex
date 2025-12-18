import type { ContentPiece } from "@/types/entities";
import { formatDistanceToNow } from "date-fns";
import { GitFork, ArrowRight, MoreVertical, Trash, CheckCircle } from "lucide-react";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export interface ContentArchiveListProps {
	contentPieces: (ContentPiece & {
		category: { name: string } | null;
		persona: { name: string } | null;
		brandVoice: { name: string } | null;
		parentContent?: { _id: string; title: string } | null;
		derivedCount?: number;
	})[];
	onEdit: (contentPieceId: string) => void;
	sortColumn?: "title" | "category" | "status" | "createdAt" | "updatedAt";
	sortDirection?: "asc" | "desc";
	onSort?: (column: "title" | "category" | "status" | "createdAt" | "updatedAt") => void;
	onFinalize?: (contentPieceId: string) => void;
	onDelete?: (contentPieceId: string) => void;
	onRepurpose?: (contentPieceId: string) => void;
}

/**
 * Table view component for displaying content pieces in the archive.
 * Includes sortable column headers and click-to-edit functionality.
 */
export function ContentArchiveList({
	contentPieces,
	onEdit,
	sortColumn,
	sortDirection = "desc",
	onSort,
	onFinalize,
	onDelete,
	onRepurpose,
}: ContentArchiveListProps) {
	const handleRowClick = (contentPieceId: string, e: React.MouseEvent) => {
		// Don't navigate if clicking on action buttons
		const target = e.target as HTMLElement;
		if (
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
					className="ml-1 h-4 w-4 text-slate-400 dark:text-slate-600"
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
				className="ml-1 h-4 w-4 text-slate-700 dark:text-slate-300"
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
				className="ml-1 h-4 w-4 text-slate-700 dark:text-slate-300"
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
				className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${isDraft
					? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200"
					: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200"
					}`}
			>
				{isDraft ? "Draft" : "Finalized"}
			</span>
		);
	};

	if (contentPieces.length === 0) {
		return (
			<div className="text-center py-12">
				<p className="text-slate-500 text-sm">No content pieces found</p>
			</div>
		);
	}

	return (
		<div className="overflow-x-auto">
			<table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800">
				<thead className="bg-slate-50 dark:bg-slate-900">
					<tr>
						<th
							className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800"
							onClick={() => handleSortClick("title")}
						>
							<div className="flex items-center">
								Title
								<SortIcon column="title" />
							</div>
						</th>
						<th
							className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800"
							onClick={() => handleSortClick("category")}
						>
							<div className="flex items-center">
								Category
								<SortIcon column="category" />
							</div>
						</th>
						<th
							className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800"
							onClick={() => handleSortClick("status")}
						>
							<div className="flex items-center">
								Status
								<SortIcon column="status" />
							</div>
						</th>
						<th
							className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800"
							onClick={() => handleSortClick("createdAt")}
						>
							<div className="flex items-center">
								Created
								<SortIcon column="createdAt" />
							</div>
						</th>
						<th
							className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800"
							onClick={() => handleSortClick("updatedAt")}
						>
							<div className="flex items-center">
								Updated
								<SortIcon column="updatedAt" />
							</div>
						</th>
						<th className="relative px-6 py-3">
							<span className="sr-only">Actions</span>
						</th>
					</tr>
				</thead>
				<tbody className="bg-white dark:bg-slate-950 divide-y divide-slate-200 dark:divide-slate-800">
					{contentPieces.map((contentPiece) => (
						<tr
							key={contentPiece._id}
							className="hover:bg-slate-50 dark:hover:bg-slate-900 cursor-pointer"
							onClick={(e) => handleRowClick(contentPiece._id, e)}
						>
							<td className="px-6 py-4">
								<div className="text-sm font-medium text-slate-900 dark:text-white">
									{contentPiece.title}
								</div>
								{contentPiece.persona && (
									<div className="text-xs text-slate-500 dark:text-slate-400">
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
											className="inline-flex items-center gap-1 text-xs text-amber-700 bg-amber-50 dark:text-amber-400 dark:bg-amber-900/20 px-2 py-0.5 rounded-full hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors"
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
											className="inline-flex items-center gap-1 text-xs text-cyan-700 bg-cyan-50 dark:text-cyan-400 dark:bg-cyan-900/20 px-2 py-0.5 rounded-full"
											title={`Repurposed ${contentPiece.derivedCount} time${contentPiece.derivedCount > 1 ? "s" : ""}`}
										>
											<ArrowRight className="h-3 w-3" />
											<span>{contentPiece.derivedCount} repurposed</span>
										</span>
									)}
								</div>
							</td>
							<td className="px-6 py-4 whitespace-nowrap">
								<div className="text-sm text-slate-900 dark:text-white">
									{contentPiece.category?.name || "—"}
								</div>
							</td>
							<td className="px-6 py-4 whitespace-nowrap">
								<StatusBadge status={contentPiece.status} />
							</td>
							<td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">
								{formatDistanceToNow(new Date(contentPiece.createdAt), {
									addSuffix: true,
								})}
							</td>
							<td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">
								{formatDistanceToNow(new Date(contentPiece.updatedAt), {
									addSuffix: true,
								})}
							</td>
							<td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
								<DropdownMenu>
									<DropdownMenuTrigger asChild>
										<button
											type="button"
											onClick={(e) => e.stopPropagation()}
											className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
										>
											<MoreVertical className="h-4 w-4" />
										</button>
									</DropdownMenuTrigger>
									<DropdownMenuContent align="end">
										{onRepurpose && (
											<DropdownMenuItem
												onClick={(e) => {
													e.stopPropagation();
													onRepurpose(contentPiece._id);
												}}
												className="text-slate-700 dark:text-slate-200"
											>
												<GitFork className="mr-2 h-4 w-4" />
												Repurpose
											</DropdownMenuItem>
										)}
										{contentPiece.status === "draft" && onFinalize && (
											<DropdownMenuItem
												onClick={(e) => {
													e.stopPropagation();
													onFinalize(contentPiece._id);
												}}
												className="text-slate-700 dark:text-slate-200"
											>
												<CheckCircle className="mr-2 h-4 w-4 text-green-500" />
												Finalize
											</DropdownMenuItem>
										)}
										{onDelete && (
											<DropdownMenuItem
												onClick={(e) => {
													e.stopPropagation();
													onDelete(contentPiece._id);
												}}
												className="text-red-600 dark:text-red-400 focus:text-red-600 dark:focus:text-red-400"
											>
												<Trash className="mr-2 h-4 w-4" />
												Delete
											</DropdownMenuItem>
										)}
									</DropdownMenuContent>
								</DropdownMenu>
							</td>
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
}
