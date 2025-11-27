import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Project } from "@/types/entities";
import { ProjectCard } from "./ProjectCard";
import { LoadingState } from "../shared/LoadingState";
import { EmptyState } from "../shared/EmptyState";

export interface ProjectGridProps {
	projects: Project[];
	onCreateProject: () => void;
}

/**
 * Responsive grid layout for project cards.
 * Displays 1 column on mobile, 2 on tablet, 3 on desktop.
 */
export function ProjectGrid({ projects, onCreateProject }: ProjectGridProps) {
	if (projects.length === 0) {
		return (
			<EmptyState
				title="No projects yet"
				description="Create your first project to start organizing your content creation workflow."
				icon={
					<svg className="w-16 h-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<title>Empty folder</title>
						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
					</svg>
				}
				actionLabel="Create Project"
				onAction={onCreateProject}
			/>
		);
	}

	return (
		<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
			{projects.map((project) => (
				<ProjectCardWithStats key={project._id} project={project} />
			))}
		</div>
	);
}

/**
 * Wrapper component that fetches stats for a single project card.
 */
function ProjectCardWithStats({ project }: { project: Project }) {
	const stats = useQuery(api.projects.getProjectStats, { projectId: project._id });

	return <ProjectCard project={project} stats={stats} />;
}
