import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation } from "convex/react";
import { useState, useRef } from "react";
import { api } from "@/convex/api";
import type { Id } from "@/convex/dataModel";
import { ContentEditor, parseContent } from "@/components/content/ContentEditor";
import { ToolsPanel } from "@/components/content/ToolsPanel";
import { FinalizeDialog } from "@/components/content/FinalizeDialog";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { LoadingState } from "@/components/shared/LoadingState";
import { VersionHistorySidebar } from "@/components/content/VersionHistorySidebar";
import { RefineDialog } from "@/components/content/RefineDialog";
import { SelectionRefineDialog } from "@/components/content/SelectionRefineDialog";
import { RepurposeDialog } from "@/components/content/RepurposeDialog";
import { ImagesModal } from "@/components/images/ImagesModal";
import { ContentSubNav } from "@/components/navigation/ContentSubNav";
import { refineSelection } from "@/server/ai";
import { useStreamingResponse } from "@/hooks/useStreamingResponse";
import type { Editor } from "@tiptap/core";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import { X } from "lucide-react";

/**
 * Convert TipTap slice to markdown
 */
function convertSliceToMarkdown(slice: any): string {
	let markdown = "";

	slice.content.forEach((node: ProseMirrorNode, index: number) => {
		const nodeMarkdown = nodeToMarkdown(node);
		markdown += nodeMarkdown;

		// Add spacing between nodes
		if (index < slice.content.childCount - 1) {
			markdown += "\n\n";
		}
	});

	return markdown.trim();
}

/**
 * Convert individual node to markdown
 */
function nodeToMarkdown(node: ProseMirrorNode): string {
	const { type, attrs, content } = node;

	// Handle different node types
	if (type.name === "heading") {
		const level = "#".repeat(attrs.level || 1);
		return `${level} ${node.textContent}`;
	}

	if (type.name === "paragraph") {
		let text = "";
		if (content) {
			content.forEach((child: ProseMirrorNode) => {
				text += applyMarks(child.text || "", Array.from(child.marks || []));
			});
		}
		return text;
	}

	if (type.name === "bulletList") {
		let listMarkdown = "";
		if (content) {
			content.forEach((listItem: ProseMirrorNode) => {
				listMarkdown += `- ${listItem.textContent}\n`;
			});
		}
		return listMarkdown.trim();
	}

	if (type.name === "orderedList") {
		let listMarkdown = "";
		let index = 1;
		if (content) {
			content.forEach((listItem: ProseMirrorNode) => {
				listMarkdown += `${index}. ${listItem.textContent}\n`;
				index++;
			});
		}
		return listMarkdown.trim();
	}

	if (type.name === "blockquote") {
		return `> ${node.textContent}`;
	}

	if (type.name === "codeBlock") {
		const lang = attrs.language || "";
		return `\`\`\`${lang}\n${node.textContent}\n\`\`\``;
	}

	// Default: return text content
	return node.textContent || "";
}

/**
 * Apply markdown marks (bold, italic, code, etc.) to text
 */
