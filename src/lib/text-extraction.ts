/**
 * Document text extraction utilities.
 * Provides functions to extract text from various document formats including
 * plain text, PDF, and Word documents (doc/docx).
 */
import { PDFParse } from "pdf-parse";
import mammoth from "mammoth";

// Maximum length for extracted text (50,000 characters as per spec)
export const MAX_EXTRACTED_TEXT_LENGTH = 50000;

// MIME types that support text extraction
export const TEXT_EXTRACTABLE_MIME_TYPES = [
	"text/plain",
	"application/pdf",
	"application/msword",
	"application/vnd.openxmlformats-officedocument.wordprocessingml.document",
] as const;

export type TextExtractableMimeType = (typeof TEXT_EXTRACTABLE_MIME_TYPES)[number];

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
	return TEXT_EXTRACTABLE_MIME_TYPES.includes(mimeType as TextExtractableMimeType);
}

/**
 * Extracts text from a plain text file buffer.
 * @param buffer - The file buffer
 * @returns Extracted text content
 */
export async function extractTextFromPlainText(buffer: Buffer): Promise<string> {
	return buffer.toString("utf-8");
}

/**
 * Extracts text from a PDF file buffer using pdf-parse library.
 * @param buffer - The PDF file buffer
 * @returns Extracted text content or null if extraction fails
 */
export async function extractTextFromPdf(buffer: Buffer): Promise<string | null> {
	try {
		const parser = new PDFParse({ data: buffer });
		const result = await parser.getText();
		return result.text;
	} catch (error) {
		console.error("PDF text extraction failed:", error);
		return null;
	}
}

/**
 * Extracts text from a Word document buffer using mammoth library.
 * Supports both .doc and .docx formats.
 * @param buffer - The Word document buffer
 * @returns Extracted text content or null if extraction fails
 */
export async function extractTextFromWord(buffer: Buffer): Promise<string | null> {
	try {
		const result = await mammoth.extractRawText({ buffer });
		return result.value;
	} catch (error) {
		console.error("Word document text extraction failed:", error);
		return null;
	}
}

/**
 * Routes to the appropriate text extractor based on MIME type.
 * @param buffer - The file buffer
 * @param mimeType - The MIME type of the file
 * @returns Extracted text content or null if extraction fails or is not supported
 */
export async function extractText(
	buffer: Buffer,
	mimeType: string,
): Promise<string | null> {
	switch (mimeType) {
		case "text/plain":
			return await extractTextFromPlainText(buffer);

		case "application/pdf":
			return await extractTextFromPdf(buffer);

		case "application/msword":
		case "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
			return await extractTextFromWord(buffer);

		// Image types - no text extraction supported
		case "image/jpeg":
		case "image/png":
		case "image/gif":
		case "image/webp":
			return null;

		default:
			console.warn(`Text extraction not supported for MIME type: ${mimeType}`);
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
 * @param buffer - The file buffer
 * @param mimeType - The MIME type of the file
 * @returns Object with extracted text (truncated if necessary) and metadata, or null if extraction fails
 */
export async function extractAndTruncateText(
	buffer: Buffer,
	mimeType: string,
): Promise<{ text: string; wasTruncated: boolean } | null> {
	const extractedText = await extractText(buffer, mimeType);

	if (extractedText === null) {
		return null;
	}

	return truncateText(extractedText, MAX_EXTRACTED_TEXT_LENGTH);
}
