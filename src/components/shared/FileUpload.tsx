import { useState, useRef, type ChangeEvent, type DragEvent } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";

export interface FileUploadProps {
	onUploadComplete: (fileId: Id<"files">) => void;
	ownerType: "brandVoice" | "persona" | "knowledgeBaseItem" | "example";
	ownerId: string;
	multiple?: boolean;
	disabled?: boolean;
}

const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15MB in bytes

const ALLOWED_TYPES = [
	"text/plain",
	"application/pdf",
	"application/msword",
	"application/vnd.openxmlformats-officedocument.wordprocessingml.document",
	"image/jpeg",
	"image/png",
	"image/gif",
	"image/webp",
];

const ALLOWED_EXTENSIONS = [".txt", ".pdf", ".doc", ".docx", ".jpg", ".jpeg", ".png", ".gif", ".webp"];

/**
 * Reusable file upload component with drag-and-drop support.
 * Handles file validation, upload progress, and error states.
 */
export function FileUpload({
	onUploadComplete,
	ownerType,
	ownerId,
	multiple = false,
	disabled = false,
}: FileUploadProps) {
	const [isDragging, setIsDragging] = useState(false);
	const [uploadingFiles, setUploadingFiles] = useState<string[]>([]);
	const [error, setError] = useState<string | null>(null);
	const fileInputRef = useRef<HTMLInputElement>(null);

	const createFile = useMutation(api.files.createFile);

	const validateFile = (file: File): string | null => {
		// Check file size
		if (file.size > MAX_FILE_SIZE) {
			return `File "${file.name}" exceeds the 15MB size limit`;
		}

		// Check file type
		if (!ALLOWED_TYPES.includes(file.type)) {
			const extension = file.name.split(".").pop()?.toLowerCase();
			if (!extension || !ALLOWED_EXTENSIONS.includes(`.${extension}`)) {
				return `File "${file.name}" has an unsupported format. Allowed: PDF, Word, Text, Images (JPG, PNG, GIF, WEBP)`;
			}
		}

		return null;
	};

	const handleFiles = async (files: FileList | null) => {
		if (!files || files.length === 0) return;

		setError(null);

		const filesToUpload = Array.from(files);

		// Validate all files first
		for (const file of filesToUpload) {
			const validationError = validateFile(file);
			if (validationError) {
				setError(validationError);
				return;
			}
		}

		// Process uploads
		for (const file of filesToUpload) {
			try {
				setUploadingFiles((prev) => [...prev, file.name]);

				// In a real implementation, we would:
				// 1. Call server function to get presigned upload URL
				// 2. Upload file to R2 using presigned URL
				// 3. Call confirmUpload server function to create file record
				// 4. File record creation would trigger text extraction

				// For now, simulate the file creation with mock data
				// This will be replaced with actual server function calls
				const fileId = await createFile({
					ownerType,
					ownerId,
					filename: file.name,
					mimeType: file.type,
					sizeBytes: file.size,
					r2Key: `mock-key-${Date.now()}-${file.name}`,
				});

				onUploadComplete(fileId);
			} catch (err) {
				setError(err instanceof Error ? err.message : "Failed to upload file");
				console.error("File upload error:", err);
			} finally {
				setUploadingFiles((prev) => prev.filter((name) => name !== file.name));
			}
		}
	};

	const handleDragEnter = (e: DragEvent<HTMLDivElement>) => {
		e.preventDefault();
		e.stopPropagation();
		if (!disabled) {
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

		if (!disabled) {
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
		fileInputRef.current?.click();
	};

	return (
		<div className="space-y-2">
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
					multiple={multiple}
					disabled={disabled}
					accept={ALLOWED_EXTENSIONS.join(",")}
					aria-label="Upload files"
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

					<p className="text-xs text-gray-500">
						PDF, Word (.doc, .docx), Text, or Images (JPG, PNG, GIF, WEBP)
					</p>

					<p className="text-xs text-gray-500">Maximum file size: 15 MB</p>
				</div>
			</div>

			{uploadingFiles.length > 0 && (
				<div className="space-y-1">
					{uploadingFiles.map((filename) => (
						<div key={filename} className="flex items-center gap-2 text-sm text-gray-600">
							<div className="animate-spin rounded-full h-4 w-4 border-b-2 border-cyan-600" />
							<span>Uploading {filename}...</span>
						</div>
					))}
				</div>
			)}

			{error && (
				<div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded p-3">
					{error}
				</div>
			)}
		</div>
	);
}
