import { X } from "lucide-react";
import { StreamingMarkdown } from "@/components/shared/StreamingMarkdown";

/**
 * Props for SelectionRefineDialog component
 */
export interface SelectionRefineDialogProps {
	/**
	 * Whether the dialog is open
	 */
	isOpen: boolean;

	/**
	 * Callback when dialog should close
	 */
	onClose: () => void;

	/**
	 * The refined content (streaming or complete)
	 */
	content: string;

	/**
	 * Whether content is currently streaming
	 */
	isStreaming: boolean;

	/**
	 * Error message if refinement failed
	 */
	error?: string;

	/**
	 * Callback when user accepts the refined content
	 */
	onAccept: (content: string) => void;
}

/**
 * Dialog for displaying refined selection content.
 *
 * Simpler than RefineDialog - only shows the result, no input state.
 * Used for inline text selection refinement.
 */
export function SelectionRefineDialog({
	isOpen,
	onClose,
	content,
	isStreaming,
	error,
	onAccept,
}: SelectionRefineDialogProps) {
	// Don't render if not open
	if (!isOpen) {
		return null;
	}

	const handleAccept = () => {
		onAccept(content);
	};

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
							{isStreaming && (
								<div className="animate-spin rounded-full h-5 w-5 border-b-2 border-cyan-600 dark:border-amber-500" />
							)}
							<h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
								{isStreaming ? "Refining Selection..." : "Refined Selection"}
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
						{error ? (
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
								<p className="text-slate-600 dark:text-slate-300 mb-4 text-center">{error}</p>
							</div>
						) : (
							<StreamingMarkdown
								content={content}
								isStreaming={isStreaming}
								emptyMessage="Waiting for refined content..."
							/>
						)}
					</div>

					{/* Footer */}
					<div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900">
						{isStreaming ? (
							<button
								type="button"
								disabled
								className="px-4 py-2 bg-slate-300 dark:bg-slate-700 text-slate-500 dark:text-slate-400 rounded-lg cursor-not-allowed"
							>
								Generating...
							</button>
						) : error ? (
							<button
								type="button"
								onClick={onClose}
								className="px-4 py-2 text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500 dark:focus:ring-amber-500 transition-colors"
							>
								Close
							</button>
						) : (
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
									Apply to Selection
								</button>
							</>
						)}
					</div>
				</div>
			</div>
		</>
	);
}
