import { createFileRoute, redirect } from "@tanstack/react-router";

/**
 * Project index route - redirects to categories page.
 */
export const Route = createFileRoute("/_authed/projects/$projectId/")({
	beforeLoad: ({ params }) => {
		throw redirect({
			to: "/projects/$projectId/categories",
			params: { projectId: params.projectId },
		});
	},
});
