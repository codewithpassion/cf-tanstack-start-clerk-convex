import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ContentCreationWizard } from "@/components/content/ContentCreationWizard";
import type { Id } from "@/convex/dataModel";

/**
 * Route for creating new content with the content creation wizard.
 * Opens the wizard modal and redirects to the editor upon completion.
 */
export const Route = createFileRoute("/_authed/projects/$projectId/content/new")({
	component: ContentNewPage,
});

function ContentNewPage() {
	const { projectId } = Route.useParams();
	const navigate = useNavigate();
	const [isWizardOpen, setIsWizardOpen] = useState(true);

	const handleWizardClose = () => {
		setIsWizardOpen(false);
		// Navigate back to project page or content list
		navigate({
			to: "/projects/$projectId",
			params: { projectId },
			search: {},
		});
	};

	const handleWizardComplete = (contentPieceId: Id<"contentPieces">) => {
		setIsWizardOpen(false);
		// Navigate to content editor
		navigate({
			to: "/projects/$projectId/content/$contentId",
			params: {
				projectId,
				contentId: contentPieceId,
			},
			search: {},
		});
	};

	return (
		<div>
			<ContentCreationWizard
				isOpen={isWizardOpen}
				projectId={projectId as Id<"projects">}
				onClose={handleWizardClose}
				onComplete={handleWizardComplete}
			/>
		</div>
	);
}
