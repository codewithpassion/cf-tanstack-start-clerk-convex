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
 * Used for displaying last updated and activity timestamps.
 */
function formatRelativeTime(timestamp: number): string {
	const now = Date.now();
	const diff = now - timestamp;
	const minutes = Math.floor(diff / 60000);
	const hours = Math.floor(diff / 3600000);
	const days = Math.floor(diff / 86400000);

	if (minutes < 1) return "just now";
	if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
	if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
	return `${days} day${days === 1 ? "" : "s"} ago`;
}

/**
 * Project card component for dashboard grid.
 * Displays project name, description, stats (including content count), and last activity time.
 * Enhanced with content count display and recent activity timestamp.
 * Visual indicator for active projects (projects with recent activity).
 */
export function ProjectCard({ project, stats }: ProjectCardProps) {
	// Consider a project "active" if it has activity within the last 7 days
	const isActive = stats?.recentActivityAt && (Date.now() - stats.recentActivityAt) < 7 * 24 * 60 * 60 * 1000;

	return (
		<Link
			to="/projects/$projectId"
			params={{ projectId: project._id }}
			className={`block bg-white shadow-md rounded-lg p-6 hover:shadow-lg transition-shadow duration-200 border ${
				isActive ? "border-cyan-500" : "border-slate-200 hover:border-cyan-500"
			}`}
		>
			{/* Active indicator badge */}
			{isActive && (
				<div className="flex items-center gap-1 mb-2">
					<div className="w-2 h-2 bg-cyan-500 rounded-full animate-pulse" />
					<span className="text-xs font-medium text-cyan-600">Active</span>
				</div>
			)}

			<h3 className="text-lg font-semibold text-slate-900 mb-2 line-clamp-1">
				{project.name}
			</h3>

			{project.description && (
				<p className="text-sm text-slate-600 mb-4 line-clamp-2">
					{project.description}
				</p>
			)}

			{stats && (
				<div className="space-y-3 mb-4">
					{/* Content count - prominent display */}
					{stats.contentCount > 0 && (
						<div className="flex items-center gap-2 text-sm">
							<svg className="w-5 h-5 text-cyan-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
								<title>Content</title>
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
							</svg>
							<span className="font-medium text-slate-900">
								{stats.contentCount} {stats.contentCount === 1 ? "piece" : "pieces"}
							</span>
						</div>
					)}

					{/* Other stats - more compact */}
					<div className="flex gap-4 text-xs text-slate-500">
						<span className="flex items-center gap-1">
							<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
								<title>Categories</title>
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
							</svg>
							{stats.categoriesCount} {stats.categoriesCount === 1 ? "category" : "categories"}
						</span>
						<span className="flex items-center gap-1">
							<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
								<title>Brand Voices</title>
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
							</svg>
							{stats.brandVoicesCount} {stats.brandVoicesCount === 1 ? "voice" : "voices"}
						</span>
						<span className="flex items-center gap-1">
							<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
								<title>Personas</title>
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
							</svg>
							{stats.personasCount} {stats.personasCount === 1 ? "persona" : "personas"}
						</span>
					</div>
				</div>
			)}

			<div className="flex items-center justify-between text-xs text-slate-500 pt-4 border-t border-slate-200">
				<div className="flex flex-col gap-1">
					<span>Updated {formatRelativeTime(project.updatedAt)}</span>
					{stats?.recentActivityAt && (
						<span className="text-cyan-600">
							Last activity {formatRelativeTime(stats.recentActivityAt)}
						</span>
					)}
				</div>
				<span className="text-cyan-600 font-medium">View →</span>
			</div>
		</Link>
	);
}
