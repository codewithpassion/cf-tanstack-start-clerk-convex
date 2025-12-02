import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useState, useEffect } from "react";
import { LoadingState } from "@/components/shared/LoadingState";
import { ProjectGrid } from "@/components/dashboard/ProjectGrid";
import { CreateProjectModal } from "@/components/dashboard/CreateProjectModal";
import { ActivityFeed } from "@/components/dashboard/ActivityFeed";

export const Route = createFileRoute("/_authed/dashboard")({
	component: DashboardPage,
});

function DashboardPage() {
	const navigate = useNavigate();
	const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

	// Fetch workspace and check onboarding status
	const workspace = useQuery(api.workspaces.getMyWorkspace);
	const needsOnboarding = useQuery(api.workspaces.needsOnboarding);

	// Fetch projects list
	const projects = useQuery(api.projects.listProjects);

	// Fetch recent activity for the workspace
	const activities = useQuery(
		api.activityLog.getRecentActivity,
		workspace
			? {
				workspaceId: workspace._id,
				limit: 10,
			}
			: "skip",
	);

	// Redirect to onboarding if needed
	useEffect(() => {
		if (needsOnboarding === true) {
			navigate({ to: "/onboarding" });
		}
	}, [needsOnboarding, navigate]);

	// Show loading state while data is being fetched
	if (workspace === undefined || needsOnboarding === undefined || projects === undefined) {
		return (
			<div className="max-w-7xl mx-auto">
				<LoadingState message="Loading dashboard..." />
			</div>
		);
	}

	// If redirecting to onboarding, show loading
	if (needsOnboarding === true) {
		return (
			<div className="max-w-7xl mx-auto">
				<LoadingState message="Redirecting to onboarding..." />
			</div>
		);
	}

	return (
		<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
			<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
				<div>
					<h1 className="text-2xl font-bold text-slate-900 dark:text-white">Dashboard</h1>
					<p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
						Manage your projects and content creation.
					</p>
				</div>
				<div className="mt-4 sm:mt-0 flex gap-3">
					<button
						type="button"
						onClick={() => setIsCreateModalOpen(true)}
						className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-cyan-600 hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500 transition-colors"
					>
						<svg className="-ml-1 mr-2 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
						</svg>
						New Project
					</button>
				</div>
			</div>

			<div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
				{/* Main Content - Projects */}
				<div className="lg:col-span-2 space-y-6">
					<div className="flex items-center justify-between">
						<h2 className="text-lg font-medium text-slate-900 dark:text-white">Your Projects</h2>
					</div>

					<ProjectGrid
						projects={projects}
						onCreateProject={() => setIsCreateModalOpen(true)}
					/>
				</div>

				{/* Sidebar - Activity Feed */}
				<div className="space-y-6">
					<div className="flex items-center justify-between">
						<h2 className="text-lg font-medium text-slate-900 dark:text-white">Recent Activity</h2>
					</div>

					{activities ? (
						<ActivityFeed activities={activities} />
					) : (
						<div className="animate-pulse space-y-4">
							<div className="h-20 bg-slate-100 dark:bg-slate-800 rounded-lg"></div>
							<div className="h-20 bg-slate-100 dark:bg-slate-800 rounded-lg"></div>
							<div className="h-20 bg-slate-100 dark:bg-slate-800 rounded-lg"></div>
						</div>
					)}
				</div>
			</div>

			<CreateProjectModal
				isOpen={isCreateModalOpen}
				onClose={() => setIsCreateModalOpen(false)}
			/>
		</div>
	);
}
