import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation } from "convex/react";
import { useState } from "react";
import { api } from "@/convex/api";
import type { Id } from "@/convex/dataModel";
import { ContentEditor } from "@/components/content/ContentEditor";
import { ContentEditorLayout } from "@/components/content/ContentEditorLayout";
import { FinalizeDialog } from "@/components/content/FinalizeDialog";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { LoadingState } from "@/components/shared/LoadingState";

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

	const isFinalized = contentPiece.status === "finalized";
	const nextVersion = (contentPiece.currentFinalizedVersion ?? 0) + 1;

	return (
		<div className="h-full flex flex-col">
			{/* Page Header */}
			<div className="bg-white border-b border-gray-200 px-6 py-4">
				<div className="flex items-center justify-between">
					<div className="flex-1 min-w-0">
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
							<div>
								<h1 className="text-2xl font-bold text-gray-900 truncate">
									{contentPiece.title}
								</h1>
								<div className="flex items-center gap-2 mt-1">
									{contentPiece.category && (
										<span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
											{contentPiece.category.name}
										</span>
									)}
									{isFinalized ? (
										<span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
											Finalized v{contentPiece.currentFinalizedVersion}
										</span>
									) : (
										<span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
											Draft
										</span>
									)}
								</div>
							</div>
						</div>
					</div>

					{/* Toolbar Actions */}
					<div className="flex items-center gap-3">
						{/* Version History Link */}
						<Link
							to="/projects/$projectId/content/$contentId/versions"
							params={{ projectId, contentId }}
							search={{
								page: 1,
								pageSize: 25,
								categoryId: undefined,
								personaId: undefined,
								brandVoiceId: undefined,
								status: "draft" as const,
								dateFrom: undefined,
								dateTo: undefined,
							}}
							className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500"
						>
							<svg
								className="w-4 h-4 mr-2"
								fill="none"
								viewBox="0 0 24 24"
								strokeWidth="1.5"
								stroke="currentColor"
							>
								<title>History</title>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
								/>
							</svg>
							Versions
						</Link>

						{/* Image Gallery Link */}
						<Link
							to="/projects/$projectId/content/$contentId/images"
							params={{ projectId, contentId }}
							search={{
								page: 1,
								pageSize: 25,
								categoryId: undefined,
								personaId: undefined,
								brandVoiceId: undefined,
								status: "draft" as const,
								dateFrom: undefined,
								dateTo: undefined,
							}}
							className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500"
						>
							<svg
								className="w-4 h-4 mr-2"
								fill="none"
								viewBox="0 0 24 24"
								strokeWidth="1.5"
								stroke="currentColor"
							>
								<title>Images</title>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"
								/>
							</svg>
							Images
						</Link>

						{/* Finalize or Unlock Button */}
						{isFinalized ? (
							<button
								type="button"
								onClick={() => setShowUnfinalizeDialog(true)}
								className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500"
							>
								<svg
									className="w-4 h-4 mr-2"
									fill="none"
									viewBox="0 0 24 24"
									strokeWidth="1.5"
									stroke="currentColor"
								>
									<title>Unlock</title>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										d="M13.5 10.5V6.75a4.5 4.5 0 119 0v3.75M3.75 21.75h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H3.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
									/>
								</svg>
								Unlock
							</button>
						) : (
							<button
								type="button"
								onClick={() => setShowFinalizeDialog(true)}
								className="inline-flex items-center px-3 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-cyan-600 hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500"
							>
								<svg
									className="w-4 h-4 mr-2"
									fill="none"
									viewBox="0 0 24 24"
									strokeWidth="1.5"
									stroke="currentColor"
								>
									<title>Finalize</title>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
									/>
								</svg>
								Finalize
							</button>
						)}

						{/* Delete Button */}
						<button
							type="button"
							onClick={() => setShowDeleteDialog(true)}
							className="inline-flex items-center px-3 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
						>
							<svg
								className="w-4 h-4 mr-2"
								fill="none"
								viewBox="0 0 24 24"
								strokeWidth="1.5"
								stroke="currentColor"
							>
								<title>Delete</title>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
								/>
							</svg>
							Delete
						</button>
					</div>
				</div>
			</div>

			{/* Editor Layout with AI Panel */}
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
					aiPanel={
						// AI Chat Panel will be implemented in Task Group 16
						// For now, show a placeholder
						<div className="bg-white border border-gray-200 rounded-lg p-4 h-full">
							<h3 className="text-lg font-semibold text-gray-900 mb-2">
								AI Assistant
							</h3>
							<p className="text-sm text-gray-500">
								AI chat panel will be available here.
							</p>
						</div>
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
		</div>
	);
}
