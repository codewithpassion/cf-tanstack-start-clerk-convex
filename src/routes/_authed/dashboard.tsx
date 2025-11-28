import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useState, useEffect } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { LoadingState } from "@/components/shared/LoadingState";
import { ProjectGrid } from "@/components/dashboard/ProjectGrid";
import { CreateProjectModal } from "@/components/dashboard/CreateProjectModal";
import { ActivityFeed } from "@/components/dashboard/ActivityFeed";
import { QuickActions } from "@/components/dashboard/QuickActions";

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

	// Handler for Create Content button - navigates to first project's content creation
	const handleCreateContent = () => {
		if (projects.length > 0) {
			// Navigate to the first project's content creation wizard
			navigate({
				to: "/projects/$projectId/content/new",
				params: { projectId: projects[0]._id },
				search: {
					page: 1,
					pageSize: 25,
					categoryId: undefined,
					personaId: undefined,
					brandVoiceId: undefined,
					status: "draft" as const,
					dateFrom: undefined,
					dateTo: undefined,
				},
			});
		} else {
			// If no projects, prompt to create one first
			setIsCreateModalOpen(true);
		}
	};

	return (
		<div className="max-w-7xl mx-auto">
			<PageHeader
				title="Projects"
				description="Organize your content creation with projects for different brands or purposes."
				action={
					<QuickActions
						onNavigateToNewContent={handleCreateContent}
						onCreateProject={() => setIsCreateModalOpen(true)}
					/>
				}
			/>

			{/* Activity Feed - show above projects */}
			{activities && activities.length > 0 && (
				<div className="mb-8">
					<ActivityFeed activities={activities} />
				</div>
			)}

			<ProjectGrid
				projects={projects}
				onCreateProject={() => setIsCreateModalOpen(true)}
			/>

			<CreateProjectModal
				isOpen={isCreateModalOpen}
				onClose={() => setIsCreateModalOpen(false)}
			/>
		</div>
	);
}
