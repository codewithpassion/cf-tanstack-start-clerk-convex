/**
 * File validation utilities for upload operations.
 * Provides validation for file size, MIME type, and filename sanitization.
 */

// Allowed MIME types for file uploads
export const ALLOWED_MIME_TYPES = [
	"text/plain",
	"application/pdf",
	"application/msword",
	"application/vnd.openxmlformats-officedocument.wordprocessingml.document",
	"image/jpeg",
	"image/png",
	"image/gif",
	"image/webp",
] as const;

export type AllowedMimeType = (typeof ALLOWED_MIME_TYPES)[number];

// Maximum file size: 15MB in bytes
export const MAX_FILE_SIZE_BYTES = 15728640;

// Maximum filename length
export const MAX_FILENAME_LENGTH = 255;

export type ValidationResult = {
	valid: boolean;
	error?: string;
};

/**
 * Validates file size against the maximum allowed limit.
 * @param bytes - File size in bytes
 * @returns Validation result with error message if invalid
 */
export function validateFileSize(bytes: number): ValidationResult {
	if (bytes <= 0) {
		return {
			valid: false,
			error: "File cannot be empty or have negative size",
		};
	}

	if (bytes > MAX_FILE_SIZE_BYTES) {
		const maxSizeMB = MAX_FILE_SIZE_BYTES / (1024 * 1024);
		return {
			valid: false,
			error: `File size exceeds maximum allowed limit of ${maxSizeMB}MB`,
		};
	}

	return { valid: true };
}

/**
 * Validates that the MIME type is in the allowed list.
 * @param mimeType - The MIME type to validate
 * @returns Validation result with error message if invalid
 */
export function validateMimeType(mimeType: string): ValidationResult {
	if (!mimeType) {
		return {
			valid: false,
			error: "MIME type is required",
		};
	}

	const isAllowed = ALLOWED_MIME_TYPES.includes(mimeType as AllowedMimeType);

	if (!isAllowed) {
		return {
			valid: false,
			error: `File type "${mimeType}" is not allowed. Allowed types: ${ALLOWED_MIME_TYPES.join(", ")}`,
		};
	}

	return { valid: true };
}

/**
 * Sanitizes a filename by removing unsafe characters and ensuring proper length.
 * @param filename - The original filename
 * @returns Sanitized filename safe for storage
 */
export function sanitizeFilename(filename: string): string {
	if (!filename) {
		return "unnamed_file";
	}

	// Extract extension if present (handle edge case where filename starts with dot)
	const lastDotIndex = filename.lastIndexOf(".");
	let baseName: string;
	let extension: string;

	if (lastDotIndex > 0) {
		// Normal case: "file.pdf"
		baseName = filename.slice(0, lastDotIndex);
		extension = filename.slice(lastDotIndex);
	} else if (lastDotIndex === 0) {
		// Edge case: ".pdf" (filename is just an extension)
		baseName = "";
		extension = filename;
	} else {
		// No extension: "filename"
		baseName = filename;
		extension = "";
	}

	// Remove unsafe characters: < > : " / \ | ? *
	baseName = baseName.replace(/[<>:"/\\|?*]/g, "");

	// Replace multiple spaces with single underscore
	baseName = baseName.replace(/\s+/g, "_");

	// Remove multiple consecutive dots
	baseName = baseName.replace(/\.+/g, ".");

	// Remove leading/trailing dots and spaces
	baseName = baseName.replace(/^[.\s]+|[.\s]+$/g, "");

	// Handle empty basename after sanitization
	if (!baseName) {
		baseName = "unnamed_file";
	}

	// Combine basename and extension
	let sanitized = baseName + extension;

	// Truncate if too long, preserving extension
	if (sanitized.length > MAX_FILENAME_LENGTH) {
		const maxBaseLength = MAX_FILENAME_LENGTH - extension.length;
		sanitized = baseName.slice(0, maxBaseLength) + extension;
	}

	return sanitized;
}

/**
 * Validates all file metadata for upload.
 * @param filename - The filename
 * @param mimeType - The MIME type
 * @param sizeBytes - The file size in bytes
 * @returns Combined validation result
 */
export function validateFileForUpload(
	filename: string,
	mimeType: string,
	sizeBytes: number,
): ValidationResult {
	const sizeResult = validateFileSize(sizeBytes);
	if (!sizeResult.valid) {
		return sizeResult;
	}

	const mimeResult = validateMimeType(mimeType);
	if (!mimeResult.valid) {
		return mimeResult;
	}

	if (!filename || filename.trim().length === 0) {
		return {
			valid: false,
			error: "Filename is required",
		};
	}

	return { valid: true };
}

/**
 * Generates a unique R2 key for file storage.
 * Format: {workspaceId}/{ownerType}/{timestamp}-{sanitizedFilename}
 */
export function generateR2Key(
	workspaceId: string,
	ownerType: string,
	filename: string,
): string {
	const sanitized = sanitizeFilename(filename);
	const timestamp = Date.now();
	const folderMap: Record<string, string> = {
		brandVoice: "brand-voices",
		persona: "personas",
		knowledgeBaseItem: "knowledge-base",
		example: "examples",
	};

	const folder = folderMap[ownerType] || "misc";
	return `${workspaceId}/${folder}/${timestamp}-${sanitized}`;
}
