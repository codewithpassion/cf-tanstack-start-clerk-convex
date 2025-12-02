/**
 * QuickActions component for dashboard header.
 * Provides prominent buttons for creating content and projects.
 * Navigates to content creation wizard and project creation modal.
 */
export interface QuickActionsProps {
	onNavigateToNewContent: () => void;
	onCreateProject: () => void;
}

/**
 * QuickActions displays action buttons in dashboard header.
 * - "Create Content" button navigates to content creation wizard
 * - "Create Project" button opens project creation modal
 * - Prominent styling with icons
 */
export function QuickActions({ onNavigateToNewContent, onCreateProject }: QuickActionsProps) {
	return (
		<div className="flex gap-3">
			<button
				type="button"
				onClick={onNavigateToNewContent}
				className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-cyan-600 hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500 transition-colors"
			>
				<svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<title>Create</title>
					<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
				</svg>
				Create Content
			</button>

			<button
				type="button"
				onClick={onCreateProject}
				className="inline-flex items-center px-4 py-2 border border-slate-300 dark:border-slate-700 text-sm font-medium rounded-md shadow-sm text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500 transition-colors"
			>
				<svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<title>Add Project</title>
					<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
				</svg>
				Create Project
			</button>
		</div>
	);
}
