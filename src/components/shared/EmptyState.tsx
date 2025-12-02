import type { ReactNode } from "react";

export interface EmptyStateProps {
	title: string;
	description: string;
	icon?: ReactNode;
	actionLabel?: string;
	onAction?: () => void;
}

/**
 * Reusable empty state component for displaying when no data exists.
 * Shows an icon, title, description, and optional action button.
 */
export function EmptyState({ title, description, icon, actionLabel, onAction }: EmptyStateProps) {
	return (
		<div className="flex flex-col items-center justify-center py-12 px-4 text-center bg-white dark:bg-slate-900 rounded-lg border border-dashed border-slate-300 dark:border-slate-700">
			{icon && (
				<div className="mb-4 text-slate-400 dark:text-slate-500" aria-hidden="true">
					{icon}
				</div>
			)}
			<h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">{title}</h3>
			<p className="text-slate-600 dark:text-slate-400 mb-6 max-w-md">{description}</p>
			{actionLabel && onAction && (
				<button
					type="button"
					onClick={onAction}
					className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-cyan-600 hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500 transition-colors"
				>
					{actionLabel}
				</button>
			)}
		</div>
	);
}
