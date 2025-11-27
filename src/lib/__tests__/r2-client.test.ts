// @ts-nocheck
/**
 * Tests for R2 client using native Cloudflare R2 bindings.
 * Tests verify that R2 operations work correctly with the native API.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { R2Bucket, R2ObjectBody } from "@cloudflare/workers-types";

describe("R2 Client", () => {
	let mockBucket: R2Bucket;

	beforeEach(async () => {
		// Reset modules to clear any cached imports
		vi.resetModules();

		// Create mock R2Bucket with required methods
		mockBucket = {
			put: vi.fn().mockResolvedValue(undefined),
			get: vi.fn().mockResolvedValue({
				body: new ReadableStream(),
				httpMetadata: {
					contentType: "application/pdf",
				},
				arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(100)),
			} as Partial<R2ObjectBody>),
			delete: vi.fn().mockResolvedValue(undefined),
		} as unknown as R2Bucket;
	});

	describe("uploadFile", () => {
		it("should upload file to R2 with correct parameters", async () => {
			const { uploadFile } = await import("../r2-client");

			const fileContent = new ArrayBuffer(100);
			const key = "test-workspace/brand-voices/test-file.pdf";
			const contentType = "application/pdf";

			await uploadFile(mockBucket, key, fileContent, contentType);

			expect(mockBucket.put).toHaveBeenCalledWith(
				key,
				fileContent,
				{
					httpMetadata: { contentType },
				},
			);
		});

		it("should handle ReadableStream as file content", async () => {
			const { uploadFile } = await import("../r2-client");

			const stream = new ReadableStream();
			const key = "test.txt";
			const contentType = "text/plain";

			await uploadFile(mockBucket, key, stream, contentType);

			expect(mockBucket.put).toHaveBeenCalledWith(
				key,
				stream,
				{
					httpMetadata: { contentType },
				},
			);
		});
	});

	describe("downloadFile", () => {
		it("should download file from R2", async () => {
			const { downloadFile } = await import("../r2-client");

			const key = "test-key.pdf";
			const result = await downloadFile(mockBucket, key);

			expect(mockBucket.get).toHaveBeenCalledWith(key);
			expect(result).toBeDefined();
		});

		it("should return null when file not found", async () => {
			const { downloadFile } = await import("../r2-client");

			mockBucket.get = vi.fn().mockResolvedValue(null);

			const result = await downloadFile(mockBucket, "nonexistent.pdf");

			expect(result).toBeNull();
		});
	});

	describe("fetchFileContent", () => {
		it("should fetch file content as Buffer", async () => {
			const { fetchFileContent } = await import("../r2-client");

			const testData = new Uint8Array([1, 2, 3, 4, 5]);
			const mockObject = {
				arrayBuffer: vi.fn().mockResolvedValue(testData.buffer),
			} as Partial<R2ObjectBody>;

			mockBucket.get = vi.fn().mockResolvedValue(mockObject as R2ObjectBody);

			const result = await fetchFileContent(mockBucket, "test-key");

			expect(result).toBeInstanceOf(Buffer);
			expect(result?.length).toBe(5);
		});

		it("should return null when file not found", async () => {
			const { fetchFileContent } = await import("../r2-client");

			mockBucket.get = vi.fn().mockResolvedValue(null);

			const result = await fetchFileContent(mockBucket, "nonexistent.pdf");

			expect(result).toBeNull();
		});


		it("should return null and log error on failure", async () => {
			const { fetchFileContent } = await import("../r2-client");

			const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
			mockBucket.get = vi.fn().mockRejectedValue(new Error("R2 error"));

			const result = await fetchFileContent(mockBucket, "test-key");

			expect(result).toBeNull();
			expect(consoleSpy).toHaveBeenCalledWith(
				"Failed to fetch file from R2:",
				expect.any(Error),
			);

			consoleSpy.mockRestore();
		});
	});

	describe("deleteObject", () => {
		it("should delete object from R2", async () => {
			const { deleteObject } = await import("../r2-client");

			const key = "test-key.pdf";
			await deleteObject(mockBucket, key);

			expect(mockBucket.delete).toHaveBeenCalledWith(key);
		});
	});
});