/**
 * Image Uploader Component
 *
 * Extends FileUpload functionality for content piece image uploads.
 * Provides preview before attach, progress indicator, and handles
 * both direct uploads and AI-generated image attachments.
 */

import { useState, useRef, type ChangeEvent, type DragEvent } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { uploadFileFn } from "@/server/files";

export interface ImageUploaderProps {
	contentPieceId: Id<"contentPieces">;
	workspaceId: Id<"workspaces">;
	onUploadComplete: (imageId: Id<"contentImages">) => void;
	disabled?: boolean;
}

const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15MB in bytes

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];

const ALLOWED_IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".gif", ".webp"];

interface PreviewFile {
	file: File;
	previewUrl: string;
	caption: string;
}

/**
 * Image uploader with preview and caption before attaching to content piece
 */
export function ImageUploader({
	contentPieceId,
	workspaceId,
	onUploadComplete,
	disabled = false,
}: ImageUploaderProps) {
	const [isDragging, setIsDragging] = useState(false);
	const [previewFile, setPreviewFile] = useState<PreviewFile | null>(null);
	const [isUploading, setIsUploading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const fileInputRef = useRef<HTMLInputElement>(null);

	const createFile = useMutation(api.files.createFile);
	const attachImage = useMutation(api.contentImages.attachImage);

	const validateFile = (file: File): string | null => {
		// Check file size
		if (file.size > MAX_FILE_SIZE) {
			return `File "${file.name}" exceeds the 15MB size limit`;
		}

		// Check if it's an image
		if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
			const extension = file.name.split(".").pop()?.toLowerCase();
			if (!extension || !ALLOWED_IMAGE_EXTENSIONS.includes(`.${extension}`)) {
				return `File "${file.name}" is not a supported image format. Allowed: JPG, PNG, GIF, WEBP`;
			}
		}

		return null;
	};

	const handleFileSelection = (file: File) => {
		setError(null);

		// Validate file
		const validationError = validateFile(file);
		if (validationError) {
			setError(validationError);
			return;
		}

		// Create preview URL
		const previewUrl = URL.createObjectURL(file);

		setPreviewFile({
			file,
			previewUrl,
			caption: "",
		});
	};

	const handleFiles = (files: FileList | null) => {
		if (!files || files.length === 0) return;

		// Only handle first file for images
		handleFileSelection(files[0]);
	};

	const cancelPreview = () => {
		if (previewFile) {
			URL.revokeObjectURL(previewFile.previewUrl);
		}
		setPreviewFile(null);
		setError(null);
	};

	const uploadAndAttach = async () => {
		if (!previewFile) return;

		setError(null);
		setIsUploading(true);

		try {
			// Convert file to ArrayBuffer for upload
			const fileContent = await previewFile.file.arrayBuffer();

			// Upload file directly to R2 via server function
			const uploadResult = await uploadFileFn({
				data: {
					filename: previewFile.file.name,
					mimeType: previewFile.file.type,
					sizeBytes: previewFile.file.size,
					ownerType: "contentPiece",
					ownerId: contentPieceId,
					workspaceId,
					fileContent,
				},
			});

			// Create file record in Convex
			const fileId = await createFile({
				...uploadResult.validatedData,
			});

			// Attach image to content piece
			const result = await attachImage({
				contentPieceId,
				fileId,
				caption: previewFile.caption.trim() || undefined,
			});

			// Clean up preview
			URL.revokeObjectURL(previewFile.previewUrl);
			setPreviewFile(null);

			// Notify parent
			onUploadComplete(result.contentImageId);
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to upload image");
			console.error("Image upload error:", err);
		} finally {
			setIsUploading(false);
		}
	};

	const handleDragEnter = (e: DragEvent<HTMLDivElement>) => {
		e.preventDefault();
		e.stopPropagation();
		if (!disabled && !previewFile) {
			setIsDragging(true);
		}
	};

	const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
		e.preventDefault();
		e.stopPropagation();
		setIsDragging(false);
	};

	const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
		e.preventDefault();
		e.stopPropagation();
	};

	const handleDrop = (e: DragEvent<HTMLDivElement>) => {
		e.preventDefault();
		e.stopPropagation();
		setIsDragging(false);

		if (!disabled && !previewFile) {
			handleFiles(e.dataTransfer.files);
		}
	};

	const handleFileInputChange = (e: ChangeEvent<HTMLInputElement>) => {
		handleFiles(e.target.files);
		// Reset input so same file can be uploaded again
		if (fileInputRef.current) {
			fileInputRef.current.value = "";
		}
	};

	const handleClick = () => {
		if (!previewFile) {
			fileInputRef.current?.click();
		}
	};

	return (
		<div className="space-y-4">
			{/* Upload Zone or Preview */}
			{!previewFile ? (
				<div
					onDragEnter={handleDragEnter}
					onDragLeave={handleDragLeave}
					onDragOver={handleDragOver}
					onDrop={handleDrop}
					onClick={handleClick}
					className={`
						border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors
						${disabled ? "bg-gray-100 cursor-not-allowed opacity-60" : "hover:border-cyan-500 hover:bg-cyan-50"}
						${isDragging ? "border-cyan-500 bg-cyan-50" : "border-gray-300"}
						${error ? "border-red-300 bg-red-50" : ""}
					`}
				>
					<input
						ref={fileInputRef}
						type="file"
						className="hidden"
						onChange={handleFileInputChange}
						disabled={disabled}
						accept={ALLOWED_IMAGE_EXTENSIONS.join(",")}
						aria-label="Upload image"
					/>

					<div className="space-y-2">
						<svg
							className="mx-auto h-12 w-12 text-gray-400"
							stroke="currentColor"
							fill="none"
							viewBox="0 0 48 48"
							aria-hidden="true"
						>
							<path
								d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
								strokeWidth={2}
								strokeLinecap="round"
								strokeLinejoin="round"
							/>
						</svg>

						<div className="text-sm text-gray-600">
							<span className="font-medium text-cyan-600">Click to upload</span> or drag and drop
						</div>

						<p className="text-xs text-gray-500">JPG, PNG, GIF, or WEBP</p>

						<p className="text-xs text-gray-500">Maximum file size: 15 MB</p>
					</div>
				</div>
			) : (
				<div className="border rounded-lg p-4 bg-white">
					<h4 className="font-medium text-gray-900 mb-3">Preview</h4>

					{/* Image Preview */}
					<div className="bg-gray-100 rounded flex items-center justify-center mb-4 max-h-64 overflow-hidden">
						<img
							src={previewFile.previewUrl}
							alt="Upload preview"
							className="max-w-full max-h-64 object-contain"
						/>
					</div>

					{/* Caption Input */}
					<div className="mb-4">
						<label htmlFor="image-caption" className="block text-sm font-medium text-gray-700 mb-1">
							Caption (optional)
						</label>
						<input
							id="image-caption"
							type="text"
							value={previewFile.caption}
							onChange={(e) =>
								setPreviewFile({
									...previewFile,
									caption: e.target.value,
								})
							}
							className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
							placeholder="Add a caption for this image..."
							maxLength={500}
							disabled={isUploading}
						/>
						<p className="mt-1 text-xs text-gray-500">
							{previewFile.caption.length}/500 characters
						</p>
					</div>

					{/* File Info */}
					<div className="mb-4 text-xs text-gray-500">
						<p>File: {previewFile.file.name}</p>
						<p>Size: {(previewFile.file.size / 1024 / 1024).toFixed(2)} MB</p>
					</div>

					{/* Action Buttons */}
					<div className="flex gap-3">
						<button
							type="button"
							onClick={uploadAndAttach}
							disabled={isUploading}
							className="flex-1 bg-cyan-600 text-white px-4 py-2 rounded-md hover:bg-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium text-sm"
						>
							{isUploading ? (
								<span className="flex items-center justify-center gap-2">
									<span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
									Uploading...
								</span>
							) : (
								"Attach Image"
							)}
						</button>
						<button
							type="button"
							onClick={cancelPreview}
							disabled={isUploading}
							className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400 disabled:opacity-50 disabled:cursor-not-allowed font-medium text-sm"
						>
							Cancel
						</button>
					</div>
				</div>
			)}

			{/* Error Message */}
			{error && (
				<div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded p-3">
					{error}
				</div>
			)}
		</div>
	);
}
