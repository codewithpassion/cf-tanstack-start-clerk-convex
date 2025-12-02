import { Link } from "@tanstack/react-router";
import { Menu, X } from "lucide-react";
import type { Project } from "@/types/entities";

export interface ProjectHeaderProps {
	project: Project;
	onToggleSidebar?: () => void;
	sidebarOpen?: boolean;
}

/**
 * Project header with breadcrumb navigation and project name.
 * Shows navigation path from dashboard to current project.
 * Includes mobile sidebar toggle button.
 */
export function ProjectHeader({ project, onToggleSidebar, sidebarOpen }: ProjectHeaderProps) {
	return (
		<div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 md:px-6 py-4">
			{/* Breadcrumb navigation */}
			<nav className="flex mb-2" aria-label="Breadcrumb">
				<ol className="flex items-center space-x-2 text-sm">
					<li>
						<Link
							to="/dashboard"
							className="text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
						>
							Dashboard
						</Link>
					</li>
					<li>
						<svg className="w-4 h-4 text-slate-400 dark:text-slate-500" fill="currentColor" viewBox="0 0 20 20">
							<title>Separator</title>
							<path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
						</svg>
					</li>
					<li>
						<span className="text-slate-900 dark:text-white font-medium truncate max-w-[150px] md:max-w-none inline-block align-bottom">
							{project.name}
						</span>
					</li>
				</ol>
			</nav>

			{/* Project name and description */}
			<div className="flex items-start justify-between gap-3">
				<div className="flex items-center gap-3 min-w-0">
					{/* Mobile sidebar toggle */}
					{onToggleSidebar && (
						<button
							type="button"
							onClick={onToggleSidebar}
							className="lg:hidden flex-shrink-0 p-2 -ml-2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
							aria-label={sidebarOpen ? "Close navigation" : "Open navigation"}
						>
							{sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
						</button>
					)}
					<div className="min-w-0">
						<h1 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white truncate">
							{project.name}
						</h1>
						{project.description && (
							<p className="mt-1 text-sm text-slate-600 dark:text-slate-400 line-clamp-1 md:line-clamp-none">
								{project.description}
							</p>
						)}
					</div>
				</div>
			</div>
		</div>
	);
}
