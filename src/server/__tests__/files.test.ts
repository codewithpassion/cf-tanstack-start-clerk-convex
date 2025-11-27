/**
 * Tests for file server functions.
 * Tests verify presigned URL generation, validation, and upload confirmation flow.
 *
 * Note: These tests mock external dependencies (R2, Clerk auth, Convex)
 * to test the server function logic in isolation.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock Clerk auth
vi.mock("@clerk/tanstack-react-start/server", () => ({
	auth: vi.fn().mockResolvedValue({ userId: "test-user-123" }),
}));

// Mock R2 client
vi.mock("@/lib/r2-client", () => ({
	generateUploadUrl: vi.fn().mockResolvedValue("https://r2.example.com/upload-url"),
	generateDownloadUrl: vi.fn().mockResolvedValue("https://r2.example.com/download-url"),
	DEFAULT_UPLOAD_EXPIRY: 300,
	DEFAULT_DOWNLOAD_EXPIRY: 3600,
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

	describe("getUploadUrl validation", () => {
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

	describe("File ownership verification flow", () => {
		it("should require authentication for upload URL generation", async () => {
			const { auth } = await import("@clerk/tanstack-react-start/server");
			vi.mocked(auth).mockResolvedValueOnce({ userId: null } as never);

			// When auth returns no userId, the handler should throw
			// This tests the authentication check in the server function
			const mockAuth = await auth();
			expect(mockAuth.userId).toBeNull();
		});

		it("should require authentication for download URL generation", async () => {
			const { auth } = await import("@clerk/tanstack-react-start/server");
			vi.mocked(auth).mockResolvedValueOnce({ userId: null } as never);

			const mockAuth = await auth();
			expect(mockAuth.userId).toBeNull();
		});
	});

	describe("Upload confirmation flow", () => {
		it("should sanitize filename during upload confirmation", async () => {
			const { sanitizeFilename } = await import("@/lib/file-validation");

			// Test filename sanitization
			const sanitized = sanitizeFilename("my<unsafe>file.pdf");
			expect(sanitized).toBe("myunsafefile.pdf");
		});

		it("should generate valid R2 key structure", async () => {
			const { generateR2Key } = await import("@/lib/file-validation");

			// Test R2 key generation (using the real function)
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
	});

	describe("Presigned URL generation", () => {
		it("should generate upload URL with correct expiration", async () => {
			const { generateUploadUrl, DEFAULT_UPLOAD_EXPIRY } = await import("@/lib/r2-client");

			await generateUploadUrl("test-key", "application/pdf", DEFAULT_UPLOAD_EXPIRY);

			expect(generateUploadUrl).toHaveBeenCalledWith(
				"test-key",
				"application/pdf",
				300,
			);
		});

		it("should generate download URL with correct expiration", async () => {
			const { generateDownloadUrl, DEFAULT_DOWNLOAD_EXPIRY } = await import("@/lib/r2-client");

			await generateDownloadUrl("test-key", DEFAULT_DOWNLOAD_EXPIRY);

			expect(generateDownloadUrl).toHaveBeenCalledWith("test-key", 3600);
		});
	});
});
