import { Link } from "@tanstack/react-router";
import type { Project } from "@/types/entities";

export interface ProjectHeaderProps {
	project: Project;
}

/**
 * Project header with breadcrumb navigation and project name.
 * Shows navigation path from dashboard to current project.
 */
export function ProjectHeader({ project }: ProjectHeaderProps) {
	return (
		<div className="bg-white border-b border-gray-200 px-6 py-4">
			{/* Breadcrumb navigation */}
			<nav className="flex mb-2" aria-label="Breadcrumb">
				<ol className="flex items-center space-x-2 text-sm">
					<li>
						<Link
							to="/dashboard"
							className="text-gray-500 hover:text-gray-700 transition-colors"
						>
							Dashboard
						</Link>
					</li>
					<li>
						<svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
							<title>Separator</title>
							<path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
						</svg>
					</li>
					<li>
						<span className="text-gray-900 font-medium">
							{project.name}
						</span>
					</li>
				</ol>
			</nav>

			{/* Project name and description */}
			<div className="flex items-start justify-between">
				<div>
					<h1 className="text-2xl font-bold text-gray-900">
						{project.name}
					</h1>
					{project.description && (
						<p className="mt-1 text-sm text-gray-600">
							{project.description}
						</p>
					)}
				</div>
			</div>
		</div>
	);
}
