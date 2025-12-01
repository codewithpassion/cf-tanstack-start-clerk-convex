/**
 * Image Generation Preview Component
 *
 * Displays AI-generated images with options to attach, discard, or retry
 * with a modified prompt. Shows loading state during generation.
 */

import { useState } from "react";
import type { Id } from "../../../convex/_generated/dataModel";

export interface ImageGenerationPreviewProps {
	fileId: Id<"files"> | null;
	previewUrl: string | null;
	prompt: string;
	onAttach: (fileId: Id<"files">) => void;
	onDiscard: () => void;
	onRetry: (modifiedPrompt: string) => void;
	isGenerating?: boolean;
}

/**
 * Preview component for AI-generated images
 */
export function ImageGenerationPreview({
	fileId,
	previewUrl,
	prompt,
	onAttach,
	onDiscard,
	onRetry,
	isGenerating = false,
}: ImageGenerationPreviewProps) {
	const [editedPrompt, setEditedPrompt] = useState(prompt);
	const [isEditingPrompt, setIsEditingPrompt] = useState(false);

	const handleRetry = () => {
		if (editedPrompt.trim() && editedPrompt !== prompt) {
			onRetry(editedPrompt);
			setIsEditingPrompt(false);
		} else {
			onRetry(prompt);
		}
	};

	const handleAttach = () => {
		if (fileId) {
			onAttach(fileId);
		}
	};

	return (
		<div className="border rounded-lg bg-white overflow-hidden">
			{/* Image Preview or Loading State */}
			<div className="bg-gray-100 flex items-center justify-center min-h-96">
				{isGenerating ? (
					<div className="text-center p-8">
						<div className="animate-spin rounded-full h-16 w-16 border-b-4 border-cyan-600 mx-auto mb-4" />
						<p className="text-lg font-medium text-gray-900">Generating Image...</p>
						<p className="text-sm text-gray-500 mt-2">This may take 10-30 seconds</p>
					</div>
				) : previewUrl && fileId ? (
					<div className="w-full p-4">
						<img
							src={previewUrl}
							alt="Generated image"
							className="max-w-full max-h-96 mx-auto object-contain rounded"
						/>
					</div>
				) : (
					<div className="text-center p-8 text-gray-500">
						<svg
							className="mx-auto h-16 w-16 text-gray-400 mb-4"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={2}
								d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
							/>
						</svg>
						<p className="text-sm">No image generated yet</p>
					</div>
				)}
			</div>

			{/* Prompt Display/Edit Section */}
			<div className="p-4 border-t bg-white">
				<div className="mb-4">
					<div className="flex items-center justify-between mb-2">
						<label htmlFor="image-prompt" className="text-sm font-medium text-gray-700">
							Image Prompt
						</label>
						{!isEditingPrompt && !isGenerating && (
							<button
								type="button"
								onClick={() => setIsEditingPrompt(true)}
								className="text-xs text-cyan-600 hover:text-cyan-700"
							>
								Edit Prompt
							</button>
						)}
					</div>

					{isEditingPrompt ? (
						<div className="space-y-2">
							<textarea
								id="image-prompt"
								value={editedPrompt}
								onChange={(e) => setEditedPrompt(e.target.value)}
								className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
								rows={4}
								maxLength={4000}
								placeholder="Modify the prompt to refine the image..."
							/>
							<p className="text-xs text-gray-500">{editedPrompt.length}/4000 characters</p>
							<div className="flex gap-2">
								<button
									type="button"
									onClick={() => {
										setIsEditingPrompt(false);
										setEditedPrompt(prompt);
									}}
									className="text-xs px-3 py-1 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
								>
									Cancel
								</button>
								<button
									type="button"
									onClick={() => setIsEditingPrompt(false)}
									className="text-xs px-3 py-1 bg-cyan-600 text-white rounded hover:bg-cyan-700"
								>
									Save Changes
								</button>
							</div>
						</div>
					) : (
						<div className="text-sm text-gray-700 bg-gray-50 rounded p-3 max-h-32 overflow-y-auto">
							{prompt}
						</div>
					)}
				</div>

				{/* Action Buttons */}
				<div className="flex gap-3">
					{fileId && previewUrl && !isGenerating ? (
						<>
							<button
								type="button"
								onClick={handleAttach}
								className="flex-1 bg-cyan-600 text-white px-4 py-2 rounded-md hover:bg-cyan-700 font-medium text-sm"
							>
								Attach to Content
							</button>
							<button
								type="button"
								onClick={onDiscard}
								className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400 font-medium text-sm"
							>
								Discard
							</button>
							<button
								type="button"
								onClick={handleRetry}
								className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 font-medium text-sm"
							>
								Retry
							</button>
						</>
					) : !isGenerating ? (
						<>
							<button
								type="button"
								onClick={handleRetry}
								disabled={!editedPrompt.trim()}
								className="flex-1 bg-cyan-600 text-white px-4 py-2 rounded-md hover:bg-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium text-sm"
							>
								Generate Image
							</button>
							<button
								type="button"
								onClick={onDiscard}
								className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 font-medium text-sm"
							>
								Cancel
							</button>
						</>
					) : (
						<div className="flex-1 text-center text-sm text-gray-500 py-2">
							Please wait while the image is being generated...
						</div>
					)}
				</div>

				{/* Additional Info */}
				{fileId && previewUrl && (
					<div className="mt-4 pt-4 border-t">
						<p className="text-xs text-gray-500">
							Tip: You can retry generation with a modified prompt to refine the result, or attach
							this image to your content piece.
						</p>
					</div>
				)}
			</div>
		</div>
	);
}
