// @ts-nocheck
/**
 * Server functions for file upload and download operations.
 * Uses TanStack Start's createServerFn for server-side execution.
 */
import { createServerFn } from "@tanstack/react-start";
import { auth } from "@clerk/tanstack-react-start/server";
import {
	uploadFile,
	downloadFile,
	fetchFileContent,
} from "@/lib/r2-client";
import {
	validateFileForUpload,
	sanitizeFilename,
	generateR2Key,
} from "@/lib/file-validation";
import { env } from 'cloudflare:workers';
import {
	extractAndTruncateText,
	isTextExtractable,
} from "@/lib/text-extraction";
import { createThumbnail } from "@/lib/image-processing";
import type { FileOwnerType } from "@/types/entities";

export type UploadFileInput = {
	filename: string;
	mimeType: string;
	sizeBytes: number;
	ownerType: FileOwnerType;
	ownerId: string;
	workspaceId: string;
	fileContent: ArrayBuffer;
};

export type UploadFileResult = {
	r2Key: string;
	validatedData: {
		ownerType: FileOwnerType;
		ownerId: string;
		filename: string;
		mimeType: string;
		sizeBytes: number;
		r2Key: string;
		thumbnailR2Key?: string;
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
	content: ArrayBuffer;
	contentType: string | undefined;
};

function getThumbnailKey(originalKey: string): string {
	const lastDotIndex = originalKey.lastIndexOf(".");
	if (lastDotIndex === -1) return `${originalKey}_thumb.jpg`;
	return `${originalKey.substring(0, lastDotIndex)}_thumb.jpg`;
}

/**
 * Upload a file directly to R2 storage.
 * Validates file metadata, uploads to R2, extracts text (if supported),
 * and returns validated data for Convex mutation.
 *
 * Text extraction is attempted for supported MIME types (text/plain, PDF, Word docs).
 * Extraction failures are logged but do not fail the upload.
 * Extracted text is truncated to 50,000 characters if necessary.
 *
 * @param ctx.data - Upload file input with file content
 * @returns R2 key and validated file data for Convex mutation, including extracted text
 */
export const uploadFileFn = createServerFn({ method: "POST" })
	.inputValidator((input: UploadFileInput) => input)
	.handler(async ({ data }): Promise<UploadFileResult> => {
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
			!data.workspaceId ||
			!data.fileContent
		) {
			throw new Error("Missing required fields for file upload");
		}
		if (typeof data.sizeBytes !== "number") {
			throw new Error("File size must be a number");
		}

		const { filename, mimeType, sizeBytes, ownerType, ownerId, workspaceId, fileContent } = data;

		// Validate file metadata
		const validation = validateFileForUpload(filename, mimeType, sizeBytes);
		if (!validation.valid) {
			throw new Error(validation.error);
		}

		// Sanitize filename for storage
		const sanitizedFilename = sanitizeFilename(filename);

		// Generate R2 key
		const r2Key = generateR2Key(workspaceId, ownerType, sanitizedFilename);

		// Get R2 bucket from Cloudflare Workers environment
		const bucket = env.R2_BUCKET;

		// Upload file to R2
		await uploadFile(bucket, r2Key, fileContent, mimeType);

		// Initialize extraction info
		let extractedText: string | undefined;
		let extractionInfo: UploadFileResult["extractionInfo"];
		let thumbnailR2Key: string | undefined;

		// Attempt thumbnail generation for images (parallel to text extraction logic)
		if (mimeType.startsWith("image/")) {
			try {
				const thumbnailBuffer = await createThumbnail(fileContent, mimeType);
				if (thumbnailBuffer) {
					thumbnailR2Key = getThumbnailKey(r2Key);
					await uploadFile(bucket, thumbnailR2Key, thumbnailBuffer, "image/jpeg");
				}
			} catch (error) {
				// Log thumbnail errors but do not fail the upload
				console.error(`Thumbnail generation failed for file ${r2Key}:`, error);
			}
		}

		// Attempt text extraction for supported MIME types
		if (isTextExtractable(mimeType)) {
			try {
				// Fetch file content from R2
				const fileBuffer = await fetchFileContent(bucket, r2Key);

				if (fileBuffer) {
					// Extract and truncate text using Cloudflare AI toMarkdown
					const extractionResult = await extractAndTruncateText(
						fileBuffer,
						mimeType,
						sanitizedFilename,
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
			r2Key,
			validatedData: {
				ownerType,
				ownerId,
				filename: sanitizedFilename,
				mimeType,
				sizeBytes,
				r2Key,
				thumbnailR2Key,
				extractedText,
			},
			extractionInfo,
		};
	});

/**
 * Download a file directly from R2 storage.
 * Verifies file ownership through Convex before downloading.
 *
 * Note: Ownership verification is done at the Convex level when the file
 * record is fetched. The client must first fetch the file via Convex
 * (which verifies ownership) before calling this function.
 *
 * @param ctx.data - Download file input with R2 key
 * @returns File content as ArrayBuffer and content type
 */
export const downloadFileFn = createServerFn({ method: "GET" })
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

		// Get R2 bucket from Cloudflare Workers environment
		const bucket = env.R2_BUCKET;

		// Download file from R2
		const object = await downloadFile(bucket, r2Key);

		if (!object) {
			throw new Error("File not found");
		}

		// Convert to ArrayBuffer for client
		const content = await object.arrayBuffer();

		return {
			content,
			contentType: object.httpMetadata?.contentType,
		};
	});
