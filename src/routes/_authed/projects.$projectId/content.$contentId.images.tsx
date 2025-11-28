/**
 * Image Management Route
 *
 * Route for managing images attached to a content piece.
 * Provides three tabs: Gallery (view/manage), Upload (direct upload), and Generate (AI generation).
 */

import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/api";
import type { Id } from "@/convex/dataModel";
import { ImageGallery } from "@/components/images/ImageGallery";
import { ImageUploader } from "@/components/images/ImageUploader";
import { ImagePromptWizard } from "@/components/images/ImagePromptWizard";
import { ImageGenerationPreview } from "@/components/images/ImageGenerationPreview";
import { generateImage } from "@/server/ai";

type TabType = "gallery" | "upload" | "generate";

export const Route = createFileRoute(
	"/_authed/projects/$projectId/content/$contentId/images"
)({
	component: ContentImagesPage,
});

/**
 * Image management page with tabbed interface
 */
function ContentImagesPage() {
	const { projectId, contentId } = Route.useParams();
	const contentPieceId = contentId as Id<"contentPieces">;
	const projectIdTyped = projectId as Id<"projects">;

	// Query content piece to verify access and get workspace
	const contentPiece = useQuery(api.contentPieces.getContentPiece, {
		contentPieceId,
	});

	const project = useQuery(
		api.projects.getProject,
		contentPiece ? { projectId: contentPiece.projectId } : "skip"
	);

	const workspace = useQuery(
		api.workspaces.getMyWorkspace,
	);

	const attachImage = useMutation(api.contentImages.attachImage);

	const [activeTab, setActiveTab] = useState<TabType>("gallery");
	const [showPromptWizard, setShowPromptWizard] = useState(false);
	const [generationState, setGenerationState] = useState<{
		prompt: string;
		fileId: Id<"files"> | null;
		previewUrl: string | null;
		isGenerating: boolean;
	} | null>(null);

	// Handle image generation from wizard
	const handleGenerateFromWizard = async (prompt: string) => {
		if (!workspace) return;

		setShowPromptWizard(false);
		setGenerationState({
			prompt,
			fileId: null,
			previewUrl: null,
			isGenerating: true,
		});

		try {
			const result = await generateImage({
				data: {
					prompt,
					workspaceId: workspace._id,
					projectId: projectIdTyped,
				},
			});

			setGenerationState({
				prompt,
				fileId: result.fileId,
				previewUrl: result.previewUrl,
				isGenerating: false,
			});
		} catch (error) {
			console.error("Image generation failed:", error);
			setGenerationState({
				prompt,
				fileId: null,
				previewUrl: null,
				isGenerating: false,
			});
		}
	};

	// Handle retry with modified prompt
	const handleRetry = async (modifiedPrompt: string) => {
		if (!workspace) return;

		setGenerationState({
			prompt: modifiedPrompt,
			fileId: null,
			previewUrl: null,
			isGenerating: true,
		});

		try {
			const result = await generateImage({
				data: {
					prompt: modifiedPrompt,
					workspaceId: workspace._id,
					projectId: projectIdTyped,
				},
			});

			setGenerationState({
				prompt: modifiedPrompt,
				fileId: result.fileId,
				previewUrl: result.previewUrl,
				isGenerating: false,
			});
		} catch (error) {
			console.error("Image generation failed:", error);
			setGenerationState({
				prompt: modifiedPrompt,
				fileId: null,
				previewUrl: null,
				isGenerating: false,
			});
		}
	};

	// Handle attaching generated image
	const handleAttachGenerated = async (fileId: Id<"files">) => {
		try {
			await attachImage({
				contentPieceId,
				fileId,
				generatedPrompt: generationState?.prompt,
			});

			// Clear generation state and switch to gallery
			setGenerationState(null);
			setActiveTab("gallery");
		} catch (error) {
			console.error("Failed to attach image:", error);
		}
	};

	// Handle discarding generated image
	const handleDiscardGenerated = () => {
		setGenerationState(null);
	};

	// Handle upload completion
	const handleUploadComplete = () => {
		setActiveTab("gallery");
	};

	// Loading state
	if (contentPiece === undefined || project === undefined || workspace === undefined) {
		return (
			<div className="flex items-center justify-center min-h-96">
				<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-600" />
			</div>
		);
	}

	// Error state
	if (!contentPiece || !project || !workspace) {
		return (
			<div className="text-center py-12">
				<p className="text-red-600">Content piece not found or access denied.</p>
			</div>
		);
	}

	return (
		<div className="max-w-6xl mx-auto px-4 py-8">
			{/* Header */}
			<div className="mb-6">
				<h1 className="text-2xl font-bold text-gray-900">Image Management</h1>
				<p className="text-sm text-gray-500 mt-1">
					Manage images for: {contentPiece.title}
				</p>
			</div>

			{/* Tabs */}
			<div className="border-b border-gray-200 mb-6">
				<nav className="-mb-px flex gap-8" aria-label="Tabs">
					<button
						type="button"
						onClick={() => setActiveTab("gallery")}
						className={`
							py-4 px-1 border-b-2 font-medium text-sm transition-colors
							${activeTab === "gallery"
								? "border-cyan-500 text-cyan-600"
								: "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
							}
						`}
					>
						Gallery
					</button>
					<button
						type="button"
						onClick={() => setActiveTab("upload")}
						className={`
							py-4 px-1 border-b-2 font-medium text-sm transition-colors
							${activeTab === "upload"
								? "border-cyan-500 text-cyan-600"
								: "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
							}
						`}
					>
						Upload
					</button>
					<button
						type="button"
						onClick={() => setActiveTab("generate")}
						className={`
							py-4 px-1 border-b-2 font-medium text-sm transition-colors
							${activeTab === "generate"
								? "border-cyan-500 text-cyan-600"
								: "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
							}
						`}
					>
						Generate with AI
					</button>
				</nav>
			</div>

			{/* Tab Content */}
			<div className="mt-6">
				{/* Gallery Tab */}
				{activeTab === "gallery" && <ImageGallery contentPieceId={contentPieceId} />}

				{/* Upload Tab */}
				{activeTab === "upload" && (
					<div className="max-w-2xl">
						<h2 className="text-lg font-medium text-gray-900 mb-4">
							Upload Image
						</h2>
						<ImageUploader
							contentPieceId={contentPieceId}
							workspaceId={workspace._id}
							onUploadComplete={handleUploadComplete}
						/>
					</div>
				)}

				{/* Generate Tab */}
				{activeTab === "generate" && (
					<div className="max-w-3xl">
						<h2 className="text-lg font-medium text-gray-900 mb-4">
							Generate Image with AI
						</h2>

						{generationState ? (
							<ImageGenerationPreview
								fileId={generationState.fileId}
								previewUrl={generationState.previewUrl}
								prompt={generationState.prompt}
								onAttach={handleAttachGenerated}
								onDiscard={handleDiscardGenerated}
								onRetry={handleRetry}
								isGenerating={generationState.isGenerating}
							/>
						) : (
							<div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
								<svg
									className="mx-auto h-12 w-12 text-gray-400 mb-4"
									fill="none"
									viewBox="0 0 24 24"
									stroke="currentColor"
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={2}
										d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
									/>
								</svg>
								<h3 className="text-lg font-medium text-gray-900 mb-2">
									Create an AI-Generated Image
								</h3>
								<p className="text-sm text-gray-500 mb-6">
									Use our wizard to create a detailed prompt and generate custom images
								</p>
								<button
									type="button"
									onClick={() => setShowPromptWizard(true)}
									className="bg-cyan-600 text-white px-6 py-3 rounded-md hover:bg-cyan-700 font-medium"
								>
									Start Prompt Wizard
								</button>
							</div>
						)}
					</div>
				)}
			</div>

			{/* Image Prompt Wizard Modal */}
			<ImagePromptWizard
				isOpen={showPromptWizard}
				projectId={projectIdTyped}
				onGenerate={handleGenerateFromWizard}
				onClose={() => setShowPromptWizard(false)}
			/>
		</div>
	);
}
