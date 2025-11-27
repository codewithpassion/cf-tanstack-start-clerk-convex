/**
 * Tests for file validation utilities.
 * Validates file size limits, MIME type allowlisting, and filename sanitization.
 */
import { describe, it, expect } from "vitest";
import {
	validateFileSize,
	validateMimeType,
	sanitizeFilename,
	ALLOWED_MIME_TYPES,
	MAX_FILE_SIZE_BYTES,
} from "../file-validation";

describe("File Validation", () => {
	describe("validateFileSize", () => {
		it("should accept files under the size limit", () => {
			const result = validateFileSize(1024); // 1KB
			expect(result.valid).toBe(true);
			expect(result.error).toBeUndefined();
		});

		it("should accept files at exactly the size limit", () => {
			const result = validateFileSize(MAX_FILE_SIZE_BYTES);
			expect(result.valid).toBe(true);
		});

		it("should reject files over the size limit", () => {
			const result = validateFileSize(MAX_FILE_SIZE_BYTES + 1);
			expect(result.valid).toBe(false);
			expect(result.error).toContain("15MB");
		});

		it("should reject zero-byte files", () => {
			const result = validateFileSize(0);
			expect(result.valid).toBe(false);
			expect(result.error).toContain("empty");
		});

		it("should reject negative file sizes", () => {
			const result = validateFileSize(-100);
			expect(result.valid).toBe(false);
		});
	});

	describe("validateMimeType", () => {
		it("should accept allowed MIME types", () => {
			for (const mimeType of ALLOWED_MIME_TYPES) {
				const result = validateMimeType(mimeType);
				expect(result.valid).toBe(true);
				expect(result.error).toBeUndefined();
			}
		});

		it("should reject disallowed MIME types", () => {
			const disallowedTypes = [
				"application/javascript",
				"text/html",
				"application/x-executable",
				"video/mp4",
			];

			for (const mimeType of disallowedTypes) {
				const result = validateMimeType(mimeType);
				expect(result.valid).toBe(false);
				expect(result.error).toContain("not allowed");
			}
		});

		it("should reject empty MIME type", () => {
			const result = validateMimeType("");
			expect(result.valid).toBe(false);
		});
	});

	describe("sanitizeFilename", () => {
		it("should preserve safe filenames", () => {
			expect(sanitizeFilename("document.pdf")).toBe("document.pdf");
			expect(sanitizeFilename("my-file_2024.txt")).toBe("my-file_2024.txt");
		});

		it("should remove unsafe characters", () => {
			expect(sanitizeFilename("file<name>.pdf")).toBe("filename.pdf");
			expect(sanitizeFilename("file/name.pdf")).toBe("filename.pdf");
			expect(sanitizeFilename("file\\name.pdf")).toBe("filename.pdf");
			expect(sanitizeFilename('file"name.pdf')).toBe("filename.pdf");
		});

		it("should handle multiple spaces and dots", () => {
			expect(sanitizeFilename("my   file...pdf")).toBe("my_file.pdf");
		});

		it("should truncate overly long filenames", () => {
			const longName = "a".repeat(300) + ".pdf";
			const sanitized = sanitizeFilename(longName);
			expect(sanitized.length).toBeLessThanOrEqual(255);
			expect(sanitized.endsWith(".pdf")).toBe(true);
		});

		it("should handle empty filename", () => {
			expect(sanitizeFilename("")).toBe("unnamed_file");
		});

		it("should handle filename with only extension", () => {
			expect(sanitizeFilename(".pdf")).toBe("unnamed_file.pdf");
		});
	});
});
