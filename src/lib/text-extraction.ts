/**
 * Document text extraction utilities using Cloudflare Workers AI.
 * Uses env.AI.toMarkdown() to convert documents to markdown format.
 * Supports PDF, Office documents, HTML, XML, CSV, and images.
 */
import { env } from "cloudflare:workers";

// Maximum length for extracted text (50,000 characters as per spec)
export const MAX_EXTRACTED_TEXT_LENGTH = 50000;

// MIME types that support text extraction via Cloudflare AI toMarkdown
export const TEXT_EXTRACTABLE_MIME_TYPES = [
	// Documents
	"text/plain",
	"application/pdf",
	"application/msword",
	"application/vnd.openxmlformats-officedocument.wordprocessingml.document",
	// Spreadsheets
	"application/vnd.ms-excel",
	"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
	"application/vnd.oasis.opendocument.spreadsheet",
	"text/csv",
	"application/vnd.apple.numbers",
	// Other formats
	"text/html",
	"application/xml",
	"text/xml",
	"application/vnd.oasis.opendocument.text",
	// Images (AI can extract text/describe)
	"image/jpeg",
	"image/png",
	"image/webp",
	"image/svg+xml",
] as const;

export type TextExtractableMimeType =
	(typeof TEXT_EXTRACTABLE_MIME_TYPES)[number];

export type TruncateResult = {
	text: string;
	wasTruncated: boolean;
};

/**
 * Checks if a MIME type supports text extraction.
 * @param mimeType - The MIME type to check
 * @returns True if text can be extracted from this file type
 */
export function isTextExtractable(mimeType: string): boolean {
	return TEXT_EXTRACTABLE_MIME_TYPES.includes(
		mimeType as TextExtractableMimeType,
	);
}

/**
 * Extracts text/markdown from a file using Cloudflare Workers AI.
 * Uses env.AI.toMarkdown() which supports PDF, Office docs, HTML, XML, CSV, and images.
 *
 * @param buffer - The file buffer (ArrayBuffer or Buffer)
 * @param mimeType - The MIME type of the file
 * @param filename - The filename (used for identification in the API)
 * @returns Extracted markdown content or null if extraction fails
 */
export async function extractText(
	buffer: ArrayBuffer | Buffer,
	mimeType: string,
	filename = "document",
): Promise<string | null> {
	// Plain text doesn't need AI conversion
	if (mimeType === "text/plain") {
		const textBuffer =
			buffer instanceof Buffer ? buffer : Buffer.from(new Uint8Array(buffer));
		return textBuffer.toString("utf-8");
	}

	// Check if type is supported
	if (!isTextExtractable(mimeType)) {
		console.warn(`Text extraction not supported for MIME type: ${mimeType}`);
		return null;
	}

	try {
		// Convert Buffer/ArrayBuffer to Uint8Array for Blob compatibility
		const uint8Array =
			buffer instanceof Buffer
				? new Uint8Array(buffer)
				: new Uint8Array(buffer);
		const blob = new Blob([uint8Array], { type: mimeType });

		// Use Cloudflare AI toMarkdown
		const results = await env.AI.toMarkdown([{ name: filename, blob }]);

		if (results && results.length > 0) {
			const result = results[0];
			// Check format to determine if it's a success or error response
			if (result.format === "markdown" && "data" in result) {
				return result.data;
			}
			if (result.format === "error" && "error" in result) {
				console.error(
					`Cloudflare AI toMarkdown error for ${filename}:`,
					result.error,
				);
				return null;
			}
		}

		return null;
	} catch (error) {
		console.error("Cloudflare AI toMarkdown extraction failed:", error);
		return null;
	}
}

/**
 * Truncates text to a maximum length.
 * @param text - The text to truncate
 * @param maxLength - Maximum length (default: 50,000 characters)
 * @returns Object containing truncated text and whether truncation occurred
 */
export function truncateText(
	text: string,
	maxLength: number = MAX_EXTRACTED_TEXT_LENGTH,
): TruncateResult {
	if (text.length <= maxLength) {
		return {
			text,
			wasTruncated: false,
		};
	}

	return {
		text: text.slice(0, maxLength),
		wasTruncated: true,
	};
}

/**
 * Extracts and truncates text from a file buffer.
 * This is the main entry point for text extraction in the upload flow.
 * @param buffer - The file buffer (ArrayBuffer or Buffer)
 * @param mimeType - The MIME type of the file
 * @param filename - The filename (optional, used for API identification)
 * @returns Object with extracted text (truncated if necessary) and metadata, or null if extraction fails
 */
export async function extractAndTruncateText(
	buffer: ArrayBuffer | Buffer,
	mimeType: string,
	filename?: string,
): Promise<{ text: string; wasTruncated: boolean } | null> {
	const extractedText = await extractText(buffer, mimeType, filename);
	console.debug("[Text extraction] Extracted text:", extractedText);

	if (extractedText === null) {
		return null;
	}

	return truncateText(extractedText, MAX_EXTRACTED_TEXT_LENGTH);
}
