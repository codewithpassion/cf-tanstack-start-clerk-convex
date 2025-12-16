/**
 * ToolsPanel component provides AI-powered content generation and editing tools.
 *
 * Features:
 * - Quick action buttons for common AI tasks
 * - Image gallery for attached images
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
	Download,
	GitFork,
	ArrowRight,
} from "lucide-react";
import { Link } from "@tanstack/react-router";

export interface ToolsPanelProps {
	/**
	 * ID of the content piece for context
	 */
	contentPieceId: Id<"contentPieces">;

	/**
	 * Project ID for linking
	 */
	projectId: Id<"projects">;

	/**
	 * Current editor content for AI context
	 */
	currentContent: string;

	/**
	 * Parent content if this piece was derived from another
	 */
	parentContent?: {
		_id: string;
		title: string;
		category?: { name: string } | null;
	} | null;

	/**
	 * Derived content pieces (children)
	 */
	derivedContent?: {
		_id: string;
		title: string;
		category?: { name: string } | null;
	}[];

	/**
	 * Callback to trigger refine action
	 */
	onRefine?: () => void;

	/**
	 * Callback to trigger repurpose action
	 */
	onRepurpose?: () => void;

	/**
	 * Callback to show version history
	 */
	onShowVersions?: () => void;

	/**
	 * Callback to open images modal
	 */
	onOpenImagesModal?: () => void;

	/**
	 * Callback to open images modal in generate mode
	 */
	onOpenImagesGenerate?: () => void;

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
	projectId,
	parentContent,
	derivedContent,
	onRefine,
	onRepurpose,
	onShowVersions,
	onOpenImagesModal,
	onOpenImagesGenerate,
	onFinalize,
	onDelete,
	isFinalized = false,
}: ToolsPanelProps) {
	const hasRelationships =
		parentContent || (derivedContent && derivedContent.length > 0);
	// Fetch attached images from Convex
	const contentImages = useQuery(api.contentImages.listContentImages, {
		contentPieceId,
	});

	// Preview modal state
	const [previewImage, setPreviewImage] = useState<{
		fileId: Id<"files">;
		filename: string;
		caption?: string;
	} | null>(null);

	// Handle image download
	const handleDownload = async (fileId: Id<"files">, filename: string) => {
		try {
			const response = await fetch(`/api/files/${fileId}/preview`);
			const blob = await response.blob();
			const url = window.URL.createObjectURL(blob);
			const a = document.createElement("a");
			a.href = url;
			a.download = filename;
			document.body.appendChild(a);
			a.click();
			window.URL.revokeObjectURL(url);
			document.body.removeChild(a);
		} catch (error) {
			console.error("Failed to download image:", error);
		}
	};

	return (
		<div
			data-testid="tools-panel"
			className="flex flex-col h-full bg-gradient-to-br from-white via-slate-50 to-slate-100 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800/80 border border-slate-200 dark:border-slate-800 dark:border-t-2 dark:border-t-amber-400/30 rounded-xl shadow-sm transition-all duration-300 hover:shadow-lg dark:hover:shadow-[0_8px_30px_rgba(0,0,0,0.3),0_0_30px_rgba(251,191,36,0.15)]"
		>
			{/* Panel Header */}
			<div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-800">
				<h3 className="font-semibold text-slate-900 dark:text-amber-50 font-['Lexend']">Content Actions</h3>
			</div>

			{/* AI Action Buttons */}
			<div className="px-4 py-4 space-y-2 border-b border-slate-200 dark:border-slate-800">
				{/* Refine Button - Primary CTA with Amber */}
				<button
					type="button"
					onClick={onRefine}
					className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 dark:bg-amber-500 dark:hover:bg-amber-400 text-white text-sm font-medium rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 transition-all duration-300 hover:shadow-lg hover:shadow-amber-500/30 dark:hover:shadow-amber-400/30"
				>
					<Sparkles className="w-4 h-4" />
					Refine
				</button>

				{/* Finalize or Unlock Button */}
				{isFinalized ? (
					<button
						type="button"
						onClick={onFinalize}
						className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-sm font-medium rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 transition-all duration-300"
					>
						<Unlock className="w-4 h-4" />
						Unlock
					</button>
				) : (
					<button
						type="button"
						onClick={onFinalize}
						className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-all duration-300"
					>
						<Lock className="w-4 h-4" />
						Finalize
					</button>
				)}

				{/* Repurpose Button */}
				<button
					type="button"
					onClick={onRepurpose}
					className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-900 dark:text-slate-100 text-sm font-medium rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 transition-all duration-300"
				>
					<GitFork className="w-4 h-4" />
					Repurpose
				</button>
			</div>

			{/* Content Actions */}
			<div className="px-4 py-4 space-y-2 border-b border-slate-200 dark:border-slate-800">
				{/* Version History Button */}
				<button
					type="button"
					onClick={onShowVersions}
					className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-900 dark:text-slate-100 text-sm font-medium rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 transition-all duration-300"
				>
					<Clock className="w-4 h-4" />
					Versions
				</button>

				{/* Delete Button */}
				<button
					type="button"
					onClick={onDelete}
					className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-red-600 dark:border-red-800 text-red-600 dark:text-red-400 text-sm font-medium rounded-lg hover:bg-red-600 hover:text-white dark:hover:bg-red-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-all duration-300"
				>
					<Trash2 className="w-4 h-4" />
					Delete
				</button>
			</div>

			{/* Relationships Section */}
			{hasRelationships && (
				<div className="px-4 py-4 border-b border-slate-200 dark:border-slate-800">
					<h4 className="text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wide mb-3">
						Relationships
					</h4>

					<div className="space-y-3">
						{/* Parent Content (Derived From) */}
						{parentContent && (
							<div>
								<div className="flex items-center gap-1.5 text-xs text-slate-500 mb-1.5">
									<GitFork className="w-3.5 h-3.5" />
									<span>Derived from</span>
								</div>
								<Link
									to="/projects/$projectId/content/$contentId"
									params={{
										projectId,
										contentId: parentContent._id,
									}}
									className="block p-2 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/30 hover:bg-amber-100 dark:hover:bg-amber-900/50 transition-colors"
								>
									<div className="flex items-center gap-2">
										<span className="text-amber-600">←</span>
										<div className="min-w-0 flex-1">
											<p className="text-sm font-medium text-amber-900 dark:text-amber-100 truncate">
												{parentContent.title}
											</p>
											{parentContent.category && (
												<p className="text-xs text-amber-700 dark:text-amber-300">
													{parentContent.category.name}
												</p>
											)}
										</div>
									</div>
								</Link>
							</div>
						)}

						{/* Derived Content (Children) */}
						{derivedContent && derivedContent.length > 0 && (
							<div>
								<div className="flex items-center gap-1.5 text-xs text-slate-500 mb-1.5">
									<ArrowRight className="w-3.5 h-3.5" />
									<span>Repurposed to ({derivedContent.length})</span>
								</div>
								<div className="space-y-1.5">
									{derivedContent.map((child) => (
										<Link
											key={child._id}
											to="/projects/$projectId/content/$contentId"
											params={{
												projectId,
												contentId: child._id,
											}}
											className="block p-2 rounded-lg border border-cyan-200 dark:border-cyan-800 bg-cyan-50 dark:bg-cyan-900/30 hover:bg-cyan-100 dark:hover:bg-cyan-900/50 transition-colors"
										>
											<div className="flex items-center gap-2">
												<span className="text-cyan-600">→</span>
												<div className="min-w-0 flex-1">
													<p className="text-sm font-medium text-cyan-900 dark:text-cyan-100 truncate">
														{child.title}
													</p>
													{child.category && (
														<p className="text-xs text-cyan-700 dark:text-cyan-300">
															{child.category.name}
														</p>
													)}
												</div>
											</div>
										</Link>
									))}
								</div>
							</div>
						)}
					</div>
				</div>
			)}

			{/* Images Gallery */}
			<div className="flex-1 overflow-y-auto px-4 py-4 min-h-0">
				<div className="flex items-center justify-between mb-3">
					<h4 className="text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wide">
						Images
					</h4>
					<div className="flex items-center gap-1">
						<button
							type="button"
							onClick={onOpenImagesGenerate}
							className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 rounded hover:bg-amber-100 dark:hover:bg-amber-900/50 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-amber-500 transition-colors"
							title="Generate AI image"
						>
							<Sparkles className="w-3 h-3" />
						</button>
						<button
							type="button"
							onClick={onOpenImagesModal}
							className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded hover:bg-slate-200 dark:hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-amber-500 transition-colors"
						>
							<Image className="w-3 h-3" />
							Manage
						</button>
					</div>
				</div>

				{contentImages === undefined ? (
					<div className="flex items-center justify-center py-8">
						<div className="animate-spin rounded-full h-6 w-6 border-b-2 border-amber-500" />
					</div>
				) : contentImages.length === 0 ? (
					<div className="text-center text-slate-500 dark:text-slate-400 text-sm py-8">
						<svg
							className="mx-auto h-10 w-10 text-slate-400 dark:text-slate-500 mb-2"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
							aria-hidden="true"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={2}
								d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
							/>
						</svg>
						<p>No images attached</p>
						<p className="mt-1 text-xs">
							Click Manage to create images
						</p>
					</div>
				) : (
					<div className="grid grid-cols-2 gap-2">
						{contentImages.map((image) => (
							<div
								key={image._id}
								onClick={() => {
									if (image.file) {
										setPreviewImage({
											fileId: image.fileId,
											filename: image.file.filename,
											caption: image.caption,
										});
									}
								}}
								className="relative group border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 hover:shadow-md dark:hover:shadow-[0_4px_15px_rgba(0,0,0,0.3),0_0_15px_rgba(251,191,36,0.1)] hover:border-amber-400/50 dark:hover:border-amber-400/50 transition-all duration-300"
							>
								<div className="aspect-square bg-slate-100 dark:bg-slate-950 flex items-center justify-center overflow-hidden">
									{image.file ? (
										<img
											src={`/api/files/${image.fileId}/preview?variant=thumbnail`}
											alt={image.caption || image.file.filename}
											className="w-full h-full object-cover"
										/>
									) : (
										<div className="text-slate-400 text-xs">No preview</div>
									)}
								</div>

								{/* Download Button - Visible on mobile, hover on desktop */}
								{image.file && (
									<button
										type="button"
										onClick={(e) => {
											e.stopPropagation();
											handleDownload(image.fileId, image.file!.filename);
										}}
										className="absolute top-2 right-2 p-1.5 bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm border border-slate-200 dark:border-slate-700 rounded-full shadow-lg hover:bg-white dark:hover:bg-slate-800 transition-all opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
										aria-label="Download image"
										title="Download image"
									>
										<Download className="w-3.5 h-3.5 text-slate-700 dark:text-slate-200" />
									</button>
								)}

								{image.caption && (
									<div className="px-2 py-1.5">
										<p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-1">
											{image.caption}
										</p>
									</div>
								)}
							</div>
						))}
					</div>
				)}
			</div>

			{/* Preview Modal */}
			{previewImage && (
				<div
					className="fixed inset-0 z-50 overflow-y-auto"
					role="dialog"
					aria-modal="true"
					aria-labelledby="image-preview-title"
				>
					<div className="flex min-h-screen items-center justify-center p-4">
						<div
							className="fixed inset-0 bg-black bg-opacity-75 transition-opacity"
							onClick={() => setPreviewImage(null)}
						/>
						<div className="relative bg-white rounded-lg max-w-4xl w-full">
							<div className="p-4 border-b">
								<div className="flex items-center justify-between">
									<h3
										id="image-preview-title"
										className="text-lg font-medium text-slate-900"
									>
										Image Preview
									</h3>
									<button
										type="button"
										onClick={() => setPreviewImage(null)}
										className="text-slate-400 hover:text-slate-500"
										aria-label="Close preview"
									>
										<svg
											className="w-6 h-6"
											fill="none"
											viewBox="0 0 24 24"
											stroke="currentColor"
										>
											<path
												strokeLinecap="round"
												strokeLinejoin="round"
												strokeWidth={2}
												d="M6 18L18 6M6 6l12 12"
											/>
										</svg>
									</button>
								</div>
							</div>
							<div className="p-4">
								<div className="bg-slate-100 rounded flex items-center justify-center max-h-96 overflow-auto">
									<img
										src={`/api/files/${previewImage.fileId}/preview?variant=thumbnail`}
										alt={previewImage.caption || previewImage.filename}
										className="max-w-full max-h-96 object-contain"
									/>
								</div>
								{previewImage.caption && (
									<p className="mt-4 text-sm text-slate-700">
										{previewImage.caption}
									</p>
								)}
								<p className="mt-2 text-xs text-slate-500">
									{previewImage.filename}
								</p>
							</div>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
