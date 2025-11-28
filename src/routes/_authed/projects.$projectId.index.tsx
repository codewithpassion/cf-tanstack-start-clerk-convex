import { createFileRoute } from "@tanstack/react-router";
import { ProjectDashboard } from "@/components/project/ProjectDashboard";
import type { Id } from "@/convex/dataModel";

/**
 * Project index route - shows project dashboard.
 */
export const Route = createFileRoute("/_authed/projects/$projectId/")({
	component: ProjectIndexPage,
});

function ProjectIndexPage() {
	const { projectId } = Route.useParams();
	return <ProjectDashboard projectId={projectId as Id<"projects">} />;
}
