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
				className="fixed inset-0 bg-black bg-opacity-50 z-40"
				onClick={onClose}
			/>

			{/* Dialog */}
			<div className="fixed inset-0 z-50 flex items-center justify-center p-4">
				<div
					className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[80vh] flex flex-col"
					onClick={(e) => e.stopPropagation()}
				>
					{/* Header */}
					<div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
						<div className="flex items-center gap-2">
							{isStreaming && (
								<div className="animate-spin rounded-full h-5 w-5 border-b-2 border-cyan-600" />
							)}
							<h2 className="text-xl font-semibold text-gray-900">
								{isStreaming ? "Refining Selection..." : "Refined Selection"}
							</h2>
						</div>
						<button
							type="button"
							onClick={onClose}
							className="text-gray-400 hover:text-gray-600 transition-colors"
						>
							<X className="w-5 h-5" />
						</button>
					</div>

					{/* Content */}
					<div className="flex-1 overflow-y-auto px-6 py-6">
						{error ? (
							<div className="flex flex-col items-center justify-center py-12">
								<div className="text-red-600 mb-4">
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
								<h3 className="text-lg font-semibold text-gray-900 mb-2">
									Refinement Failed
								</h3>
								<p className="text-gray-600 mb-4 text-center">{error}</p>
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
					<div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
						{isStreaming ? (
							<button
								type="button"
								disabled
								className="px-4 py-2 bg-gray-300 text-gray-500 rounded-lg cursor-not-allowed"
							>
								Generating...
							</button>
						) : error ? (
							<button
								type="button"
								onClick={onClose}
								className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500 transition-colors"
							>
								Close
							</button>
						) : (
							<>
								<button
									type="button"
									onClick={onClose}
									className="px-4 py-2 text-gray-700 bg-white border border-red-600 text-red-600 rounded-lg hover:bg-red-600 hover:text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
								>
									Reject
								</button>
								<button
									type="button"
									onClick={handleAccept}
									className="inline-flex items-center gap-2 px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500 transition-colors"
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
