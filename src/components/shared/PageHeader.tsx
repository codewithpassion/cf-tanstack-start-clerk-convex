import type { ReactNode } from "react";

export interface PageHeaderProps {
	title: string;
	description?: string;
	action?: ReactNode;
}

/**
 * Consistent page header component with title, optional description, and action button.
 * Used across all main pages for consistent layout and spacing.
 */
export function PageHeader({ title, description, action }: PageHeaderProps) {
	return (
		<div className="border-b border-slate-200 dark:border-slate-700 pb-5 mb-6">
			<div className="sm:flex sm:items-center sm:justify-between">
				<div>
					<h1 className="text-2xl font-bold leading-7 text-slate-900 dark:text-white sm:text-3xl sm:tracking-tight">
						{title}
					</h1>
					{description && (
						<p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
							{description}
						</p>
					)}
				</div>
				{action && <div className="mt-4 sm:ml-4 sm:mt-0">{action}</div>}
			</div>
		</div>
	);
}
