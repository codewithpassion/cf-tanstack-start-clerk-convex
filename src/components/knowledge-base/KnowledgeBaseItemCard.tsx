import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Doc } from "../../../convex/_generated/dataModel";
import { ConfirmDialog } from "../shared/ConfirmDialog";

export interface KnowledgeBaseItemCardProps {
	item: Doc<"knowledgeBaseItems">;
	onEdit?: (item: Doc<"knowledgeBaseItems">) => void;
	onDelete?: (item: Doc<"knowledgeBaseItems">) => void;
}

/**
 * Card component for displaying a single knowledge base item.
 * Shows title, content preview, file count, and action buttons.
 */
export function KnowledgeBaseItemCard({ item, onEdit, onDelete }: KnowledgeBaseItemCardProps) {
	const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

	// Fetch files for this item to show count
	const files = useQuery(api.files.getFilesForOwner, {
		ownerType: "knowledgeBaseItem",
		ownerId: item._id,
	});

	const fileCount = files?.length ?? 0;

	// Truncate content for preview
	const contentPreview = item.content
		? item.content.length > 150
			? `${item.content.slice(0, 150)}...`
			: item.content
		: null;

	const handleDeleteConfirm = () => {
		if (onDelete) {
			onDelete(item);
		}
		setShowDeleteConfirm(false);
	};

	return (
		<>
			<div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-6 hover:border-slate-300 dark:hover:border-slate-600 transition-colors">
				<div className="flex items-start justify-between gap-4">
					<div className="flex-1 min-w-0">
						<h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">{item.title}</h3>

						{contentPreview && (
							<p className="text-sm text-slate-600 dark:text-slate-400 mb-4 line-clamp-3">{contentPreview}</p>
						)}

						<div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
							<div className="flex items-center gap-1">
								<svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={2}
										d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
									/>
								</svg>
								<span>
									{fileCount} {fileCount === 1 ? "file" : "files"}
								</span>
							</div>

							<div className="flex items-center gap-1">
								<svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={2}
										d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
									/>
								</svg>
								<span>Updated {new Date(item.updatedAt).toLocaleDateString()}</span>
							</div>
						</div>
					</div>

					<div className="flex items-center gap-2">
						{onEdit && (
							<button
								type="button"
								onClick={() => onEdit(item)}
								className="p-2 text-slate-400 dark:text-slate-500 hover:text-cyan-600 dark:hover:text-cyan-400 hover:bg-cyan-50 dark:hover:bg-cyan-950/30 rounded transition-colors"
								title="Edit knowledge base item"
								aria-label={`Edit ${item.title}`}
							>
								<svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={2}
										d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
									/>
								</svg>
							</button>
						)}

						{onDelete && (
							<button
								type="button"
								onClick={() => setShowDeleteConfirm(true)}
								className="p-2 text-slate-400 dark:text-slate-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 rounded transition-colors"
								title="Delete knowledge base item"
								aria-label={`Delete ${item.title}`}
							>
								<svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={2}
										d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
									/>
								</svg>
							</button>
						)}
					</div>
				</div>
			</div>

			<ConfirmDialog
				isOpen={showDeleteConfirm}
				onClose={() => setShowDeleteConfirm(false)}
				onConfirm={handleDeleteConfirm}
				title="Delete Knowledge Base Item"
				message={`Are you sure you want to delete "${item.title}"? This action cannot be undone. All attached files will also be deleted.`}
				confirmLabel="Delete"
				confirmVariant="danger"
			/>
		</>
	);
}
