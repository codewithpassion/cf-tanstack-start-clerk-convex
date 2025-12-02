import { Link } from "@tanstack/react-router";
import type { Id } from "../../../convex/_generated/dataModel";

/**
 * Activity log entry type matching the Convex schema enriched with related entities.
 */
export interface ActivityLogEntry {
	_id: Id<"activityLog">;
	workspaceId: Id<"workspaces">;
	projectId: Id<"projects">;
	contentPieceId?: Id<"contentPieces">;
	action: "content_created" | "content_edited" | "content_finalized" | "content_deleted" | "project_created" | "derived_content_created";
	metadata?: string;
	createdAt: number;
	project: {
		_id: Id<"projects">;
		name: string;
		workspaceId: Id<"workspaces">;
		createdAt: number;
		updatedAt: number;
	} | null;
	contentPiece: {
		_id: Id<"contentPieces">;
		title: string;
		projectId: Id<"projects">;
		categoryId: Id<"categories">;
		content: string;
		status: "draft" | "finalized";
		createdAt: number;
		updatedAt: number;
	} | null;
}

export interface ActivityFeedProps {
	activities: ActivityLogEntry[];
}

/**
 * Format timestamp as relative time (e.g., "2 hours ago").
 * Used for displaying activity timestamps in a user-friendly way.
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
 * Get icon for activity action type.
 * Returns SVG element matching the action type.
 */
function getActionIcon(action: ActivityLogEntry["action"]): React.ReactNode {
	switch (action) {
		case "content_created":
		case "derived_content_created":
			return (
				<svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<title>Created</title>
					<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
				</svg>
			);
		case "content_edited":
			return (
				<svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<title>Edited</title>
					<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
				</svg>
			);
		case "content_finalized":
			return (
				<svg className="w-5 h-5 text-cyan-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<title>Finalized</title>
					<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
				</svg>
			);
		case "content_deleted":
			return (
				<svg className="w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<title>Deleted</title>
					<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
				</svg>
			);
		case "project_created":
			return (
				<svg className="w-5 h-5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<title>Project Created</title>
					<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
				</svg>
			);
		default:
			return null;
	}
}

/**
 * Get action text description.
 * Returns human-readable action description.
 */
function getActionText(action: ActivityLogEntry["action"]): string {
	switch (action) {
		case "content_created":
			return "created";
		case "content_edited":
			return "edited";
		case "content_finalized":
			return "finalized";
		case "content_deleted":
			return "deleted";
		case "project_created":
			return "created project";
		case "derived_content_created":
			return "created derived content";
		default:
			return "updated";
	}
}

/**
 * ActivityFeed component displays recent workspace activity.
 * Shows last 10 content actions with icons, timestamps, and links to content.
 * Displays action icon per type (created, edited, finalized).
 * Click navigates to relevant content piece (when route becomes available).
 */
export function ActivityFeed({ activities }: ActivityFeedProps) {
	if (activities.length === 0) {
		return (
			<div className="bg-white shadow-md rounded-lg p-6 border border-slate-200">
				<h2 className="text-lg font-semibold text-slate-900 mb-4">Recent Activity</h2>
				<div className="text-center py-8">
					<svg className="w-12 h-12 mx-auto mb-3 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<title>Empty activity</title>
						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
					</svg>
					<p className="text-sm text-slate-500">No recent activity yet</p>
					<p className="text-xs text-slate-400 mt-1">Create your first content to see activity here</p>
				</div>
			</div>
		);
	}

	return (
		<div className="bg-white shadow-md rounded-lg p-6 border border-slate-200">
			<h2 className="text-lg font-semibold text-slate-900 mb-4">Recent Activity</h2>
			<div className="space-y-3">
				{activities.map((activity) => {
					const isContentAction = activity.contentPieceId && activity.contentPiece;
					const isProjectAction = activity.action === "project_created";

					return (
						<div key={activity._id} className="flex items-start gap-3 p-3 rounded-lg hover:bg-slate-50 transition-colors">
							{/* Action icon */}
							<div className="flex-shrink-0 mt-0.5">
								{getActionIcon(activity.action)}
							</div>

							{/* Activity content */}
							<div className="flex-1 min-w-0">
								{isContentAction ? (
									<Link
										to="/projects/$projectId/content/$contentId"
										params={{
											projectId: activity.projectId,
											contentId: activity.contentPieceId!,
										}}
										className="group"
									>
										<p className="text-sm font-medium text-slate-900 group-hover:text-cyan-600 transition-colors line-clamp-1">
											{activity.contentPiece!.title}
										</p>
										<p className="text-xs text-slate-600 mt-0.5">
											{getActionText(activity.action)} in {activity.project?.name || "Unknown Project"}
										</p>
									</Link>
								) : isProjectAction ? (
									<Link
										to="/projects/$projectId/categories"
										params={{ projectId: activity.projectId }}
										className="group"
									>
										<p className="text-sm font-medium text-slate-900 group-hover:text-cyan-600 transition-colors line-clamp-1">
											{activity.project?.name || "Unknown Project"}
										</p>
										<p className="text-xs text-slate-600 mt-0.5">
											{getActionText(activity.action)}
										</p>
									</Link>
								) : (
									<div>
										<p className="text-sm font-medium text-slate-900 line-clamp-1">
											{activity.project?.name || "Unknown Project"}
										</p>
										<p className="text-xs text-slate-600 mt-0.5">
											{getActionText(activity.action)}
										</p>
									</div>
								)}

								{/* Relative timestamp */}
								<p className="text-xs text-slate-400 mt-1">
									{formatRelativeTime(activity.createdAt)}
								</p>
							</div>
						</div>
					);
				})}
			</div>
		</div>
	);
}
