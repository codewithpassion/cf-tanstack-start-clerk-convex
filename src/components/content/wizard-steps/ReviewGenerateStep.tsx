import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { GenerationStep } from "../GenerationStep";

export interface ReviewGenerateStepProps {
	projectId: Id<"projects">;
	categoryId: Id<"categories">;
	personaId: Id<"personas"> | null;
	brandVoiceId: Id<"brandVoices"> | null;
	useAllKnowledgeBase: boolean;
	selectedKnowledgeBaseIds: Id<"knowledgeBaseItems">[];
	title: string;
	topic: string;
	draftContent: string;
	uploadedFileIds: Id<"files">[];
	onEditStep1: () => void;
	onEditStep2: () => void;
	onComplete: (contentPieceId: Id<"contentPieces">) => void;
}

type ViewState = "review" | "generating" | "complete";

/**
 * Review and Generate Step: Shows a summary of all selections before triggering generation.
 * Part of the content creation wizard (Phase 3.4).
 */
export function ReviewGenerateStep({
	projectId,
	categoryId,
	personaId,
	brandVoiceId,
	useAllKnowledgeBase,
	selectedKnowledgeBaseIds,
	title,
	topic,
	draftContent,
	uploadedFileIds,
	onEditStep1,
	onEditStep2,
	onComplete,
}: ReviewGenerateStepProps) {
	const [viewState, setViewState] = useState<ViewState>("review");

	// Fetch data for display
	const category = useQuery(api.categories.getCategory, { categoryId });
	const persona = useQuery(
		api.personas.getPersona,
		personaId ? { personaId } : "skip"
	);
	const brandVoice = useQuery(
		api.brandVoices.getBrandVoice,
		brandVoiceId ? { brandVoiceId } : "skip"
	);
	const knowledgeBaseItems = useQuery(api.knowledgeBase.listKnowledgeBaseItems, {
		categoryId,
	});

	const handleGenerate = () => {
		setViewState("generating");
	};

	const handleGenerationComplete = (contentPieceId: Id<"contentPieces">) => {
		onComplete(contentPieceId);
	};

	if (viewState === "generating") {
		return (
			<GenerationStep
				projectId={projectId}
				categoryId={categoryId}
				personaId={personaId}
				brandVoiceId={brandVoiceId}
				title={title}
				topic={topic}
				draftContent={draftContent}
				uploadedFileIds={uploadedFileIds}
				selectedKnowledgeBaseIds={
					useAllKnowledgeBase
						? knowledgeBaseItems?.map((item) => item._id) ?? []
						: selectedKnowledgeBaseIds
				}
				onComplete={handleGenerationComplete}
			/>
		);
	}

	const isLoading = !category;

	return (
		<div className="space-y-6">
			{/* Selection Summary Card */}
			<div className="bg-white/50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg p-4 space-y-3">
				<div className="flex items-center justify-between">
					<h3 className="text-sm font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wide">
						Selection Summary
					</h3>
					<button
						type="button"
						onClick={onEditStep1}
						className="text-sm text-cyan-600 dark:text-cyan-400 hover:text-cyan-700 dark:hover:text-cyan-300 font-medium"
					>
						Edit
					</button>
				</div>

				{isLoading ? (
					<div className="text-slate-600 dark:text-slate-300">Loading...</div>
				) : (
					<div className="space-y-2">
						{/* Category */}
						<div>
							<span className="text-sm text-slate-600 dark:text-slate-400">
								Category:{" "}
							</span>
							<span className="text-slate-900 dark:text-white font-medium">
								{category?.name}
							</span>
						</div>

						{/* Persona */}
						<div>
							<span className="text-sm text-slate-600 dark:text-slate-400">
								Persona:{" "}
							</span>
							<span className="text-slate-900 dark:text-white">
								{persona ? persona.name : "None"}
							</span>
						</div>

						{/* Brand Voice */}
						<div>
							<span className="text-sm text-slate-600 dark:text-slate-400">
								Brand Voice:{" "}
							</span>
							<span className="text-slate-900 dark:text-white">
								{brandVoice ? brandVoice.name : "None"}
							</span>
						</div>

						{/* Knowledge Base Selection */}
						<div>
							<span className="text-sm text-slate-600 dark:text-slate-400">
								Knowledge Base:{" "}
							</span>
							<span className="text-slate-900 dark:text-white">
								{useAllKnowledgeBase
									? `Using all knowledge base items${
											knowledgeBaseItems
												? ` (${knowledgeBaseItems.length})`
												: ""
										}`
									: selectedKnowledgeBaseIds.length > 0
										? `Using ${selectedKnowledgeBaseIds.length} selected items`
										: "None selected"}
							</span>
						</div>
					</div>
				)}
			</div>

			{/* Content Details Summary Card */}
			<div className="bg-white/50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg p-4 space-y-3">
				<div className="flex items-center justify-between">
					<h3 className="text-sm font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wide">
						Content Details
					</h3>
					<button
						type="button"
						onClick={onEditStep2}
						className="text-sm text-cyan-600 dark:text-cyan-400 hover:text-cyan-700 dark:hover:text-cyan-300 font-medium"
					>
						Edit
					</button>
				</div>

				<div className="space-y-2">
					{/* Title */}
					<div>
						<span className="text-sm text-slate-600 dark:text-slate-400">
							Title:{" "}
						</span>
						<span className="text-slate-900 dark:text-white font-medium">
							{title}
						</span>
					</div>

					{/* Topic */}
					{topic && (
						<div>
							<span className="text-sm text-slate-600 dark:text-slate-400">
								Topic:{" "}
							</span>
							<span className="text-slate-600 dark:text-slate-300">{topic}</span>
						</div>
					)}

					{/* Draft Content */}
					{draftContent && (
						<div>
							<span className="text-sm text-slate-600 dark:text-slate-400">
								Draft Content:{" "}
							</span>
							<span className="text-slate-600 dark:text-slate-300">
								{draftContent.length > 100
									? `${draftContent.substring(0, 100)}...`
									: draftContent}
							</span>
						</div>
					)}

					{/* Source Files */}
					{uploadedFileIds.length > 0 && (
						<div>
							<span className="text-sm text-slate-600 dark:text-slate-400">
								Source Files:{" "}
							</span>
							<span className="text-slate-600 dark:text-slate-300">
								{uploadedFileIds.length} file
								{uploadedFileIds.length !== 1 ? "s" : ""} uploaded
							</span>
						</div>
					)}
				</div>
			</div>

			{/* Generate Button */}
			<div className="flex justify-center pt-4 border-t border-slate-200 dark:border-slate-700">
				<button
					type="button"
					onClick={handleGenerate}
					disabled={isLoading}
					className="px-8 py-3 bg-cyan-600 hover:bg-cyan-700 disabled:bg-slate-400 disabled:cursor-not-allowed text-white rounded-lg font-medium text-lg"
				>
					Generate Draft
				</button>
			</div>
		</div>
	);
}
