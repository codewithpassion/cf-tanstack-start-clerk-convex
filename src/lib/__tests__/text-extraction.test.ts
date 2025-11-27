/**
 * Tests for document text extraction utilities.
 * Tests verify plain text, PDF, and Word document extraction with proper error handling.
 *
 * Note: External libraries (pdf-parse, mammoth) are mocked to test the extraction logic
 * in isolation without requiring actual document files.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock pdf-parse module (v2 API uses PDFParse class)
vi.mock("pdf-parse", () => {
	const mockGetText = vi.fn();
	const MockPDFParse = vi.fn().mockImplementation(() => ({
		getText: mockGetText,
	}));
	return {
		PDFParse: MockPDFParse,
		__mockGetText: mockGetText,
	};
});

// Mock mammoth module
vi.mock("mammoth", () => ({
	default: {
		extractRawText: vi.fn(),
	},
}));

describe("Text Extraction", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.resetModules();
	});

	describe("extractTextFromPlainText", () => {
		it("should extract text from plain text buffer", async () => {
			const { extractTextFromPlainText } = await import("../text-extraction");

			const textContent = "This is a test document with some content.";
			const buffer = Buffer.from(textContent, "utf-8");

			const result = await extractTextFromPlainText(buffer);
			expect(result).toBe(textContent);
		});

		it("should handle UTF-8 encoded text correctly", async () => {
			const { extractTextFromPlainText } = await import("../text-extraction");

			const textContent = "Hello World! Special chars: e cafe";
			const buffer = Buffer.from(textContent, "utf-8");

			const result = await extractTextFromPlainText(buffer);
			expect(result).toBe(textContent);
		});
	});

	describe("extractTextFromPdf", () => {
		it("should extract text from PDF buffer using pdf-parse", async () => {
			const pdfParseModule = await import("pdf-parse");
			const mockGetText = (pdfParseModule as unknown as { __mockGetText: ReturnType<typeof vi.fn> }).__mockGetText;
			mockGetText.mockResolvedValue({
				text: "Extracted PDF content here.",
			});

			const { extractTextFromPdf } = await import("../text-extraction");

			const mockPdfBuffer = Buffer.from("fake pdf content");
			const result = await extractTextFromPdf(mockPdfBuffer);

			expect(result).toBe("Extracted PDF content here.");
			expect(pdfParseModule.PDFParse).toHaveBeenCalledWith({ data: mockPdfBuffer });
		});

		it("should handle PDF extraction errors gracefully", async () => {
			const pdfParseModule = await import("pdf-parse");
			const mockGetText = (pdfParseModule as unknown as { __mockGetText: ReturnType<typeof vi.fn> }).__mockGetText;
			mockGetText.mockRejectedValue(new Error("PDF parsing failed"));

			const { extractTextFromPdf } = await import("../text-extraction");

			const mockPdfBuffer = Buffer.from("invalid pdf content");
			const result = await extractTextFromPdf(mockPdfBuffer);

			expect(result).toBeNull();
		});
	});

	describe("extractTextFromWord", () => {
		it("should extract text from Word document using mammoth", async () => {
			const mammoth = (await import("mammoth")).default;
			vi.mocked(mammoth.extractRawText).mockResolvedValue({
				value: "Word document content extracted.",
				messages: [],
			});

			const { extractTextFromWord } = await import("../text-extraction");

			const mockDocxBuffer = Buffer.from("fake docx content");
			const result = await extractTextFromWord(mockDocxBuffer);

			expect(result).toBe("Word document content extracted.");
			expect(mammoth.extractRawText).toHaveBeenCalledWith({ buffer: mockDocxBuffer });
		});

		it("should handle Word extraction errors gracefully", async () => {
			const mammoth = (await import("mammoth")).default;
			vi.mocked(mammoth.extractRawText).mockRejectedValue(new Error("Word parsing failed"));

			const { extractTextFromWord } = await import("../text-extraction");

			const mockDocxBuffer = Buffer.from("invalid docx content");
			const result = await extractTextFromWord(mockDocxBuffer);

			expect(result).toBeNull();
		});
	});

	describe("extractText", () => {
		it("should route to correct extractor based on MIME type", async () => {
			// Setup mocks
			const pdfParseModule = await import("pdf-parse");
			const mockGetText = (pdfParseModule as unknown as { __mockGetText: ReturnType<typeof vi.fn> }).__mockGetText;
			mockGetText.mockResolvedValue({
				text: "PDF content",
			});

			const mammoth = (await import("mammoth")).default;
			vi.mocked(mammoth.extractRawText).mockResolvedValue({
				value: "Word content",
				messages: [],
			});

			const { extractText } = await import("../text-extraction");

			const mockBuffer = Buffer.from("test content");

			// Test plain text
			const textResult = await extractText(mockBuffer, "text/plain");
			expect(textResult).toBe("test content");

			// Test PDF
			const pdfResult = await extractText(mockBuffer, "application/pdf");
			expect(pdfResult).toBe("PDF content");

			// Test Word DOCX
			const docxResult = await extractText(
				mockBuffer,
				"application/vnd.openxmlformats-officedocument.wordprocessingml.document",
			);
			expect(docxResult).toBe("Word content");

			// Test Word DOC
			const docResult = await extractText(mockBuffer, "application/msword");
			expect(docResult).toBe("Word content");
		});

		it("should return null for unsupported MIME types (images)", async () => {
			const { extractText } = await import("../text-extraction");

			const mockBuffer = Buffer.from("fake image data");

			const jpegResult = await extractText(mockBuffer, "image/jpeg");
			expect(jpegResult).toBeNull();

			const pngResult = await extractText(mockBuffer, "image/png");
			expect(pngResult).toBeNull();

			const gifResult = await extractText(mockBuffer, "image/gif");
			expect(gifResult).toBeNull();

			const webpResult = await extractText(mockBuffer, "image/webp");
			expect(webpResult).toBeNull();
		});
	});

	describe("truncateText", () => {
		it("should not truncate text under the limit", async () => {
			const { truncateText, MAX_EXTRACTED_TEXT_LENGTH } = await import("../text-extraction");

			const shortText = "This is a short text.";
			const result = truncateText(shortText, MAX_EXTRACTED_TEXT_LENGTH);

			expect(result.text).toBe(shortText);
			expect(result.wasTruncated).toBe(false);
		});

		it("should truncate text over the default limit", async () => {
			const { truncateText, MAX_EXTRACTED_TEXT_LENGTH } = await import("../text-extraction");

			const longText = "a".repeat(MAX_EXTRACTED_TEXT_LENGTH + 1000);
			const result = truncateText(longText, MAX_EXTRACTED_TEXT_LENGTH);

			expect(result.text.length).toBe(MAX_EXTRACTED_TEXT_LENGTH);
			expect(result.wasTruncated).toBe(true);
		});

		it("should truncate text at custom limit", async () => {
			const { truncateText } = await import("../text-extraction");

			const text = "This is a test sentence that should be truncated.";
			const result = truncateText(text, 20);

			expect(result.text.length).toBe(20);
			expect(result.text).toBe("This is a test sente");
			expect(result.wasTruncated).toBe(true);
		});
	});
});
