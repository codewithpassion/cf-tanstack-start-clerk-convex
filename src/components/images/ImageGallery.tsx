/**
 * Image Gallery Component
 *
 * Displays attached images in a grid with thumbnails, drag-and-drop reordering,
 * inline caption editing, delete functionality, and preview modal with zoom.
 */

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";

export interface ImageGalleryProps {
	contentPieceId: Id<"contentPieces">;
}

interface PreviewImage {
	fileId: Id<"files">;
	filename: string;
	r2Key: string;
	caption?: string;
}

/**
 * Image Gallery displays attached images with management capabilities
 */
export function ImageGallery({ contentPieceId }: ImageGalleryProps) {
	const images = useQuery(api.contentImages.listContentImages, { contentPieceId });
	const updateImageCaption = useMutation(api.contentImages.updateImageCaption);
	const reorderImages = useMutation(api.contentImages.reorderImages);
	const detachImage = useMutation(api.contentImages.detachImage);

	const [editingCaptionId, setEditingCaptionId] = useState<Id<"contentImages"> | null>(null);
	const [editedCaption, setEditedCaption] = useState("");
	const [previewImage, setPreviewImage] = useState<PreviewImage | null>(null);
	const [deleteConfirmId, setDeleteConfirmId] = useState<Id<"contentImages"> | null>(null);
	const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
	const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

	// Handle caption editing
	const startEditingCaption = (imageId: Id<"contentImages">, currentCaption?: string) => {
		setEditingCaptionId(imageId);
		setEditedCaption(currentCaption || "");
	};

	const saveCaption = async (imageId: Id<"contentImages">) => {
		try {
			await updateImageCaption({
				contentImageId: imageId,
				caption: editedCaption.trim() || undefined,
			});
			setEditingCaptionId(null);
			setEditedCaption("");
		} catch (error) {
			console.error("Failed to update caption:", error);
		}
	};

	const cancelEditingCaption = () => {
		setEditingCaptionId(null);
		setEditedCaption("");
	};

	// Handle image deletion
	const confirmDelete = async () => {
		if (!deleteConfirmId) return;

		try {
			await detachImage({ contentImageId: deleteConfirmId });
			setDeleteConfirmId(null);
		} catch (error) {
			console.error("Failed to delete image:", error);
		}
	};

	// Handle drag-and-drop reordering
	const handleDragStart = (index: number) => {
		setDraggedIndex(index);
	};

	const handleDragOver = (e: React.DragEvent, index: number) => {
		e.preventDefault();
		setDragOverIndex(index);
	};

	const handleDragEnd = async () => {
		if (draggedIndex === null || dragOverIndex === null || !images) {
			setDraggedIndex(null);
			setDragOverIndex(null);
			return;
		}

		if (draggedIndex === dragOverIndex) {
			setDraggedIndex(null);
			setDragOverIndex(null);
			return;
		}

		// Reorder the array
		const reorderedImages = [...images];
		const [draggedItem] = reorderedImages.splice(draggedIndex, 1);
		reorderedImages.splice(dragOverIndex, 0, draggedItem);

		// Update sortOrder in backend
		try {
			await reorderImages({
				contentPieceId,
				imageIds: reorderedImages.map((img) => img._id),
			});
		} catch (error) {
			console.error("Failed to reorder images:", error);
		}

		setDraggedIndex(null);
		setDragOverIndex(null);
	};

	// Handle preview modal
	const openPreview = (image: NonNullable<typeof images>[number]) => {
		if (!image.file) return;

		setPreviewImage({
			fileId: image.fileId,
			filename: image.file.filename,
			r2Key: image.file.r2Key,
			caption: image.caption,
		});
	};

	const closePreview = () => {
		setPreviewImage(null);
	};

	// Loading state
	if (images === undefined) {
		return (
			<div className="flex items-center justify-center py-12">
				<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-600" />
			</div>
		);
	}

	// Empty state
	if (images.length === 0) {
		return (
			<div className="text-center py-12 text-gray-500">
				<svg
					className="mx-auto h-12 w-12 text-gray-400"
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
				<p className="mt-2 text-sm">No images attached yet</p>
				<p className="text-xs text-gray-400">Upload or generate images to get started</p>
			</div>
		);
	}

	return (
		<div className="space-y-4">
			{/* Image Grid */}
			<div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
				{images.map((image, index) => (
					<div
						key={image._id}
						draggable
						onDragStart={() => handleDragStart(index)}
						onDragOver={(e) => handleDragOver(e, index)}
						onDragEnd={handleDragEnd}
						className={`
							relative group border rounded-lg overflow-hidden bg-white cursor-move
							${dragOverIndex === index ? "ring-2 ring-cyan-500" : ""}
							${draggedIndex === index ? "opacity-50" : ""}
						`}
					>
						{/* Image Thumbnail */}
						<div
							className="aspect-square bg-gray-100 flex items-center justify-center overflow-hidden cursor-pointer"
							onClick={() => openPreview(image)}
						>
							{image.file ? (
								<img
									src={`/api/files/${image.fileId}/preview${
										// @ts-ignore - thumbnailR2Key added to schema but types not regenerated
										image.file.thumbnailR2Key ? "?variant=thumbnail" : ""
									}`}
									alt={image.caption || image.file.filename}
									className="w-full h-full object-cover"
								/>
							) : (
								<div className="text-gray-400 text-sm">No preview</div>
							)}
						</div>

						{/* Caption */}
						<div className="p-2">
							{editingCaptionId === image._id ? (
								<div className="space-y-2">
									<input
										type="text"
										value={editedCaption}
										onChange={(e) => setEditedCaption(e.target.value)}
										className="w-full text-sm text-gray-900 placeholder-gray-400 border rounded px-2 py-1 focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
										placeholder="Add caption..."
										maxLength={500}
										autoFocus
									/>
									<div className="flex gap-1">
										<button
											type="button"
											onClick={() => saveCaption(image._id)}
											className="flex-1 text-xs bg-cyan-600 text-white px-2 py-1 rounded hover:bg-cyan-700"
											aria-label="Save caption"
										>
											Save
										</button>
										<button
											type="button"
											onClick={cancelEditingCaption}
											className="flex-1 text-xs bg-gray-300 text-gray-700 px-2 py-1 rounded hover:bg-gray-400"
										>
											Cancel
										</button>
									</div>
								</div>
							) : (
								<div className="flex items-start justify-between gap-2">
									<p className="text-sm text-gray-700 flex-1 line-clamp-2">
										{image.caption || (
											<span className="text-gray-400 italic">No caption</span>
										)}
									</p>
									<button
										type="button"
										onClick={() => startEditingCaption(image._id, image.caption)}
										className="text-gray-400 hover:text-cyan-600 flex-shrink-0"
										aria-label="Edit caption"
									>
										<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
											<path
												strokeLinecap="round"
												strokeLinejoin="round"
												strokeWidth={2}
												d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
											/>
										</svg>
									</button>
								</div>
							)}
						</div>

						{/* Action Buttons - Visible on hover */}
						<div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
							<button
								type="button"
								onClick={() => setDeleteConfirmId(image._id)}
								className="bg-red-600 text-white p-1.5 rounded-full hover:bg-red-700 shadow-lg"
								aria-label="Delete image"
							>
								<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={2}
										d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
									/>
								</svg>
							</button>
						</div>
					</div>
				))}
			</div>

			{/* Delete Confirmation Modal */}
			{deleteConfirmId && (
				<div className="fixed inset-0 z-50 overflow-y-auto" role="dialog" aria-modal="true">
					<div className="flex min-h-screen items-center justify-center p-4">
						<div
							className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
							onClick={() => setDeleteConfirmId(null)}
						/>
						<div className="relative bg-white rounded-lg p-6 max-w-sm w-full">
							<h3 className="text-lg font-medium text-gray-900 mb-4">Delete Image</h3>
							<p className="text-sm text-gray-500 mb-6">
								Are you sure you want to remove this image? This action cannot be undone.
							</p>
							<div className="flex gap-3 justify-end">
								<button
									type="button"
									onClick={() => setDeleteConfirmId(null)}
									className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
								>
									Cancel
								</button>
								<button
									type="button"
									onClick={confirmDelete}
									className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700"
								>
									Confirm
								</button>
							</div>
						</div>
					</div>
				</div>
			)}

			{/* Preview Modal */}
			{previewImage && (
				<div className="fixed inset-0 z-50 overflow-y-auto" role="dialog" aria-modal="true" aria-labelledby="image-preview-title">
					<div className="flex min-h-screen items-center justify-center p-4">
						<div
							className="fixed inset-0 bg-black bg-opacity-75 transition-opacity"
							onClick={closePreview}
						/>
						<div className="relative bg-white rounded-lg max-w-4xl w-full">
							<div className="p-4 border-b">
								<div className="flex items-center justify-between">
									<h3 id="image-preview-title" className="text-lg font-medium text-gray-900">
										Image Preview
									</h3>
									<button
										type="button"
										onClick={closePreview}
										className="text-gray-400 hover:text-gray-500"
										aria-label="Close preview"
									>
										<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
								<div className="bg-gray-100 rounded flex items-center justify-center max-h-96 overflow-auto">
									<img
										src={`/api/files/${previewImage.fileId}/preview`}
										alt={previewImage.caption || previewImage.filename}
										className="max-w-full max-h-96 object-contain"
									/>
								</div>
								{previewImage.caption && (
									<p className="mt-4 text-sm text-gray-700">{previewImage.caption}</p>
								)}
								<p className="mt-2 text-xs text-gray-500">{previewImage.filename}</p>
							</div>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
