import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { ContentCreationModal } from "@/components/content/ContentCreationModal";
import { useModalQueryParam } from "@/hooks/useModalQueryParam";
import type { Id } from "@/convex/dataModel";

/**
 * Route for creating new content with the content creation modal.
 * Uses URL-based state management for modal open/close.
 * Opens the modal via query param and redirects to the editor upon completion.
 *
 * URL pattern: /projects/:projectId/content/new?modal=new-content
 * - Auto-opens modal on mount
 * - Browser back button closes modal
 * - Supports deep linking
 */
export const Route = createFileRoute("/_authed/projects/$projectId/content/new")({
	component: ContentNewPage,
});

function ContentNewPage() {
	const { projectId } = Route.useParams();
	const navigate = useNavigate();
	const [isOpen, open, close] = useModalQueryParam("new-content");

	// Auto-open modal on mount
	useEffect(() => {
		if (!isOpen) {
			open();
		}
	}, [isOpen, open]);

	const handleClose = () => {
		close(); // Removes modal param from URL
		navigate({
			to: "/projects/$projectId",
			params: { projectId },
		});
	};

	const handleComplete = (contentPieceId: Id<"contentPieces">) => {
		close();
		navigate({
			to: "/projects/$projectId/content/$contentId",
			params: {
				projectId,
				contentId: contentPieceId,
			},
		});
	};

	return (
		<ContentCreationModal
			isOpen={isOpen}
			onClose={handleClose}
			projectId={projectId as Id<"projects">}
			onComplete={handleComplete}
		/>
	);
}
