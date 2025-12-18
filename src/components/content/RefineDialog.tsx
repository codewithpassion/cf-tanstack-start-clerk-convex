import { useState, useEffect } from "react";
import type { Id } from "@/convex/dataModel";
import { useStreamingResponse } from "@/hooks/useStreamingResponse";
import { StreamingMarkdown } from "@/components/shared/StreamingMarkdown";
import { refineContent } from "@/server/ai";
import { Sparkles, X } from "lucide-react";

/**
 * Props for RefineDialog component
 */
export interface RefineDialogProps {
	/**
	 * Whether the dialog is open
	 */
	isOpen: boolean;

	/**
	 * Callback when dialog should close
	 */
	onClose: () => void;

	/**
	 * Current content from the editor
	 */
	currentContent: string;

	/**
	 * ID of the content piece being refined
	 */
	contentPieceId: Id<"contentPieces">;

	/**
	 * Callback when user accepts the refined content
	 */
	onAccept: (newContent: string) => void;
}

/**
 * Dialog state machine
 */
type DialogState = "input" | "streaming" | "complete" | "error";

/**
 * Dialog for refining content with AI assistance.
 *
 * Features:
 * - Input state: User enters refinement instructions
 * - Streaming state: AI streams refined content in real-time
 * - Complete state: Shows final result with Accept/Reject/Refine Again options
 * - Error state: Shows error with retry option
 * - Ctrl+Enter keyboard shortcut to submit
 *
 * @example
 * ```tsx
 * <RefineDialog
 *   isOpen={showDialog}
 *   onClose={() => setShowDialog(false)}
 *   currentContent={editorContent}
 *   contentPieceId={contentId}
 *   onAccept={(newContent) => updateContent(newContent)}
 * />
 * ```
 */
