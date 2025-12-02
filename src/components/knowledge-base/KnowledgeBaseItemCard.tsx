import type { Doc } from "../../../convex/_generated/dataModel";

export interface KnowledgeBaseItemCardProps {
	item: Doc<"knowledgeBaseItems">;
	onEdit?: (item: Doc<"knowledgeBaseItems">) => void;
	onDelete?: (item: Doc<"knowledgeBaseItems">) => void;
}

/**
 * Card component for displaying a single knowledge base item.
 * Shows title, content preview, and file indicator if present.
 */
export function KnowledgeBaseItemCard({ item, onEdit, onDelete }: KnowledgeBaseItemCardProps) {
	const hasFile = !!item.fileId;
	const hasContent = !!item.content;

	// Truncate content for preview
	const contentPreview = item.content
		? item.content.length > 150
			? `${item.content.slice(0, 150)}...`
			: item.content
		: null;

	return (
		<div className="bg-white shadow-md rounded-lg p-6 border border-slate-200 hover:shadow-lg transition-shadow">
			<div className="flex items-start justify-between mb-2">
				<h3 className="text-lg font-semibold text-slate-900 flex-1">{item.title}</h3>
				{hasFile && (
					<div
						className="flex-shrink-0 ml-2 text-cyan-600"
						title="File attached"
					>
						<svg
							className="w-5 h-5"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
						>
							<title>File attached</title>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={2}
								d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
							/>
						</svg>
					</div>
				)}
			</div>

			{hasContent && contentPreview && (
				<p className="text-sm text-slate-600 mb-3">{contentPreview}</p>
			)}

			{!hasContent && hasFile && (
				<p className="text-sm text-slate-500 italic mb-3">File attachment</p>
			)}

			<div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-200">
				<span className="text-xs text-slate-500">
					{new Date(item.createdAt).toLocaleDateString()}
				</span>
				<div className="flex gap-2">
					{onEdit && (
						<button
							type="button"
							onClick={() => onEdit(item)}
							className="text-sm text-cyan-600 hover:text-cyan-700 font-medium transition-colors"
						>
							Edit
						</button>
					)}
					{onDelete && (
						<button
							type="button"
							onClick={() => onDelete(item)}
							className="text-sm text-red-600 hover:text-red-700 font-medium transition-colors"
						>
							Delete
						</button>
					)}
				</div>
			</div>
		</div>
	);
}
