import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation } from "convex/react";
import { useState } from "react";
import { api } from "@/convex/api";
import type { Id } from "@/convex/dataModel";
import { ContentEditor } from "@/components/content/ContentEditor";
import { ContentEditorLayout } from "@/components/content/ContentEditorLayout";
import { ToolsPanel } from "@/components/content/ToolsPanel";
import { FinalizeDialog } from "@/components/content/FinalizeDialog";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { LoadingState } from "@/components/shared/LoadingState";
import { VersionHistorySidebar } from "@/components/content/VersionHistorySidebar";

/**
 * Route for editing a content piece with AI chat assistance.
 * Displays the content editor, AI chat panel, and toolbar actions.
 */
export const Route = createFileRoute(
	"/_authed/projects/$projectId/content/$contentId"
)({
	component: ContentEditorPage,
});

function ContentEditorPage() {
	const { projectId, contentId } = Route.useParams();
	const navigate = useNavigate();

	// State for dialogs
	const [showFinalizeDialog, setShowFinalizeDialog] = useState(false);
	const [showUnfinalizeDialog, setShowUnfinalizeDialog] = useState(false);
	const [showDeleteDialog, setShowDeleteDialog] = useState(false);
	const [showVersionSidebar, setShowVersionSidebar] = useState(false);

	// Load content piece with relations
	const contentPiece = useQuery(api.contentPieces.getContentPieceWithRelations, {
		contentPieceId: contentId as Id<"contentPieces">,
	});

	// Mutations
	const finalizeContentPiece = useMutation(api.contentPieces.finalizeContentPiece);
	const unfinalizeContentPiece = useMutation(
		api.contentPieces.unfinalizeContentPiece
	);
	const deleteContentPiece = useMutation(api.contentPieces.deleteContentPiece);

	// Loading states
	const [isFinalizing, setIsFinalizing] = useState(false);
	const [isUnfinalizing, setIsUnfinalizing] = useState(false);
	const [isDeleting, setIsDeleting] = useState(false);

	// Handle finalization
	const handleFinalize = async (label: string) => {
		setIsFinalizing(true);
		try {
			await finalizeContentPiece({
				contentPieceId: contentId as Id<"contentPieces">,
				label,
			});
			setShowFinalizeDialog(false);
		} catch (error) {
			console.error("Failed to finalize content:", error);
			alert("Failed to finalize content. Please try again.");
		} finally {
			setIsFinalizing(false);
		}
	};

	// Handle unfinalization (unlock)
	const handleUnfinalize = async () => {
		setIsUnfinalizing(true);
		try {
			await unfinalizeContentPiece({
				contentPieceId: contentId as Id<"contentPieces">,
			});
			setShowUnfinalizeDialog(false);
		} catch (error) {
			console.error("Failed to unlock content:", error);
			alert("Failed to unlock content. Please try again.");
		} finally {
			setIsUnfinalizing(false);
		}
	};

	// Handle deletion
	const handleDelete = async () => {
		setIsDeleting(true);
		try {
			await deleteContentPiece({
				contentPieceId: contentId as Id<"contentPieces">,
			});
			// Navigate back to project content list
			navigate({
				to: "/projects/$projectId",
				params: { projectId },
			});
		} catch (error) {
			console.error("Failed to delete content:", error);
			alert("Failed to delete content. Please try again.");
			setIsDeleting(false);
			setShowDeleteDialog(false);
		}
	};

	// Loading state
	if (contentPiece === undefined) {
		return <LoadingState message="Loading content..." />;
	}

	// Error state
	if (contentPiece === null) {
		return (
			<div className="flex flex-col items-center justify-center h-full py-12">
				<h2 className="text-xl font-semibold text-gray-900 mb-2">
					Content Not Found
				</h2>
				<p className="text-gray-600 mb-6">
					The content piece you're looking for doesn't exist or has been deleted.
				</p>
				<Link
					to="/projects/$projectId"
					params={{ projectId }}
					className="text-cyan-600 hover:text-cyan-700 font-medium"
				>
					Back to Project
				</Link>
			</div>
		);
	}

	// Check if content is still being generated (placeholder)
	// This ensures the editor only mounts once real content is available
	const isGenerating =
		contentPiece.content === "Generating..." || contentPiece.content === "";

	if (isGenerating) {
		return (
			<div className="flex flex-col items-center justify-center h-full py-12">
				<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-600 mb-4" />
				<p className="text-gray-600">Content is being generated...</p>
			</div>
		);
	}

	const isFinalized = contentPiece.status === "finalized";
	const nextVersion = (contentPiece.currentFinalizedVersion ?? 0) + 1;

	return (
		<div className="h-full flex flex-col">
			{/* Page Header */}
			<div className="bg-white border-b border-gray-200 px-6 py-4">
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-3">
						<Link
							to="/projects/$projectId"
							params={{ projectId }}
							className="text-gray-400 hover:text-gray-600"
						>
							<svg
								className="w-5 h-5"
								fill="none"
								viewBox="0 0 24 24"
								strokeWidth="1.5"
								stroke="currentColor"
							>
								<title>Back</title>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18"
								/>
							</svg>
						</Link>
						<svg
							className="w-5 h-5 text-gray-400"
							fill="none"
							viewBox="0 0 24 24"
							strokeWidth="1.5"
							stroke="currentColor"
						>
							<title>Document</title>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
							/>
						</svg>
						<h1 className="text-xl font-bold text-gray-900 truncate">
							{contentPiece.title}
						</h1>
					</div>

					<div className="flex items-center gap-2">
						{contentPiece.persona && (
							<button
								type="button"
								className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm bg-pink-50 text-pink-700 border border-pink-200 hover:bg-pink-100 transition-colors"
								title={`Persona: ${contentPiece.persona.name}`}
							>
								<svg
									className="w-4 h-4"
									fill="none"
									viewBox="0 0 24 24"
									strokeWidth="1.5"
									stroke="currentColor"
								>
									<title>Persona</title>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
									/>
								</svg>
								{contentPiece.persona.name}
							</button>
						)}
						{contentPiece.brandVoice && (
							<button
								type="button"
								className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100 transition-colors"
								title={`Voice: ${contentPiece.brandVoice.name}`}
							>
								<svg
									className="w-4 h-4"
									fill="none"
									viewBox="0 0 24 24"
									strokeWidth="1.5"
									stroke="currentColor"
								>
									<title>Voice</title>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z"
									/>
								</svg>
								{contentPiece.brandVoice.name}
							</button>
						)}
					</div>
				</div>
			</div>

			{/* Editor Layout with Tools Panel */}
			<div className="flex-1 overflow-y-auto px-6 py-6">
				<ContentEditorLayout
					editor={
						<ContentEditor
							initialContent={contentPiece.content}
							onChange={() => {
								// Content changes are handled by autosave in ContentEditor
							}}
							contentPieceId={contentId as Id<"contentPieces">}
							disabled={isFinalized}
						/>
					}
					toolsPanel={
						<ToolsPanel
							contentPieceId={contentId as Id<"contentPieces">}
							currentContent={contentPiece.content}
							isFinalized={isFinalized}
							onApplyToContent={(newContent) => {
								// TODO: Implement content application logic
								console.log("Apply content:", newContent);
							}}
							onRefine={() => {
								// TODO: Implement refine logic
								console.log("Refine clicked");
							}}
							onChangeTone={(tone) => {
								// TODO: Implement change tone logic
								console.log("Change tone:", tone);
							}}
							onShowVersions={() => setShowVersionSidebar(true)}
							onShowImages={() =>
								navigate({
									to: "/projects/$projectId/content/$contentId/images",
									params: { projectId, contentId },
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
								})
							}
							onFinalize={() => {
								if (isFinalized) {
									setShowUnfinalizeDialog(true);
								} else {
									setShowFinalizeDialog(true);
								}
							}}
							onDelete={() => setShowDeleteDialog(true)}
						/>
					}
				/>
			</div>

			{/* Finalize Dialog */}
			<FinalizeDialog
				isOpen={showFinalizeDialog}
				nextVersion={nextVersion}
				onConfirm={handleFinalize}
				onCancel={() => setShowFinalizeDialog(false)}
				isLoading={isFinalizing}
			/>

			{/* Unfinalize Confirmation Dialog */}
			<ConfirmDialog
				isOpen={showUnfinalizeDialog}
				title="Unlock Content"
				message="Are you sure you want to unlock this content for editing? This will change its status back to draft."
				confirmLabel="Unlock"
				confirmVariant="info"
				onConfirm={handleUnfinalize}
				onCancel={() => setShowUnfinalizeDialog(false)}
				isLoading={isUnfinalizing}
			/>

			{/* Delete Confirmation Dialog */}
			<ConfirmDialog
				isOpen={showDeleteDialog}
				title="Delete Content"
				message="Are you sure you want to delete this content? This action cannot be undone."
				confirmLabel="Delete"
				confirmVariant="danger"
				onConfirm={handleDelete}
				onCancel={() => setShowDeleteDialog(false)}
				isLoading={isDeleting}
			/>

			{/* Version History Sidebar */}
			<VersionHistorySidebar
				isOpen={showVersionSidebar}
				onClose={() => setShowVersionSidebar(false)}
				contentPieceId={contentId as Id<"contentPieces">}
				currentVersion={1}
			/>
		</div>
	);
}
