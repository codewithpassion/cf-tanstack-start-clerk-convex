import { createFileRoute } from "@tanstack/react-router";
import { ProjectLayout } from "@/components/project/ProjectLayout";

/**
 * Project workspace layout route.
 * All project pages are nested under this route.
 */
export const Route = createFileRoute("/_authed/projects/$projectId")({
	component: ProjectLayoutRoute,
});

function ProjectLayoutRoute() {
	const { projectId } = Route.useParams();
	return <ProjectLayout projectId={projectId} />;
}
