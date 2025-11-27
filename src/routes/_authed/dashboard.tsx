import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useState, useEffect } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { LoadingState } from "@/components/shared/LoadingState";
import { ProjectGrid } from "@/components/dashboard/ProjectGrid";
import { CreateProjectModal } from "@/components/dashboard/CreateProjectModal";

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
		<div className="max-w-7xl mx-auto">
			<PageHeader
				title="Projects"
				description="Organize your content creation with projects for different brands or purposes."
				action={
					<button
						type="button"
						onClick={() => setIsCreateModalOpen(true)}
						className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-cyan-600 hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500 transition-colors"
					>
						<svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<title>Add</title>
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
						</svg>
						New Project
					</button>
				}
			/>

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