export function RefineDialog({
	isOpen,
	onClose,
	currentContent,
	contentPieceId,
	onAccept,
}: RefineDialogProps) {
	const [state, setState] = useState<DialogState>("input");
	const [instructions, setInstructions] = useState("");
	const [isRefineAgain, setIsRefineAgain] = useState(false);
	const [refineFromOriginal, setRefineFromOriginal] = useState(false);
	const [refinedContent, setRefinedContent] = useState("");
	const { content, isStreaming, error, startStream, reset } =
		useStreamingResponse();

	// Reset state when dialog opens
	useEffect(() => {
		if (isOpen) {
			setState("input");
			setInstructions("");
			setIsRefineAgain(false);
			setRefineFromOriginal(false);
			setRefinedContent("");
			reset();
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [isOpen]);

	// Handle submit
	const handleSubmit = async () => {
		if (!instructions.trim()) {
			return; // Don't submit empty instructions
		}

		setState("streaming");

		try {
			// Determine which content to use as base
			const baseContent = isRefineAgain && !refineFromOriginal
				? refinedContent
				: currentContent;

			const response = await refineContent({
				data: {
					contentPieceId,
					currentContent: baseContent,
					instructions,
				},
			});

			const result = await startStream(response);
			setRefinedContent(result); // Store the refined content
			setState("complete");
		} catch (err) {
			console.error("Refine error:", err);
			setState("error");
		}
	};

	// Handle accept - pass refined content to parent
	const handleAccept = () => {
		onAccept(content);
		onClose();
	};

	// Handle refine again - reset to input state
	const handleRefineAgain = () => {
		setState("input");
		setInstructions("");
		setIsRefineAgain(true); // Mark that we're in refine again mode
		setRefineFromOriginal(false); // Default to refining from refined version
		reset();
	};

	// Handle retry from error state
	const handleRetry = () => {
		setState("input");
	};

	// Handle keyboard shortcut (Ctrl+Enter to submit)
	const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
		if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
			e.preventDefault();
			handleSubmit();
		}
	};

	// Don't render if not open
	if (!isOpen) {
		return null;
	}

	return (
		<>
			{/* Backdrop */}
			<div
				className="fixed inset-0 bg-black bg-opacity-50 dark:bg-black dark:bg-opacity-80 z-40"
				onClick={onClose}
			/>

			{/* Dialog */}
			<div className="fixed inset-0 z-50 flex items-center justify-center p-4">
				<div
					className="bg-white dark:bg-slate-900 rounded-lg shadow-xl dark:shadow-[0_8px_30px_rgba(0,0,0,0.5),0_0_30px_rgba(251,191,36,0.15)] w-full max-w-3xl max-h-[80vh] flex flex-col border border-slate-200 dark:border-slate-800"
					onClick={(e) => e.stopPropagation()}
				>
					{/* Header */}
					<div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
						<div className="flex items-center gap-2">
							{state === "streaming" && (
								<div className="animate-spin rounded-full h-5 w-5 border-b-2 border-cyan-600 dark:border-amber-500" />
							)}
							<h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
								{state === "input" && "Refine Content"}
								{state === "streaming" && "Refining..."}
								{state === "complete" && "Refined Content"}
								{state === "error" && "Error"}
							</h2>
						</div>
						<button
							type="button"
							onClick={onClose}
							className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
						>
							<X className="w-5 h-5" />
						</button>
					</div>

					{/* Content */}
					<div className="flex-1 overflow-y-auto px-6 py-6">
						{/* Input State */}
						{state === "input" && (
							<div className="space-y-4">
								<div>
									<label
										htmlFor="refine-instructions"
										className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-2"
									>
										What would you like to refine?
									</label>
									<textarea
										id="refine-instructions"
										value={instructions}
										onChange={(e) => setInstructions(e.target.value)}
										onKeyDown={handleKeyDown}
										placeholder="e.g., Make this more concise and add specific examples..."
										className="w-full h-32 px-4 py-3 text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 dark:focus:ring-amber-500 resize-none placeholder:text-slate-400 dark:placeholder:text-slate-500"
										autoFocus
									/>
									<p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
										Press <kbd className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded">Ctrl</kbd> +{" "}
										<kbd className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded">Enter</kbd> to submit
									</p>
								</div>

								{/* Refine from Original Switch - only show in "refine again" mode */}
								{isRefineAgain && (
									<div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
										<div className="flex-1">
											<label
												htmlFor="refine-from-original"
												className="text-sm font-medium text-slate-700 dark:text-slate-200 cursor-pointer"
											>
												Refine from original
											</label>
											<p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
												{refineFromOriginal
													? "Using original content as base"
													: "Using refined content as base"}
											</p>
										</div>
										<button
											type="button"
											id="refine-from-original"
											role="switch"
											aria-checked={refineFromOriginal}
											onClick={() => setRefineFromOriginal(!refineFromOriginal)}
											className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-500 dark:focus:ring-amber-500 focus:ring-offset-2 ${refineFromOriginal ? "bg-cyan-600 dark:bg-amber-500" : "bg-slate-300 dark:bg-slate-600"
												}`}
										>
											<span
												className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${refineFromOriginal ? "translate-x-6" : "translate-x-1"
													}`}
											/>
										</button>
									</div>
								)}
							</div>
						)}

						{/* Streaming State */}
						{state === "streaming" && (
							<StreamingMarkdown
								content={content}
								isStreaming={isStreaming}
								emptyMessage="Waiting for refined content..."
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
									Refinement Failed
								</h3>
								<p className="text-slate-600 dark:text-slate-300 mb-4 text-center">
									{error || "An error occurred while refining the content"}
								</p>
							</div>
						)}
					</div>

					{/* Footer */}
					<div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900">
						{/* Input State Footer */}
						{state === "input" && (
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
									disabled={!instructions.trim()}
									className="inline-flex items-center gap-2 px-4 py-2 bg-cyan-600 dark:bg-amber-500 text-white rounded-lg hover:bg-cyan-700 dark:hover:bg-amber-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500 dark:focus:ring-amber-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
								>
									<Sparkles className="w-4 h-4" />
									Send
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
									onClick={handleRefineAgain}
									className="px-4 py-2 text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500 dark:focus:ring-amber-500 transition-colors"
								>
									Refine Again
								</button>
								<button
									type="button"
									onClick={handleAccept}
									className="inline-flex items-center gap-2 px-4 py-2 bg-cyan-600 dark:bg-amber-500 text-white rounded-lg hover:bg-cyan-700 dark:hover:bg-amber-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500 dark:focus:ring-amber-500 transition-colors"
								>
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
									Accept
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
