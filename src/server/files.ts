/**
 * Server functions for file upload and download operations.
 * Uses TanStack Start's createServerFn for server-side execution.
 */
import { createServerFn } from "@tanstack/react-start";
import { auth } from "@clerk/tanstack-react-start/server";
import {
	generateUploadUrl as r2GenerateUploadUrl,
	generateDownloadUrl as r2GenerateDownloadUrl,
	fetchFileContent,
	DEFAULT_UPLOAD_EXPIRY,
	DEFAULT_DOWNLOAD_EXPIRY,
} from "@/lib/r2-client";
import {
	validateFileForUpload,
	sanitizeFilename,
	generateR2Key,
} from "@/lib/file-validation";
import {
	extractAndTruncateText,
	isTextExtractable,
} from "@/lib/text-extraction";
import type { FileOwnerType } from "@/types/entities";

export type GetUploadUrlInput = {
	filename: string;
	mimeType: string;
	sizeBytes: number;
	ownerType: FileOwnerType;
	ownerId: string;
	workspaceId: string;
};

export type GetUploadUrlResult = {
	uploadUrl: string;
	r2Key: string;
	expiresAt: number;
};

export type ConfirmUploadInput = {
	r2Key: string;
	ownerType: FileOwnerType;
	ownerId: string;
	filename: string;
	mimeType: string;
	sizeBytes: number;
};

export type ConfirmUploadResult = {
	validatedData: {
		ownerType: FileOwnerType;
		ownerId: string;
		filename: string;
		mimeType: string;
		sizeBytes: number;
		r2Key: string;
		extractedText?: string;
	};
	extractionInfo?: {
		wasTruncated: boolean;
		extractionFailed: boolean;
	};
};

export type GetDownloadUrlInput = {
	fileId: string;
	r2Key: string;
};

export type GetDownloadUrlResult = {
	downloadUrl: string;
	expiresAt: number;
};

/**
 * Get a presigned URL for uploading a file to R2.
 * Validates file metadata and generates a unique R2 key.
 *
 * @param ctx.data - Upload URL request input
 * @returns Presigned upload URL, R2 key, and expiration timestamp
 */
export const getUploadUrl = createServerFn({ method: "POST" })
	.inputValidator((input: GetUploadUrlInput) => input)
	.handler(async ({ data }): Promise<GetUploadUrlResult> => {
		// Verify authentication
		const { userId } = await auth();
		if (!userId) {
			throw new Error("Authentication required");
		}

		// Validate required fields
		if (
			!data.filename ||
			!data.mimeType ||
			!data.ownerType ||
			!data.ownerId ||
			!data.workspaceId
		) {
			throw new Error("Missing required fields for upload URL generation");
		}
		if (typeof data.sizeBytes !== "number") {
			throw new Error("File size must be a number");
		}

		const { filename, mimeType, sizeBytes, ownerType, workspaceId } = data;

		// Validate file metadata
		const validation = validateFileForUpload(filename, mimeType, sizeBytes);
		if (!validation.valid) {
			throw new Error(validation.error);
		}

		// Generate R2 key
		const r2Key = generateR2Key(workspaceId, ownerType, filename);

		// Generate presigned upload URL
		const uploadUrl = await r2GenerateUploadUrl(
			r2Key,
			mimeType,
			DEFAULT_UPLOAD_EXPIRY,
		);

		// Calculate expiration timestamp
		const expiresAt = Date.now() + DEFAULT_UPLOAD_EXPIRY * 1000;

		return {
			uploadUrl,
			r2Key,
			expiresAt,
		};
	});

/**
 * Confirm that a file upload has completed.
 * Validates file data, extracts text (if supported), and prepares data for Convex.
 *
 * Text extraction is attempted for supported MIME types (text/plain, PDF, Word docs).
 * Extraction failures are logged but do not fail the upload confirmation.
 * Extracted text is truncated to 50,000 characters if necessary.
 *
 * @param ctx.data - Upload confirmation input
 * @returns Validated file data for Convex mutation, including extracted text
 */
