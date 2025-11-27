/**
 * Tests for R2 client presigned URL generation.
 * Tests verify that presigned URLs are generated with correct parameters and expiration.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the AWS SDK before importing the module
vi.mock("@aws-sdk/client-s3", () => ({
	S3Client: vi.fn().mockImplementation(() => ({})),
	PutObjectCommand: vi.fn().mockImplementation((params) => params),
	GetObjectCommand: vi.fn().mockImplementation((params) => params),
	DeleteObjectCommand: vi.fn().mockImplementation((params) => params),
}));

vi.mock("@aws-sdk/s3-request-presigner", () => ({
	getSignedUrl: vi.fn().mockResolvedValue("https://example.com/presigned-url"),
}));

describe("R2 Client", () => {
	beforeEach(() => {
		vi.resetModules();
		// Set environment variables for tests
		process.env.R2_ACCOUNT_ID = "test-account-id";
		process.env.R2_ACCESS_KEY_ID = "test-access-key";
		process.env.R2_SECRET_ACCESS_KEY = "test-secret-key";
		process.env.R2_BUCKET_NAME = "test-bucket";
	});

	describe("generateUploadUrl", () => {
		it("should generate a presigned PUT URL with correct parameters", async () => {
			const { getSignedUrl } = await import("@aws-sdk/s3-request-presigner");
			const { generateUploadUrl } = await import("../r2-client");

			const result = await generateUploadUrl(
				"test-workspace/brand-voices/test-file.pdf",
				"application/pdf",
				300,
			);

			expect(result).toBe("https://example.com/presigned-url");
			expect(getSignedUrl).toHaveBeenCalledWith(
				expect.anything(),
				expect.objectContaining({
					Key: "test-workspace/brand-voices/test-file.pdf",
					ContentType: "application/pdf",
				}),
				{ expiresIn: 300 },
			);
		});

		it("should use default expiration when not provided", async () => {
			const { getSignedUrl } = await import("@aws-sdk/s3-request-presigner");
			const { generateUploadUrl, DEFAULT_UPLOAD_EXPIRY } = await import(
				"../r2-client"
			);

			await generateUploadUrl("test-key", "text/plain");

			expect(getSignedUrl).toHaveBeenCalledWith(
				expect.anything(),
				expect.anything(),
				{ expiresIn: DEFAULT_UPLOAD_EXPIRY },
			);
		});
	});

	describe("generateDownloadUrl", () => {
		it("should generate a presigned GET URL with correct parameters", async () => {
			const { getSignedUrl } = await import("@aws-sdk/s3-request-presigner");
			const { generateDownloadUrl } = await import("../r2-client");

			const result = await generateDownloadUrl("test-key.pdf", 3600);

			expect(result).toBe("https://example.com/presigned-url");
			expect(getSignedUrl).toHaveBeenCalledWith(
				expect.anything(),
				expect.objectContaining({
					Key: "test-key.pdf",
				}),
				{ expiresIn: 3600 },
			);
		});

		it("should use default expiration for downloads", async () => {
			const { getSignedUrl } = await import("@aws-sdk/s3-request-presigner");
			const { generateDownloadUrl, DEFAULT_DOWNLOAD_EXPIRY } = await import(
				"../r2-client"
			);

			await generateDownloadUrl("test-key.pdf");

			expect(getSignedUrl).toHaveBeenCalledWith(
				expect.anything(),
				expect.anything(),
				{ expiresIn: DEFAULT_DOWNLOAD_EXPIRY },
			);
		});
	});
});
