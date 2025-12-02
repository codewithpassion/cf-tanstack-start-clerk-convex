import { Link } from "@tanstack/react-router";
import type { Project } from "@/types/entities";

export interface ProjectCardProps {
	project: Project;
	stats?: {
		categoriesCount: number;
		brandVoicesCount: number;
		personasCount: number;
		contentCount: number;
		recentActivityAt?: number;
	};
}

/**
 * Format timestamp as relative time (e.g., "2 hours ago").
 */
function formatRelativeTime(timestamp: number): string {
	const now = Date.now();
	const diff = now - timestamp;
	const minutes = Math.floor(diff / 60000);
	const hours = Math.floor(diff / 3600000);
	const days = Math.floor(diff / 86400000);

	if (minutes < 1) return "just now";
	if (minutes < 60) return `${minutes}m ago`;
	if (hours < 24) return `${hours}h ago`;
	return `${days}d ago`;
}

/**
 * Project card component for dashboard grid.
 * Minimalistic design with key stats and activity indicator.
 */
export function ProjectCard({ project, stats }: ProjectCardProps) {
	// Consider a project "active" if it has activity within the last 7 days
	const isActive = stats?.recentActivityAt && (Date.now() - stats.recentActivityAt) < 7 * 24 * 60 * 60 * 1000;

	return (
		<Link
			to="/projects/$projectId"
			params={{ projectId: project._id }}
			className="group block bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 hover:border-cyan-500 dark:hover:border-cyan-500 transition-colors duration-200"
		>
			<div className="flex justify-between items-start mb-3">
				<h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 line-clamp-1 group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors">
					{project.name}
				</h3>
				{isActive && (
					<span className="flex h-2 w-2 relative">
						<span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
						<span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
					</span>
				)}
			</div>

			<p className="text-sm text-slate-500 dark:text-slate-400 mb-6 line-clamp-2 h-10">
				{project.description || "No description provided."}
			</p>

			{stats && (
				<div className="space-y-4">
					<div className="flex items-center gap-4 text-sm text-slate-600 dark:text-slate-300">
						<div className="flex items-center gap-1.5">
							<svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
							</svg>
							<span className="font-medium">{stats.contentCount}</span>
						</div>
						<div className="flex items-center gap-1.5">
							<svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
							</svg>
							<span>{stats.categoriesCount}</span>
						</div>
						<div className="flex items-center gap-1.5">
							<svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
							</svg>
							<span>{stats.personasCount}</span>
						</div>
					</div>

					<div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
						<span className="text-slate-400">
							{stats.recentActivityAt
								? `Active ${formatRelativeTime(stats.recentActivityAt)}`
								: `Updated ${formatRelativeTime(project.updatedAt)}`
							}
						</span>
					</div>
				</div>
			)}
		</Link>
	);
}
