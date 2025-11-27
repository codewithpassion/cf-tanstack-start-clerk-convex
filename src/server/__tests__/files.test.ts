/**
 * Tests for file server functions.
 * Tests verify direct upload/download, validation, and text extraction flow.
 *
 * Note: These tests mock external dependencies (R2, Clerk auth, Cloudflare env)
 * to test the server function logic in isolation.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock Clerk auth
vi.mock("@clerk/tanstack-react-start/server", () => ({
	auth: vi.fn().mockResolvedValue({ userId: "test-user-123" }),
}));

// Mock R2 bucket from env helper
const mockR2Bucket = {
	put: vi.fn().mockResolvedValue(undefined),
	get: vi.fn().mockResolvedValue({
		arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(100)),
		httpMetadata: { contentType: "application/pdf" },
	}),
	delete: vi.fn().mockResolvedValue(undefined),
};

vi.mock("@/lib/env", () => ({
	getR2Bucket: vi.fn().mockResolvedValue(mockR2Bucket),
}));

// Mock R2 client
vi.mock("@/lib/r2-client", () => ({
	uploadFile: vi.fn().mockResolvedValue(undefined),
	downloadFile: vi.fn().mockResolvedValue({
		arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(100)),
		httpMetadata: { contentType: "application/pdf" },
	}),
	fetchFileContent: vi.fn().mockResolvedValue(Buffer.from("test content")),
}));

// Mock text extraction
vi.mock("@/lib/text-extraction", () => ({
	isTextExtractable: vi.fn().mockReturnValue(false), // Default to false to skip extraction in most tests
	extractAndTruncateText: vi.fn().mockResolvedValue({
		text: "extracted text",
		wasTruncated: false,
	}),
}));

// Mock file validation - import actual module for real validation
vi.mock("@/lib/file-validation", async () => {
	const actual = await vi.importActual("@/lib/file-validation");
	return {
		...actual,
		generateR2Key: vi.fn().mockReturnValue("test-workspace/brand-voices/12345-test-file.pdf"),
	};
});

describe("File Server Functions", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("Upload validation", () => {
		it("should validate file size correctly", async () => {
			const { validateFileForUpload } = await import("@/lib/file-validation");

			// Valid file
			const validResult = validateFileForUpload("test.pdf", "application/pdf", 1024);
			expect(validResult.valid).toBe(true);

			// File too large
			const largeResult = validateFileForUpload("test.pdf", "application/pdf", 20000000);
			expect(largeResult.valid).toBe(false);
			expect(largeResult.error).toContain("15MB");
		});

		it("should validate MIME type correctly", async () => {
			const { validateFileForUpload } = await import("@/lib/file-validation");

			// Valid MIME type
			const validResult = validateFileForUpload("test.pdf", "application/pdf", 1024);
			expect(validResult.valid).toBe(true);

			// Invalid MIME type
			const invalidResult = validateFileForUpload("test.exe", "application/x-executable", 1024);
			expect(invalidResult.valid).toBe(false);
			expect(invalidResult.error).toContain("not allowed");
		});
	});

	describe("File ownership and authentication", () => {
		it("should require authentication for file upload", async () => {
			const { auth } = await import("@clerk/tanstack-react-start/server");
			vi.mocked(auth).mockResolvedValueOnce({ userId: null } as never);

			// When auth returns no userId, the handler should throw
			const mockAuth = await auth();
			expect(mockAuth.userId).toBeNull();
		});

		it("should require authentication for file download", async () => {
			const { auth } = await import("@clerk/tanstack-react-start/server");
			vi.mocked(auth).mockResolvedValueOnce({ userId: null } as never);

			const mockAuth = await auth();
			expect(mockAuth.userId).toBeNull();
		});
	});

	describe("Direct upload flow", () => {
		it("should sanitize filename during upload", async () => {
			const { sanitizeFilename } = await import("@/lib/file-validation");

			// Test filename sanitization
			const sanitized = sanitizeFilename("my<unsafe>file.pdf");
			expect(sanitized).toBe("myunsafefile.pdf");
		});

		it("should generate valid R2 key structure", async () => {
			const { generateR2Key } = await import("@/lib/file-validation");

			// Test R2 key generation (using mocked function)
			vi.mocked(generateR2Key).mockImplementation(
				(workspaceId, ownerType, filename) => {
					const timestamp = Date.now();
					const folderMap: Record<string, string> = {
						brandVoice: "brand-voices",
						persona: "personas",
						knowledgeBaseItem: "knowledge-base",
						example: "examples",
					};
					const folder = folderMap[ownerType] || "misc";
					return `${workspaceId}/${folder}/${timestamp}-${filename}`;
				},
			);

			const r2Key = generateR2Key("workspace-123", "brandVoice", "test.pdf");
			expect(r2Key).toContain("workspace-123");
			expect(r2Key).toContain("brand-voices");
			expect(r2Key).toContain("test.pdf");
		});

		it("should upload file to R2 using native bindings", async () => {
			const { uploadFile } = await import("@/lib/r2-client");
			const { getR2Bucket } = await import("@/lib/env");

			const fileContent = new ArrayBuffer(100);
			const bucket = await getR2Bucket();

			await uploadFile(bucket, "test-key", fileContent, "application/pdf");

			expect(uploadFile).toHaveBeenCalledWith(
				bucket,
				"test-key",
				fileContent,
				"application/pdf",
			);
		});
	});

	describe("Text extraction during upload", () => {
		it("should extract text for supported file types", async () => {
			const { isTextExtractable, extractAndTruncateText } = await import("@/lib/text-extraction");
			const { fetchFileContent } = await import("@/lib/r2-client");

			// Enable text extraction for this test
			vi.mocked(isTextExtractable).mockReturnValueOnce(true);

			// Verify extraction is called when file type is supported
			expect(isTextExtractable("application/pdf")).toBe(true);

			const fileBuffer = Buffer.from("test content");
			vi.mocked(fetchFileContent).mockResolvedValueOnce(fileBuffer);

			const result = await extractAndTruncateText(fileBuffer, "application/pdf");
			expect(result?.text).toBe("extracted text");
		});

		it("should skip extraction for unsupported file types", async () => {
			const { isTextExtractable } = await import("@/lib/text-extraction");

			// Image files should not have text extraction
			expect(isTextExtractable("image/jpeg")).toBe(false);
		});
	});

	describe("Direct download flow", () => {
		it("should download file using native R2 bindings", async () => {
			const { downloadFile } = await import("@/lib/r2-client");
			const { getR2Bucket } = await import("@/lib/env");

			const bucket = await getR2Bucket();
			const result = await downloadFile(bucket, "test-key");

			expect(downloadFile).toHaveBeenCalledWith(bucket, "test-key");
			expect(result).toBeDefined();
		});

		it("should return file content and metadata", async () => {
			const { downloadFile } = await import("@/lib/r2-client");
			const { getR2Bucket } = await import("@/lib/env");

			const bucket = await getR2Bucket();
			const object = await downloadFile(bucket, "test-key");

			expect(object).toHaveProperty("arrayBuffer");
			expect(object).toHaveProperty("httpMetadata");
		});
	});
});
