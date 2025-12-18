/**
 * Tests for document text extraction utilities.
 * Tests verify text extraction using Cloudflare Workers AI toMarkdown.
 *
 * Note: Cloudflare AI is mocked to test the extraction logic in isolation.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock the cloudflare:workers module
const mockToMarkdown = vi.fn();
vi.mock("cloudflare:workers", () => ({
	env: {
		AI: {
			toMarkdown: mockToMarkdown,
		},
	},
}));

describe("Text Extraction", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.resetModules();
	});

	describe("isTextExtractable", () => {
		it("should return true for supported MIME types", async () => {
			const { isTextExtractable } = await import("../text-extraction");

			expect(isTextExtractable("text/plain")).toBe(true);
			expect(isTextExtractable("application/pdf")).toBe(true);
			expect(isTextExtractable("application/msword")).toBe(true);
			expect(
				isTextExtractable(
					"application/vnd.openxmlformats-officedocument.wordprocessingml.document",
				),
			).toBe(true);
			expect(isTextExtractable("text/csv")).toBe(true);
			expect(isTextExtractable("text/html")).toBe(true);
			expect(isTextExtractable("image/jpeg")).toBe(true);
			expect(isTextExtractable("image/png")).toBe(true);
		});

		it("should return false for unsupported MIME types", async () => {
			const { isTextExtractable } = await import("../text-extraction");

			expect(isTextExtractable("video/mp4")).toBe(false);
			expect(isTextExtractable("audio/mpeg")).toBe(false);
			expect(isTextExtractable("application/octet-stream")).toBe(false);
		});
	});

	describe("extractText", () => {
		it("should extract text from plain text buffer without calling AI", async () => {
			const { extractText } = await import("../text-extraction");

			const textContent = "This is a test document with some content.";
			const buffer = Buffer.from(textContent, "utf-8");

			const result = await extractText(buffer, "text/plain");

			expect(result).toBe(textContent);
			expect(mockToMarkdown).not.toHaveBeenCalled();
		});

		it("should handle UTF-8 encoded plain text correctly", async () => {
			const { extractText } = await import("../text-extraction");

			const textContent = "Hello World! Special chars: é café 日本語";
			const buffer = Buffer.from(textContent, "utf-8");

			const result = await extractText(buffer, "text/plain");

			expect(result).toBe(textContent);
		});

		it("should use Cloudflare AI toMarkdown for PDF files", async () => {
			mockToMarkdown.mockResolvedValue([
				{
					name: "test.pdf",
					data: "Extracted PDF content here.",
					format: "pdf",
					mimetype: "application/pdf",
					tokens: 100,
				},
			]);

			const { extractText } = await import("../text-extraction");

			const mockPdfBuffer = Buffer.from("fake pdf content");
			const result = await extractText(
				mockPdfBuffer,
				"application/pdf",
				"test.pdf",
			);

			expect(result).toBe("Extracted PDF content here.");
			expect(mockToMarkdown).toHaveBeenCalledWith([
				expect.objectContaining({ name: "test.pdf" }),
			]);
		});

		it("should use Cloudflare AI toMarkdown for Word documents", async () => {
			mockToMarkdown.mockResolvedValue([
				{
					name: "test.docx",
					data: "Word document content extracted.",
					format: "docx",
					mimetype:
						"application/vnd.openxmlformats-officedocument.wordprocessingml.document",
					tokens: 50,
				},
			]);

			const { extractText } = await import("../text-extraction");

			const mockDocxBuffer = Buffer.from("fake docx content");
			const result = await extractText(
				mockDocxBuffer,
				"application/vnd.openxmlformats-officedocument.wordprocessingml.document",
				"test.docx",
			);

			expect(result).toBe("Word document content extracted.");
		});

		it("should use Cloudflare AI toMarkdown for images", async () => {
			mockToMarkdown.mockResolvedValue([
				{
					name: "test.jpg",
					data: "Image description: A beautiful sunset over mountains.",
					format: "jpeg",
					mimetype: "image/jpeg",
					tokens: 20,
				},
			]);

			const { extractText } = await import("../text-extraction");

			const mockImageBuffer = Buffer.from("fake image data");
			const result = await extractText(
				mockImageBuffer,
				"image/jpeg",
				"test.jpg",
			);

			expect(result).toBe(
				"Image description: A beautiful sunset over mountains.",
			);
		});

		it("should handle AI extraction errors gracefully", async () => {
			mockToMarkdown.mockRejectedValue(new Error("AI processing failed"));

			const { extractText } = await import("../text-extraction");

			const mockBuffer = Buffer.from("fake content");
			const result = await extractText(mockBuffer, "application/pdf");

			expect(result).toBeNull();
		});

		it("should handle AI returning error in result", async () => {
			mockToMarkdown.mockResolvedValue([
				{
					name: "test.pdf",
					error: "Failed to process document",
				},
			]);

			const { extractText } = await import("../text-extraction");

			const mockBuffer = Buffer.from("fake content");
			const result = await extractText(mockBuffer, "application/pdf");

			expect(result).toBeNull();
		});

		it("should return null for unsupported MIME types", async () => {
			const { extractText } = await import("../text-extraction");

			const mockBuffer = Buffer.from("fake data");

			const result = await extractText(mockBuffer, "video/mp4");
			expect(result).toBeNull();
			expect(mockToMarkdown).not.toHaveBeenCalled();
		});
	});

	describe("truncateText", () => {
		it("should not truncate text under the limit", async () => {
			const { truncateText, MAX_EXTRACTED_TEXT_LENGTH } = await import(
				"../text-extraction"
			);

			const shortText = "This is a short text.";
			const result = truncateText(shortText, MAX_EXTRACTED_TEXT_LENGTH);

			expect(result.text).toBe(shortText);
			expect(result.wasTruncated).toBe(false);
		});

		it("should truncate text over the default limit", async () => {
			const { truncateText, MAX_EXTRACTED_TEXT_LENGTH } = await import(
				"../text-extraction"
			);

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

	describe("extractAndTruncateText", () => {
		it("should extract and truncate text from supported files", async () => {
			mockToMarkdown.mockResolvedValue([
				{
					name: "test.pdf",
					data: "Extracted content from PDF.",
					format: "pdf",
					mimetype: "application/pdf",
					tokens: 10,
				},
			]);

			const { extractAndTruncateText } = await import("../text-extraction");

			const mockBuffer = Buffer.from("fake pdf");
			const result = await extractAndTruncateText(
				mockBuffer,
				"application/pdf",
				"test.pdf",
			);

			expect(result).not.toBeNull();
			expect(result?.text).toBe("Extracted content from PDF.");
			expect(result?.wasTruncated).toBe(false);
		});

		it("should return null when extraction fails", async () => {
			mockToMarkdown.mockRejectedValue(new Error("Extraction failed"));

			const { extractAndTruncateText } = await import("../text-extraction");

			const mockBuffer = Buffer.from("fake content");
			const result = await extractAndTruncateText(
				mockBuffer,
				"application/pdf",
			);

			expect(result).toBeNull();
		});
	});
});
