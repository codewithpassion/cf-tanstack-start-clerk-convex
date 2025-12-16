import type { Category } from "@/types/entities";

export interface CategoryCardProps {
	category: Category;
	onEdit: (category: Category) => void;
	onDelete: (category: Category) => void;
	isDragging?: boolean;
}

/**
 * Category card component displaying category information with edit/delete actions.
 * Shows category name, description, format guidelines, and default badge.
 */
export function CategoryCard({ category, onEdit, onDelete, isDragging = false }: CategoryCardProps) {
	return (
		<div
			className={`bg-white dark:bg-slate-800 shadow-md rounded-lg p-6 border border-slate-200 dark:border-slate-700 transition-all ${
				isDragging ? "opacity-50 rotate-2 scale-105" : "hover:border-cyan-500 dark:hover:border-cyan-400"
			}`}
		>
			<div className="flex items-start justify-between mb-2">
				<h3 className="text-lg font-semibold text-slate-900 dark:text-white">{category.name}</h3>
				<div className="flex items-center gap-2">
					{category.isDefault && (
						<span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-cyan-100 dark:bg-cyan-900/50 text-cyan-800 dark:text-cyan-300">
							Default
						</span>
					)}
				</div>
			</div>

			{category.description && (
				<p className="text-sm text-slate-600 dark:text-slate-400 mb-3">{category.description}</p>
			)}

			{category.formatGuidelines && (
				<div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
					<p className="text-xs font-medium text-slate-700 dark:text-slate-300 mb-2">Format Guidelines:</p>
					<p className="text-xs text-slate-600 dark:text-slate-400 whitespace-pre-line line-clamp-3">
						{category.formatGuidelines}
					</p>
				</div>
			)}

			<div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700 flex items-center justify-end gap-2">
				<button
					type="button"
					onClick={() => onEdit(category)}
					className="inline-flex items-center px-3 py-1.5 border border-slate-300 dark:border-slate-600 text-xs font-medium rounded-md text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500 transition-colors"
					aria-label={`Edit ${category.name}`}
				>
					<svg
						className="w-4 h-4 mr-1"
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
					>
						<title>Edit</title>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth={2}
							d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
						/>
					</svg>
					Edit
				</button>
				<button
					type="button"
					onClick={() => onDelete(category)}
					className="inline-flex items-center px-3 py-1.5 border border-red-300 dark:border-red-800 text-xs font-medium rounded-md text-red-700 dark:text-red-400 bg-white dark:bg-slate-700 hover:bg-red-50 dark:hover:bg-red-950/50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
					aria-label={`Delete ${category.name}`}
				>
					<svg
						className="w-4 h-4 mr-1"
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
					>
						<title>Delete</title>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth={2}
							d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
						/>
					</svg>
					Delete
				</button>
			</div>
		</div>
	);
}
