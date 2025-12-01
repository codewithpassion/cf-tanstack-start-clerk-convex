/**
 * ToolsPanel component provides AI-powered content generation and editing tools.
 *
 * Features:
 * - Quick action buttons for common AI tasks
 * - Recent generations history
 * - Content management actions (versions, images, finalize, delete)
 * - Always visible on the right side of the editor
 */
import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/api";
import type { Id } from "@/convex/dataModel";
import {
	Sparkles,
	Clock,
	Image,
	Lock,
	Unlock,
	Trash2,
} from "lucide-react";

export interface ToolsPanelProps {
	/**
	 * ID of the content piece for context
	 */
	contentPieceId: Id<"contentPieces">;

	/**
	 * Current editor content for AI context
	 */
	currentContent: string;

	/**
	 * Optional callback when user wants to apply AI suggestion to editor
	 */
	onApplyToContent?: (content: string) => void;

	/**
	 * Callback to trigger refine action
	 */
	onRefine?: () => void;

	/**
	 * Callback to trigger change tone action
	 */
	onChangeTone?: (tone: string) => void;

	/**
	 * Callback to show version history
	 */
	onShowVersions?: () => void;

	/**
	 * Callback to show images
	 */
	onShowImages?: () => void;

	/**
	 * Callback to finalize content
	 */
	onFinalize?: () => void;

	/**
	 * Callback to delete content
	 */
	onDelete?: () => void;

	/**
	 * Whether content is finalized
	 */
	isFinalized?: boolean;
}

/**
 * Always-visible AI tools panel for content editing assistance.
 */
export function ToolsPanel({
	contentPieceId,
	onApplyToContent,
	onRefine,
	onChangeTone,
	onShowVersions,
	onShowImages,
	onFinalize,
	onDelete,
	isFinalized = false,
}: ToolsPanelProps) {
	// Fetch chat history (recent generations) from Convex
	const chatMessages = useQuery(api.contentChatMessages.listChatMessages, {
		contentPieceId,
	});

	// Local state
	const [selectedTone, setSelectedTone] = useState<string>("professional");

	// Filter to show only assistant messages (AI generations)
	const recentGenerations = (chatMessages || [])
		.filter((msg) => msg.role === "assistant")
		.slice(-5) // Show last 5 generations
		.reverse(); // Most recent first

	// Handle applying a generation to the editor
	const handleApplyGeneration = (content: string) => {
		if (onApplyToContent) {
			onApplyToContent(content);
		}
	};

	// Copy to clipboard
	const handleCopy = (text: string) => {
		navigator.clipboard.writeText(text);
		// TODO: Show toast notification
	};

	return (
		<div
			data-testid="tools-panel"
			className="flex flex-col h-full bg-white border border-gray-200 rounded-lg shadow-sm"
		>
			{/* Panel Header */}
			<div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
				<h3 className="font-semibold text-gray-900">Tools</h3>
			</div>

			{/* AI Action Buttons */}
			<div className="px-4 py-4 space-y-2 border-b border-gray-200">
				{/* Refine Button - Primary CTA */}
				<button
					type="button"
					onClick={onRefine}
					className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-cyan-600 text-white text-sm font-medium rounded-lg hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500 transition-colors"
				>
					<Sparkles className="w-4 h-4" />
					Refine
				</button>

				{/* Create Images Button */}
				<button
					type="button"
					onClick={onShowImages}
					className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500 transition-colors"
				>
					<Image className="w-4 h-4" />
					Create images
				</button>

				{/* Change Tone - Select + Button */}
				<div className="flex gap-2">
					<select
						value={selectedTone}
						onChange={(e) => setSelectedTone(e.target.value)}
						className="flex-1 px-3 py-2 text-sm text-gray-900 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
					>
						<option value="professional">Professional</option>
						<option value="casual">Casual</option>
						<option value="friendly">Friendly</option>
						<option value="formal">Formal</option>
						<option value="enthusiastic">Enthusiastic</option>
					</select>
					<button
						type="button"
						onClick={() => onChangeTone?.(selectedTone)}
						className="px-4 py-2 bg-white border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500 transition-colors whitespace-nowrap"
					>
						Apply Tone
					</button>
				</div>
			</div>

			{/* Content Actions */}
			<div className="px-4 py-4 space-y-2 border-b border-gray-200">
				<h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-3">
					Content Actions
				</h4>

				{/* Version History Button */}
				<button
					type="button"
					onClick={onShowVersions}
					className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500 transition-colors"
				>
					<Clock className="w-4 h-4" />
					Versions
				</button>

				{/* Finalize or Unlock Button */}
				{isFinalized ? (
					<button
						type="button"
						onClick={onFinalize}
						className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500 transition-colors"
					>
						<Unlock className="w-4 h-4" />
						Unlock
					</button>
				) : (
					<button
						type="button"
						onClick={onFinalize}
						className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors"
					>
						<Lock className="w-4 h-4" />
						Finalize
					</button>
				)}

				{/* Delete Button */}
				<button
					type="button"
					onClick={onDelete}
					className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 bg-white border border-red-600 text-red-600 text-sm font-medium rounded-lg hover:bg-red-600 hover:text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
				>
					<Trash2 className="w-4 h-4" />
					Delete
				</button>
			</div>

			{/* Recent Generations */}
			<div className="flex-1 overflow-y-auto px-4 py-4 min-h-0">
				<h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-3">
					Recent Generations
				</h4>

				{recentGenerations.length === 0 ? (
					<div className="text-center text-gray-500 text-sm py-8">
						<p>No generations yet.</p>
						<p className="mt-1 text-xs">
							Use the tools above to generate content.
						</p>
					</div>
				) : (
					<div className="space-y-2">
						{recentGenerations.map((generation) => {
							// Truncate content for preview (first 100 chars)
							const preview =
								generation.content.length > 100
									? `${generation.content.slice(0, 100)}...`
									: generation.content;

							return (
								<div
									key={generation._id}
									className="bg-gray-50 border border-gray-200 rounded-lg p-3 hover:bg-gray-100 transition-colors cursor-pointer group"
									onClick={() => handleApplyGeneration(generation.content)}
								>
									<div className="flex items-start justify-between gap-2 mb-2">
										<div className="flex-1 text-xs text-gray-600 line-clamp-3">
											{preview}
										</div>
									</div>
									<div className="flex items-center gap-2 text-xs">
										<button
											type="button"
											onClick={(e) => {
												e.stopPropagation();
												handleCopy(generation.content);
											}}
											className="text-gray-500 hover:text-gray-700 transition-colors"
											title="Copy to clipboard"
										>
											Copy
										</button>
										<span className="text-gray-300">•</span>
										<button
											type="button"
											onClick={(e) => {
												e.stopPropagation();
												handleApplyGeneration(generation.content);
											}}
											className="text-cyan-600 hover:text-cyan-700 transition-colors font-medium"
											title="Apply to content"
										>
											Apply
										</button>
									</div>
								</div>
							);
						})}
					</div>
				)}
			</div>
		</div>
	);
}
