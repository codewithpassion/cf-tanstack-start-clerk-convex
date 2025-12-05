import { Outlet } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { useState } from "react";
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
 * Responsive: sidebar is a drawer on mobile, visible on desktop.
 */
export function ProjectLayout({ projectId }: ProjectLayoutProps) {
	const project = useQuery(api.projects.getProject, { projectId });
	const [sidebarOpen, setSidebarOpen] = useState(false);

	if (project === undefined) {
		return <LoadingState message="Loading project..." />;
	}

	if (project === null) {
		return (
			<div className="max-w-4xl mx-auto py-12">
				<div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
					<h2 className="text-xl font-semibold text-red-900 dark:text-red-100 mb-2">Project not found</h2>
					<p className="text-red-700 dark:text-red-300">
						The project you're looking for doesn't exist or you don't have access to it.
					</p>
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen flex flex-col">
			<ProjectHeader
				project={project}
				onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
				sidebarOpen={sidebarOpen}
			/>

			<div className="flex flex-1 overflow-hidden relative">
				{/* Mobile sidebar overlay */}
				{sidebarOpen && (
					<div
						className="fixed inset-0 bg-black/50 z-30 lg:hidden"
						onClick={() => setSidebarOpen(false)}
						onKeyDown={(e) => e.key === "Escape" && setSidebarOpen(false)}
					/>
				)}

				{/* Sidebar - hidden on mobile by default, shown via toggle */}
				<div
					className={`
						fixed inset-y-0 left-0 z-40 w-64 transform transition-transform duration-200 ease-in-out
						lg:relative lg:translate-x-0 lg:z-0
						${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
					`}
				>
					<ProjectSidebar projectId={projectId} onClose={() => setSidebarOpen(false)} />
				</div>

				<main className="flex-1 overflow-y-auto bg-gradient-to-br from-slate-50 via-amber-50/20 to-slate-50 dark:bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] dark:from-amber-950/20 dark:via-slate-950 dark:to-slate-950">
					<div className="max-w-7xl mx-auto sm:p-4 md:p-6">
						<Outlet />
					</div>
				</main>
			</div>
		</div>
	);
}
