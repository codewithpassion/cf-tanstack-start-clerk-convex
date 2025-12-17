import { useState, useEffect } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/api";
import type { Id } from "@/convex/dataModel";
import { useStreamingResponse } from "@/hooks/useStreamingResponse";
import { StreamingMarkdown } from "@/components/shared/StreamingMarkdown";
import { repurposeContent } from "@/server/ai";
import { GitFork, X, ChevronDown } from "lucide-react";

/**
 * Props for RepurposeDialog component
 */
export interface RepurposeDialogProps {
	/**
	 * Whether the dialog is open
	 */
	isOpen: boolean;

	/**
	 * Callback when dialog should close
	 */
	onClose: () => void;

	/**
	 * ID of the content piece being repurposed
	 */
	contentPieceId: Id<"contentPieces">;

	/**
	 * Project ID for fetching categories, personas, brand voices
	 */
	projectId: Id<"projects">;

	/**
	 * Current category ID (to exclude from target selection)
	 */
	currentCategoryId: Id<"categories">;

	/**
	 * Current persona ID (for default selection)
	 */
	currentPersonaId?: Id<"personas">;

	/**
	 * Current brand voice ID (for default selection)
	 */
	currentBrandVoiceId?: Id<"brandVoices">;

	/**
	 * Source content title (for generating default title)
	 */
	sourceTitle: string;

	/**
	 * Callback when user accepts the repurposed content
	 * Returns the new content piece ID for navigation
	 */
	onAccept: (
		content: string,
		categoryId: Id<"categories">,
		title: string,
		personaId?: Id<"personas">,
		brandVoiceId?: Id<"brandVoices">
	) => Promise<void>;
}

/**
 * Dialog state machine
 */
type DialogState = "form" | "streaming" | "complete" | "error";

/**
 * Dialog for repurposing content to a different format/category.
 *
 * Features:
 * - Form state: User selects target category, persona, brand voice, title, and instructions
 * - Streaming state: AI streams repurposed content in real-time
 * - Complete state: Shows final result with Accept/Reject/Regenerate options
 * - Error state: Shows error with retry option
 * - Preserves lineage by creating derived content
 */
