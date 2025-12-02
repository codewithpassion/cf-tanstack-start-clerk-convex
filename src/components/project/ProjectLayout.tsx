import { Outlet } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { ProjectId } from "@/types/entities";
import { ProjectSidebar } from "./ProjectSidebar";
import { ProjectHeader } from "./ProjectHeader";
import { LoadingState } from "../shared/LoadingState";

export interface ProjectLayoutProps {
	projectId: ProjectId;
}

/**
 * Layout wrapper for all project pages.
 * Includes sidebar navigation, header, and content area.
 */
export function ProjectLayout({ projectId }: ProjectLayoutProps) {
	const project = useQuery(api.projects.getProject, { projectId });

	if (project === undefined) {
		return <LoadingState message="Loading project..." />;
	}

	if (project === null) {
		return (
			<div className="max-w-4xl mx-auto py-12">
				<div className="bg-red-50 border border-red-200 rounded-lg p-6">
					<h2 className="text-xl font-semibold text-red-900 mb-2">Project not found</h2>
					<p className="text-red-700">
						The project you're looking for doesn't exist or you don't have access to it.
					</p>
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen flex flex-col">
			<ProjectHeader project={project} />

			<div className="flex flex-1 overflow-hidden">
				<ProjectSidebar projectId={projectId} />

				<main className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-950">
					<div className="max-w-7xl mx-auto p-6">
						<Outlet />
					</div>
				</main>
			</div>
		</div>
	);
}