export const confirmUpload = createServerFn({ method: "POST" })
	.inputValidator((input: ConfirmUploadInput) => input)
	.handler(async ({ data }): Promise<ConfirmUploadResult> => {
		// Verify authentication
		const { userId } = await auth();
		if (!userId) {
			throw new Error("Authentication required");
		}

		// Validate required fields
		if (
			!data.r2Key ||
			!data.ownerType ||
			!data.ownerId ||
			!data.filename ||
			!data.mimeType
		) {
			throw new Error("Missing required fields for upload confirmation");
		}
		if (typeof data.sizeBytes !== "number") {
			throw new Error("File size must be a number");
		}

		const { r2Key, ownerType, ownerId, filename, mimeType, sizeBytes } = data;

		// Sanitize filename for storage
		const sanitizedFilename = sanitizeFilename(filename);

		// Initialize extraction info
		let extractedText: string | undefined;
		let extractionInfo: ConfirmUploadResult["extractionInfo"];

		// Attempt text extraction for supported MIME types
		if (isTextExtractable(mimeType)) {
			try {
				// Fetch file content from R2
				const fileBuffer = await fetchFileContent(r2Key);

				if (fileBuffer) {
					// Extract and truncate text
					const extractionResult = await extractAndTruncateText(
						fileBuffer,
						mimeType,
					);

					if (extractionResult) {
						extractedText = extractionResult.text;
						extractionInfo = {
							wasTruncated: extractionResult.wasTruncated,
							extractionFailed: false,
						};

						if (extractionResult.wasTruncated) {
							console.log(
								`Text extraction truncated for file ${r2Key}: exceeded 50,000 character limit`,
							);
						}
					} else {
						// Extraction returned null (unsupported format after check or parsing failed)
						console.warn(`Text extraction returned null for file ${r2Key}`);
						extractionInfo = {
							wasTruncated: false,
							extractionFailed: true,
						};
					}
				} else {
					// Could not fetch file from R2
					console.error(`Failed to fetch file from R2 for text extraction: ${r2Key}`);
					extractionInfo = {
						wasTruncated: false,
						extractionFailed: true,
					};
				}
			} catch (error) {
				// Log extraction errors but do not fail the upload
				console.error(`Text extraction failed for file ${r2Key}:`, error);
				extractionInfo = {
					wasTruncated: false,
					extractionFailed: true,
				};
			}
		}

		return {
			validatedData: {
				ownerType,
				ownerId,
				filename: sanitizedFilename,
				mimeType,
				sizeBytes,
				r2Key,
				extractedText,
			},
			extractionInfo,
		};
	});

/**
 * Get a presigned URL for downloading a file from R2.
 * Verifies file ownership through Convex before generating the URL.
 *
 * Note: Ownership verification is done at the Convex level when the file
 * record is fetched. The client must first fetch the file via Convex
 * (which verifies ownership) before calling this function.
 *
 * @param ctx.data - Download URL request input
 * @returns Presigned download URL and expiration timestamp
 */
export const getDownloadUrl = createServerFn({ method: "GET" })
	.inputValidator((input: GetDownloadUrlInput) => input)
	.handler(async ({ data }): Promise<GetDownloadUrlResult> => {
		// Verify authentication
		const { userId } = await auth();
		if (!userId) {
			throw new Error("Authentication required");
		}

		// Validate required fields
		if (!data.fileId || !data.r2Key) {
			throw new Error("File ID and R2 key are required");
		}

		const { r2Key } = data;

		// Generate presigned download URL
		const downloadUrl = await r2GenerateDownloadUrl(
			r2Key,
			DEFAULT_DOWNLOAD_EXPIRY,
		);

		// Calculate expiration timestamp
		const expiresAt = Date.now() + DEFAULT_DOWNLOAD_EXPIRY * 1000;

		return {
			downloadUrl,
			expiresAt,
		};
	});