function applyMarks(text: string, marks: any[]): string {
	let result = text;

	for (const mark of marks) {
		if (mark.type.name === "bold") {
			result = `**${result}**`;
		} else if (mark.type.name === "italic") {
			result = `*${result}*`;
		} else if (mark.type.name === "code") {
			result = `\`${result}\``;
		} else if (mark.type.name === "strike") {
			result = `~~${result}~~`;
		} else if (mark.type.name === "link") {
			const href = mark.attrs.href || "";
			result = `[${result}](${href})`;
		}
	}

	return result;
}

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
	const [showRefineDialog, setShowRefineDialog] = useState(false);
	const [showSelectionRefineDialog, setShowSelectionRefineDialog] =
		useState(false);
	const [showRepurposeDialog, setShowRepurposeDialog] = useState(false);
	const [showImagesModal, setShowImagesModal] = useState(false);
	const [imagesModalInitialView, setImagesModalInitialView] = useState<"gallery" | "generate">("gallery");
	const [showMobileTools, setShowMobileTools] = useState(false);

	// State for inline refine
	const [inlineRefineSelection, setInlineRefineSelection] = useState<{
		text: string;
		range: { from: number; to: number };
	} | null>(null);
	const editorRef = useRef<Editor | null>(null);

	// State for save indicator
	const [isSaving, setIsSaving] = useState(false);
	const [lastSaved, setLastSaved] = useState<Date | null>(null);

	// Streaming hook for inline refine
	const {
		content: refinedSelectionContent,
		isStreaming: isStreamingSelection,
		error: selectionRefineError,
		startStream: startSelectionStream,
		reset: resetSelectionStream,
	} = useStreamingResponse();

	// Load content piece with relations
	const contentPiece = useQuery(api.contentPieces.getContentPieceWithRelations, {
		contentPieceId: contentId as Id<"contentPieces">,
	});

	// Load derived content (children)
	const derivedContent = useQuery(
		api.contentPieces.getDerivedContent,
		contentPiece ? { parentContentId: contentId as Id<"contentPieces"> } : "skip"
	);

	// Load workspace for images modal
	const workspace = useQuery(api.workspaces.getMyWorkspace);

	// Mutations
	const updateContentPiece = useMutation(api.contentPieces.updateContentPiece);
	const finalizeContentPiece = useMutation(api.contentPieces.finalizeContentPiece);
	const unfinalizeContentPiece = useMutation(
		api.contentPieces.unfinalizeContentPiece
	);
	const deleteContentPiece = useMutation(api.contentPieces.deleteContentPiece);
	const createDerivedContent = useMutation(api.contentPieces.createDerivedContent);

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

	// Handle inline refine trigger
	const handleInlineRefineTrigger = async (
		_selectedText: string,
		selectionRange: { from: number; to: number },
		instructions: string
	) => {
		try {
			if (!editorRef.current) return;

			const editor = editorRef.current;
			const { from, to } = selectionRange;

			// Get the slice of content
			const slice = editor.state.doc.slice(from, to);

			// Convert slice to markdown
			const markdownContent = convertSliceToMarkdown(slice);

			// Store selection info with markdown
			setInlineRefineSelection({
				text: markdownContent,
				range: selectionRange,
			});

			// Blur editor to close bubble menu
			editor.commands.blur();

			// Open selection refine dialog immediately to show streaming
			setShowSelectionRefineDialog(true);

			// Call refineSelection server function with markdown
			const response = await refineSelection({
				data: {
					contentPieceId: contentId as Id<"contentPieces">,
					selectedText: markdownContent, // Send markdown, not plain text
					instructions,
				},
			});

			// Start streaming (dialog will show progress)
			await startSelectionStream(response);
		} catch (error) {
			console.error("Inline refine error:", error);
			alert("Failed to refine selection. Please try again.");
			setShowSelectionRefineDialog(false);
		}
	};

	// Handle accepting refined selection
	const handleAcceptRefinedSelection = async (refinedMarkdown: string) => {
		if (inlineRefineSelection && editorRef.current) {
			const editor = editorRef.current;
			const { range } = inlineRefineSelection;

			// Parse markdown to TipTap JSON
			const parsedContent = parseContent(refinedMarkdown);

			// Extract the content nodes (skip the doc wrapper)
			const contentNodes =
				parsedContent.type === "doc" && parsedContent.content
					? parsedContent.content
					: [parsedContent];

			// Replace the selected range with parsed content
			editor.chain().focus().deleteRange(range).insertContentAt(range.from, contentNodes).run();

			// Get the updated content and save it
			const updatedContent = JSON.stringify(editor.getJSON());
			await updateContentPiece({
				contentPieceId: contentId as Id<"contentPieces">,
				content: updatedContent,
			});

			// Reset and close
			setInlineRefineSelection(null);
			resetSelectionStream();
			setShowSelectionRefineDialog(false);
		}
	};

	// Handle accepting refined content (full content mode)
	const handleAcceptRefine = async (newContent: string) => {
		await updateContentPiece({
			contentPieceId: contentId as Id<"contentPieces">,
			content: newContent,
		});
		setShowRefineDialog(false);
	};

	// Handle accepting repurposed content
	const handleAcceptRepurpose = async (
		content: string,
		categoryId: Id<"categories">,
		title: string,
		personaId?: Id<"personas">,
		brandVoiceId?: Id<"brandVoices">
	) => {
		// Create the derived content piece with the repurposed content
		const result = await createDerivedContent({
			parentContentId: contentId as Id<"contentPieces">,
			categoryId,
			title,
			personaId,
			brandVoiceId,
			content,
		});

		// Navigate to the new content piece
		navigate({
			to: "/projects/$projectId/content/$contentId",
			params: { projectId, contentId: result.contentPieceId },
		});
	};

	// Loading state
	if (contentPiece === undefined) {
		return <LoadingState message="Loading content..." />;
	}

	// Error state
	if (contentPiece === null) {
		return (
			<div className="flex flex-col items-center justify-center h-full py-12">
				<h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
					Content Not Found
				</h2>
				<p className="text-slate-600 dark:text-slate-400 mb-6">
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
				<p className="text-slate-600 dark:text-slate-400">Content is being generated...</p>
			</div>
		);
	}

	const isFinalized = contentPiece.status === "finalized";
	const nextVersion = (contentPiece.currentFinalizedVersion ?? 0) + 1;

	return (
		<>
			{/* Content Sub-Navigation */}
			<ContentSubNav
				title={contentPiece.title}
				projectId={projectId}
				persona={contentPiece.persona}
				brandVoice={contentPiece.brandVoice}
				isSaving={isSaving}
				lastSaved={lastSaved}
				onOpenMobileTools={() => setShowMobileTools(true)}
				onOpenMobileImages={() => {
					setImagesModalInitialView("gallery");
					setShowImagesModal(true);
				}}
			/>

			{/* Main Content Area - Full Width Split Pane Layout */}
			<div className="flex-1 flex overflow-hidden">
				{/* Editor Pane - Full Width */}
				<div className="flex-1 overflow-y-auto bg-slate-950 p-0">
					<ContentEditor
						key={contentPiece.content}
						initialContent={contentPiece.content}
						onChange={() => {
							// Content changes are handled by autosave in ContentEditor
						}}
						contentPieceId={contentId as Id<"contentPieces">}
						disabled={isFinalized}
						onTriggerInlineRefine={handleInlineRefineTrigger}
						onEditorReady={(editor) => {
							editorRef.current = editor;
						}}
						onSaveStateChange={(saving, saved) => {
							setIsSaving(saving);
							setLastSaved(saved);
						}}
					/>
				</div>

				{/* Tools Panel - Always Visible Sidebar */}
				<div className="hidden lg:flex w-80 flex-col border-l border-slate-800 bg-slate-900/80 overflow-y-auto flex-shrink-0">
					<div className="p-4 border-b border-slate-800">
						<h3 className="font-semibold text-slate-200">Content Actions</h3>
					</div>
					<div className="p-4">
						<ToolsPanel
							contentPieceId={contentId as Id<"contentPieces">}
							projectId={projectId as Id<"projects">}
							currentContent={contentPiece.content}
							isFinalized={isFinalized}
							parentContent={
								contentPiece.parentContent
									? {
										_id: contentPiece.parentContent._id,
										title: contentPiece.parentContent.title,
									}
									: null
							}
							derivedContent={derivedContent?.map((child) => ({
								_id: child._id,
								title: child.title,
								category: child.category ? { name: child.category.name } : null,
							}))}
							onRefine={() => setShowRefineDialog(true)}
							onRepurpose={() => setShowRepurposeDialog(true)}
							onShowVersions={() => setShowVersionSidebar(true)}
							onOpenImagesModal={() => {
								setImagesModalInitialView("gallery");
								setShowImagesModal(true);
							}}
							onOpenImagesGenerate={() => {
								setImagesModalInitialView("generate");
								setShowImagesModal(true);
							}}
							onFinalize={() => {
								if (isFinalized) {
									setShowUnfinalizeDialog(true);
								} else {
									setShowFinalizeDialog(true);
								}
							}}
							onDelete={() => setShowDeleteDialog(true)}
						/>
					</div>
				</div>
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

			{/* Refine Dialog */}
			<RefineDialog
				isOpen={showRefineDialog}
				onClose={() => setShowRefineDialog(false)}
				currentContent={contentPiece.content}
				contentPieceId={contentId as Id<"contentPieces">}
				onAccept={handleAcceptRefine}
			/>

			{/* Selection Refine Dialog */}
			<SelectionRefineDialog
				isOpen={showSelectionRefineDialog}
				onClose={() => {
					setShowSelectionRefineDialog(false);
					resetSelectionStream();
					setInlineRefineSelection(null);
				}}
				content={refinedSelectionContent}
				isStreaming={isStreamingSelection}
				error={selectionRefineError ?? undefined}
				onAccept={handleAcceptRefinedSelection}
			/>

			{/* Repurpose Dialog */}
			<RepurposeDialog
				isOpen={showRepurposeDialog}
				onClose={() => setShowRepurposeDialog(false)}
				contentPieceId={contentId as Id<"contentPieces">}
				projectId={projectId as Id<"projects">}
				currentCategoryId={contentPiece.categoryId}
				currentPersonaId={contentPiece.personaId ?? undefined}
				currentBrandVoiceId={contentPiece.brandVoiceId ?? undefined}
				sourceTitle={contentPiece.title}
				onAccept={handleAcceptRepurpose}
			/>

			{/* Images Modal */}
			{workspace && (
				<ImagesModal
					isOpen={showImagesModal}
					onClose={() => setShowImagesModal(false)}
					contentPieceId={contentId as Id<"contentPieces">}
					projectId={projectId as Id<"projects">}
					workspaceId={workspace._id}
					contentText={contentPiece.content}
					initialView={imagesModalInitialView}
				/>
			)}

			{/* Mobile Tools Drawer */}
			<div
				className={`fixed inset-0 z-50 lg:hidden transition-opacity duration-300 ${showMobileTools ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
					}`}
			>
				{/* Backdrop */}
				<div
					className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
					onClick={() => setShowMobileTools(false)}
				/>

				{/* Drawer */}
				<div
					className={`absolute top-0 right-0 h-full w-80 bg-slate-900 border-l border-slate-800 shadow-2xl transform transition-transform duration-300 ${showMobileTools ? "translate-x-0" : "translate-x-full"
						}`}
				>
					<div className="flex items-center justify-between p-4 border-b border-slate-800">
						<h3 className="font-semibold text-slate-200">Tools</h3>
						<button
							onClick={() => setShowMobileTools(false)}
							className="p-1 hover:bg-slate-800 rounded-lg transition-colors text-slate-400 hover:text-white"
						>
							<X size={20} />
						</button>
					</div>
					<div className="overflow-y-auto h-[calc(100%-60px)] p-4">
						<ToolsPanel
							contentPieceId={contentId as Id<"contentPieces">}
							projectId={projectId as Id<"projects">}
							hideImagesSection={true}
							currentContent={contentPiece.content}
							isFinalized={isFinalized}
							parentContent={
								contentPiece.parentContent
									? {
										_id: contentPiece.parentContent._id,
										title: contentPiece.parentContent.title,
									}
									: null
							}
							derivedContent={derivedContent?.map((child) => ({
								_id: child._id,
								title: child.title,
								category: child.category ? { name: child.category.name } : null,
							}))}
							onRefine={() => {
								setShowMobileTools(false);
								setShowRefineDialog(true);
							}}
							onRepurpose={() => {
								setShowMobileTools(false);
								setShowRepurposeDialog(true);
							}}
							onShowVersions={() => {
								setShowMobileTools(false);
								setShowVersionSidebar(true);
							}}
							onOpenImagesModal={() => {
								setImagesModalInitialView("gallery");
								setShowMobileTools(false);
								setShowImagesModal(true);
							}}
							onOpenImagesGenerate={() => {
								setImagesModalInitialView("generate");
								setShowMobileTools(false);
								setShowImagesModal(true);
							}}
							onFinalize={() => {
								setShowMobileTools(false);
								if (isFinalized) {
									setShowUnfinalizeDialog(true);
								} else {
									setShowFinalizeDialog(true);
								}
							}}
							onDelete={() => {
								setShowMobileTools(false);
								setShowDeleteDialog(true);
							}}
						/>
					</div>
				</div>
			</div>
		</>
	);
}