export function RepurposeDialog({
	isOpen,
	onClose,
	contentPieceId,
	projectId,
	currentCategoryId,
	currentPersonaId,
	currentBrandVoiceId,
	sourceTitle,
	onAccept,
}: RepurposeDialogProps) {
	const [state, setState] = useState<DialogState>("form");
	const [targetCategoryId, setTargetCategoryId] =
		useState<Id<"categories"> | null>(null);
	const [targetPersonaId, setTargetPersonaId] = useState<
		Id<"personas"> | undefined
	>(currentPersonaId);
	const [targetBrandVoiceId, setTargetBrandVoiceId] = useState<
		Id<"brandVoices"> | undefined
	>(currentBrandVoiceId);
	const [title, setTitle] = useState("");
	const [additionalInstructions, setAdditionalInstructions] = useState("");
	const [isSubmitting, setIsSubmitting] = useState(false);
	const { content, isStreaming, error, startStream, reset } =
		useStreamingResponse();

	// Fetch available categories
	const categories = useQuery(api.categories.listCategories, { projectId });

	// Fetch available personas
	const personas = useQuery(api.personas.listPersonas, { projectId });

	// Fetch available brand voices
	const brandVoices = useQuery(api.brandVoices.listBrandVoices, { projectId });

	// Filter out current category from options
	const availableCategories =
		categories?.filter((c) => c._id !== currentCategoryId) ?? [];

	// Reset state when dialog opens
	useEffect(() => {
		if (isOpen) {
			setState("form");
			setTargetCategoryId(null);
			setTargetPersonaId(currentPersonaId);
			setTargetBrandVoiceId(currentBrandVoiceId);
			setTitle("");
			setAdditionalInstructions("");
			setIsSubmitting(false);
			reset();
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [isOpen, currentPersonaId, currentBrandVoiceId]);

	// Generate default title when category is selected
	useEffect(() => {
		if (targetCategoryId && !title) {
			const category = availableCategories.find(
				(c) => c._id === targetCategoryId
			);
			if (category) {
				setTitle(`${sourceTitle} (${category.name})`);
			}
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [targetCategoryId]);

	// Handle form submission
	const handleSubmit = async () => {
		if (!targetCategoryId || !title.trim()) {
			return;
		}

		setState("streaming");

		try {
			const response = await repurposeContent({
				data: {
					sourceContentPieceId: contentPieceId,
					targetCategoryId,
					targetPersonaId,
					targetBrandVoiceId,
					title: title.trim(),
					additionalInstructions: additionalInstructions.trim() || undefined,
				},
			});

			await startStream(response);
			setState("complete");
		} catch (err) {
			console.error("Repurpose error:", err);
			setState("error");
		}
	};

	// Handle accept - create derived content and navigate
	const handleAccept = async () => {
		if (!targetCategoryId) return;

		setIsSubmitting(true);
		try {
			await onAccept(
				content,
				targetCategoryId,
				title.trim(),
				targetPersonaId,
				targetBrandVoiceId
			);
			onClose();
		} catch (err) {
			console.error("Failed to create derived content:", err);
			setState("error");
		} finally {
			setIsSubmitting(false);
		}
	};

	// Handle regenerate
	const handleRegenerate = () => {
		setState("form");
		reset();
	};

	// Handle retry from error state
	const handleRetry = () => {
		setState("form");
	};

	// Handle keyboard shortcut (Ctrl+Enter to submit)
	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === "Enter" && (e.ctrlKey || e.metaKey) && state === "form") {
			e.preventDefault();
			handleSubmit();
		}
	};

	// Don't render if not open
	if (!isOpen) {
		return null;
	}

	const isFormValid = targetCategoryId && title.trim();

	return (
		<>
			{/* Backdrop */}
			<div
				className="fixed inset-0 bg-black bg-opacity-50 dark:bg-black dark:bg-opacity-90 z-40"
				onClick={onClose}
			/>

			{/* Dialog */}
			<div className="fixed inset-0 z-50 flex items-center justify-center p-4">
				<div
					className="bg-white dark:bg-slate-900 rounded-lg shadow-xl dark:shadow-[0_8px_30px_rgba(0,0,0,0.5),0_0_30px_rgba(251,191,36,0.15)] w-full max-w-3xl max-h-[85vh] flex flex-col border border-slate-200 dark:border-slate-800"
					onClick={(e) => e.stopPropagation()}
					onKeyDown={handleKeyDown}
				>
					{/* Header */}
					<div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
						<div className="flex items-center gap-2">
							{state === "streaming" && (
								<div className="animate-spin rounded-full h-5 w-5 border-b-2 border-cyan-600 dark:border-amber-500" />
							)}
							<GitFork className="w-5 h-5 text-cyan-600 dark:text-amber-400" />
							<h2 className="text-xl font-semibold text-slate-900 dark:text-amber-50">
								{state === "form" && "Repurpose Content"}
								{state === "streaming" && "Generating..."}
								{state === "complete" && "Repurposed Content"}
								{state === "error" && "Error"}
							</h2>
						</div>
						<button
							type="button"
							onClick={onClose}
							className="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
						>
							<X className="w-5 h-5" />
						</button>
					</div>

					{/* Content */}
					<div className="flex-1 overflow-y-auto px-6 py-6">
						{/* Form State */}
						{state === "form" && (
							<div className="space-y-5">
								{/* Target Category Selection */}
								<div>
									<label
										htmlFor="target-category"
										className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-2"
									>
										Target Format <span className="text-red-500 dark:text-red-400">*</span>
									</label>
									<div className="relative">
										<select
											id="target-category"
											value={targetCategoryId ?? ""}
											onChange={(e) =>
												setTargetCategoryId(
													e.target.value as Id<"categories"> | null
												)
											}
											className="w-full px-4 py-2.5 text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 dark:focus:ring-amber-500 appearance-none"
										>
											<option value="">Select target format...</option>
											{availableCategories.map((category) => (
												<option key={category._id} value={category._id}>
													{category.name}
												</option>
											))}
										</select>
										<ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 dark:text-slate-500 pointer-events-none" />
									</div>
									{availableCategories.length === 0 && (
										<p className="mt-2 text-sm text-amber-600 dark:text-amber-400">
											No other formats available. Create more categories in
											project settings.
										</p>
									)}
								</div>

								{/* Title Input */}
								<div>
									<label
										htmlFor="repurpose-title"
										className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-2"
									>
										Title <span className="text-red-500 dark:text-red-400">*</span>
									</label>
									<input
										id="repurpose-title"
										type="text"
										value={title}
										onChange={(e) => setTitle(e.target.value)}
										placeholder="Enter title for the new content..."
										className="w-full px-4 py-2.5 text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 dark:focus:ring-amber-500 placeholder:text-slate-400 dark:placeholder:text-slate-500"
									/>
								</div>

								{/* Persona Selection (Optional) */}
								<div>
									<label
										htmlFor="target-persona"
										className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-2"
									>
										Persona{" "}
										<span className="text-slate-400 dark:text-slate-500 font-normal">(optional)</span>
									</label>
									<div className="relative">
										<select
											id="target-persona"
											value={targetPersonaId ?? ""}
											onChange={(e) =>
												setTargetPersonaId(
													(e.target.value as Id<"personas">) || undefined
												)
											}
											className="w-full px-4 py-2.5 text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 dark:focus:ring-amber-500 appearance-none"
										>
											<option value="">No persona</option>
											{personas?.map((persona) => (
												<option key={persona._id} value={persona._id}>
													{persona.name}
												</option>
											))}
										</select>
										<ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 dark:text-slate-500 pointer-events-none" />
									</div>
								</div>

								{/* Brand Voice Selection (Optional) */}
								<div>
									<label
										htmlFor="target-brandvoice"
										className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-2"
									>
										Brand Voice{" "}
										<span className="text-slate-400 dark:text-slate-500 font-normal">(optional)</span>
									</label>
									<div className="relative">
										<select
											id="target-brandvoice"
											value={targetBrandVoiceId ?? ""}
											onChange={(e) =>
												setTargetBrandVoiceId(
													(e.target.value as Id<"brandVoices">) || undefined
												)
											}
											className="w-full px-4 py-2.5 text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 dark:focus:ring-amber-500 appearance-none"
										>
											<option value="">No brand voice</option>
											{brandVoices?.map((voice) => (
												<option key={voice._id} value={voice._id}>
													{voice.name}
												</option>
											))}
										</select>
										<ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 dark:text-slate-500 pointer-events-none" />
									</div>
								</div>

								{/* Additional Instructions */}
								<div>
									<label
										htmlFor="additional-instructions"
										className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-2"
									>
										Additional Instructions{" "}
										<span className="text-slate-400 dark:text-slate-500 font-normal">(optional)</span>
									</label>
									<textarea
										id="additional-instructions"
										value={additionalInstructions}
										onChange={(e) => setAdditionalInstructions(e.target.value)}
										placeholder="e.g., Focus on the key takeaways, make it more conversational, include a call-to-action..."
										className="w-full h-24 px-4 py-3 text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 dark:focus:ring-amber-500 resize-none placeholder:text-slate-400 dark:placeholder:text-slate-500"
									/>
									<p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
										Press{" "}
										<kbd className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded">
											Ctrl
										</kbd>{" "}
										+{" "}
										<kbd className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded">
											Enter
										</kbd>{" "}
										to generate
									</p>
								</div>
							</div>
						)}

						{/* Streaming State */}
						{state === "streaming" && (
							<StreamingMarkdown
								content={content}
								isStreaming={isStreaming}
								emptyMessage="Generating repurposed content..."
							/>
						)}

						{/* Complete State */}
						{state === "complete" && (
							<StreamingMarkdown
								content={content}
								isStreaming={false}
								emptyMessage=""
							/>
						)}

						{/* Error State */}
						{state === "error" && (
							<div className="flex flex-col items-center justify-center py-12">
								<div className="text-red-600 dark:text-red-400 mb-4">
									<svg
										className="w-16 h-16"
										fill="none"
										stroke="currentColor"
										viewBox="0 0 24 24"
									>
										<title>Error</title>
										<path
											strokeLinecap="round"
											strokeLinejoin="round"
											strokeWidth={2}
											d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
										/>
									</svg>
								</div>
								<h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">
									Repurposing Failed
								</h3>
								<p className="text-slate-600 dark:text-slate-300 mb-4 text-center">
									{error || "An error occurred while repurposing the content"}
								</p>
							</div>
						)}
					</div>

					{/* Footer */}
					<div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900">
						{/* Form State Footer */}
						{state === "form" && (
							<>
								<button
									type="button"
									onClick={onClose}
									className="px-4 py-2 text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500 dark:focus:ring-amber-500 transition-colors"
								>
									Cancel
								</button>
								<button
									type="button"
									onClick={handleSubmit}
									disabled={!isFormValid}
									className="inline-flex items-center gap-2 px-4 py-2 bg-cyan-600 dark:bg-amber-500 text-white rounded-lg hover:bg-cyan-700 dark:hover:bg-amber-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500 dark:focus:ring-amber-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
								>
									<GitFork className="w-4 h-4" />
									Generate
								</button>
							</>
						)}

						{/* Streaming State Footer */}
						{state === "streaming" && (
							<button
								type="button"
								disabled
								className="px-4 py-2 bg-slate-300 dark:bg-slate-700 text-slate-500 dark:text-slate-400 rounded-lg cursor-not-allowed"
							>
								Generating...
							</button>
						)}

						{/* Complete State Footer */}
						{state === "complete" && (
							<>
								<button
									type="button"
									onClick={onClose}
									className="px-4 py-2 text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-red-600 dark:border-red-800 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-600 hover:text-white dark:hover:bg-red-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
								>
									Reject
								</button>
								<button
									type="button"
									onClick={handleRegenerate}
									className="px-4 py-2 text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500 dark:focus:ring-amber-500 transition-colors"
								>
									Regenerate
								</button>
								<button
									type="button"
									onClick={handleAccept}
									disabled={isSubmitting}
									className="inline-flex items-center gap-2 px-4 py-2 bg-cyan-600 dark:bg-amber-500 text-white rounded-lg hover:bg-cyan-700 dark:hover:bg-amber-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500 dark:focus:ring-amber-500 transition-colors disabled:opacity-50"
								>
									{isSubmitting ? (
										<>
											<div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
											Creating...
										</>
									) : (
										<>
											<svg
												className="w-4 h-4"
												fill="none"
												viewBox="0 0 24 24"
												stroke="currentColor"
											>
												<title>Accept</title>
												<path
													strokeLinecap="round"
													strokeLinejoin="round"
													strokeWidth={2}
													d="M5 13l4 4L19 7"
												/>
											</svg>
											Accept & Create
										</>
									)}
								</button>
							</>
						)}

						{/* Error State Footer */}
						{state === "error" && (
							<>
								<button
									type="button"
									onClick={onClose}
									className="px-4 py-2 text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500 dark:focus:ring-amber-500 transition-colors"
								>
									Close
								</button>
								<button
									type="button"
									onClick={handleRetry}
									className="px-4 py-2 bg-cyan-600 dark:bg-amber-500 text-white rounded-lg hover:bg-cyan-700 dark:hover:bg-amber-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500 dark:focus:ring-amber-500 transition-colors"
								>
									Retry
								</button>
							</>
						)}
					</div>
				</div>
			</div>
		</>
	);
}
