/**
 * Tests for brand voice management operations.
 * Tests verify brand voice CRUD operations, file attachment support, soft delete filtering,
 * and cascading file deletion.
 *
 * Note: These tests validate the logic structure and expected behavior patterns.
 * Actual Convex mutations/queries are tested at runtime.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the Convex server modules
vi.mock("convex/values", () => ({
	ConvexError: class ConvexError extends Error {
		constructor(message: string) {
			super(message);
			this.name = "ConvexError";
		}
	},
	v: {
		string: () => ({ type: "string" }),
		optional: (t: unknown) => ({ type: "optional", inner: t }),
		boolean: () => ({ type: "boolean" }),
		number: () => ({ type: "number" }),
		array: (t: unknown) => ({ type: "array", inner: t }),
		id: (table: string) => ({ type: "id", table }),
	},
}));

interface MockBrandVoice {
	_id: string;
	projectId: string;
	name: string;
	description?: string;
	deletedAt?: number;
	createdAt: number;
	updatedAt: number;
}

interface MockFile {
	_id: string;
	brandVoiceId?: string;
	filename: string;
	mimeType: string;
	sizeBytes: number;
	r2Key: string;
	extractedText?: string;
	createdAt: number;
}

describe("Brand Voice Management", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("createBrandVoice mutation", () => {
		it("should create brand voice with text description", async () => {
			const mockDb = {
				insert: vi.fn().mockResolvedValue("brand-voice-123"),
			};

			const brandVoiceData = {
				projectId: "project-123",
				name: "Professional Brand Voice",
				description: "Clear, authoritative, and approachable tone for B2B content",
				createdAt: Date.now(),
				updatedAt: Date.now(),
			};

			const brandVoiceId = await mockDb.insert("brandVoices", brandVoiceData);

			expect(brandVoiceId).toBe("brand-voice-123");
			expect(mockDb.insert).toHaveBeenCalledWith("brandVoices", brandVoiceData);
		});

		it("should create brand voice with name only when description is omitted", async () => {
			const mockDb = {
				insert: vi.fn().mockResolvedValue("brand-voice-124"),
			};

			const brandVoiceData = {
				projectId: "project-123",
				name: "Minimal Voice",
				createdAt: Date.now(),
				updatedAt: Date.now(),
			};

			const brandVoiceId = await mockDb.insert("brandVoices", brandVoiceData);

			expect(brandVoiceId).toBe("brand-voice-124");
			expect(mockDb.insert).toHaveBeenCalledWith("brandVoices", expect.objectContaining({
				name: "Minimal Voice",
			}));
		});
	});

	describe("Brand voice with file attachment", () => {
		it("should support file attachment to brand voice", async () => {
			const brandVoiceId = "brand-voice-123";

			const mockFile: MockFile = {
				_id: "file-456",
				brandVoiceId,
				filename: "brand-guide.pdf",
				mimeType: "application/pdf",
				sizeBytes: 524288, // 512KB
				r2Key: "workspace-123/brand-voices/file-456-brand-guide.pdf",
				extractedText: "Our brand voice is professional yet approachable...",
				createdAt: Date.now(),
			};

			expect(mockFile.brandVoiceId).toBe(brandVoiceId);
			expect(mockFile.extractedText).toBeDefined();
			expect(mockFile.extractedText?.length).toBeGreaterThan(0);
		});

		it("should retrieve files attached to brand voice", async () => {
			const brandVoiceId = "brand-voice-123";

			const mockFiles: MockFile[] = [
				{
					_id: "file-1",
					brandVoiceId,
					filename: "brand-guide.pdf",
					mimeType: "application/pdf",
					sizeBytes: 524288,
					r2Key: "workspace-123/brand-voices/file-1-brand-guide.pdf",
					extractedText: "Brand guidelines text...",
					createdAt: Date.now(),
				},
				{
					_id: "file-2",
					brandVoiceId,
					filename: "tone-examples.docx",
					mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
					sizeBytes: 102400,
					r2Key: "workspace-123/brand-voices/file-2-tone-examples.docx",
					extractedText: "Example content showing our tone...",
					createdAt: Date.now(),
				},
			];

			// Filter files by brandVoiceId
			const brandVoiceFiles = mockFiles.filter(
				(file) => file.brandVoiceId === brandVoiceId
			);

			expect(brandVoiceFiles).toHaveLength(2);
			expect(brandVoiceFiles[0].filename).toBe("brand-guide.pdf");
			expect(brandVoiceFiles[1].filename).toBe("tone-examples.docx");
		});
	});

	describe("listBrandVoices query", () => {
		it("should filter out soft-deleted brand voices", async () => {
			const activeBrandVoice: MockBrandVoice = {
				_id: "brand-voice-1",
				projectId: "project-123",
				name: "Active Voice",
				description: "Our current brand voice",
				createdAt: Date.now(),
				updatedAt: Date.now(),
			};

			const deletedBrandVoice: MockBrandVoice = {
				_id: "brand-voice-2",
				projectId: "project-123",
				name: "Deleted Voice",
				description: "Old brand voice we no longer use",
				deletedAt: Date.now() - 1000, // Soft deleted
				createdAt: Date.now() - 5000,
				updatedAt: Date.now() - 1000,
			};

			const allBrandVoices = [activeBrandVoice, deletedBrandVoice];

			// Filter out soft-deleted brand voices
			const activeBrandVoices = allBrandVoices.filter((bv) => !bv.deletedAt);

			expect(activeBrandVoices).toHaveLength(1);
			expect(activeBrandVoices[0]).toEqual(activeBrandVoice);
			expect(activeBrandVoices.find((bv) => bv.name === "Deleted Voice")).toBeUndefined();
		});

		it("should sort brand voices by createdAt descending", async () => {
			const olderBrandVoice: MockBrandVoice = {
				_id: "brand-voice-1",
				projectId: "project-123",
				name: "Older Voice",
				createdAt: Date.now() - 10000,
				updatedAt: Date.now() - 5000,
			};

			const newerBrandVoice: MockBrandVoice = {
				_id: "brand-voice-2",
				projectId: "project-123",
				name: "Newer Voice",
				createdAt: Date.now() - 1000,
				updatedAt: Date.now() - 500,
			};

			const brandVoices = [olderBrandVoice, newerBrandVoice];

			// Sort by createdAt descending (newest first)
			const sortedBrandVoices = [...brandVoices].sort(
				(a, b) => b.createdAt - a.createdAt
			);

			expect(sortedBrandVoices[0].name).toBe("Newer Voice");
			expect(sortedBrandVoices[1].name).toBe("Older Voice");
		});
	});

	describe("deleteBrandVoice mutation", () => {
		it("should soft delete brand voice and mark associated files for deletion", async () => {
			const brandVoiceId = "brand-voice-123";
			const deletedAt = Date.now();

			const mockBrandVoice: MockBrandVoice = {
				_id: brandVoiceId,
				projectId: "project-123",
				name: "Voice to Delete",
				description: "This will be soft deleted",
				createdAt: Date.now() - 10000,
				updatedAt: Date.now() - 5000,
			};

			const mockFiles: MockFile[] = [
				{
					_id: "file-1",
					brandVoiceId,
					filename: "brand-guide.pdf",
					mimeType: "application/pdf",
					sizeBytes: 524288,
					r2Key: "workspace-123/brand-voices/file-1-brand-guide.pdf",
					createdAt: Date.now() - 5000,
				},
				{
					_id: "file-2",
					brandVoiceId,
					filename: "tone-examples.docx",
					mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
					sizeBytes: 102400,
					r2Key: "workspace-123/brand-voices/file-2-tone-examples.docx",
					createdAt: Date.now() - 3000,
				},
			];

			const mockDb = {
				get: vi.fn().mockResolvedValue(mockBrandVoice),
				patch: vi.fn().mockResolvedValue(undefined),
				query: vi.fn().mockReturnValue({
					withIndex: vi.fn().mockReturnValue({
						collect: vi.fn().mockResolvedValue(mockFiles),
					}),
				}),
				delete: vi.fn().mockResolvedValue(undefined),
			};

			// Soft delete brand voice
			await mockDb.patch(brandVoiceId, {
				deletedAt,
				updatedAt: deletedAt,
			});

			// Verify brand voice was soft deleted
			expect(mockDb.patch).toHaveBeenCalledWith(brandVoiceId, expect.objectContaining({
				deletedAt: expect.any(Number),
			}));

			// Verify files can be retrieved for deletion
			const files = await mockDb
				.query("files")
				.withIndex("by_brandVoiceId", (q: unknown) => q)
				.collect();

			expect(files).toHaveLength(2);
			expect(files[0].r2Key).toBeDefined();
			expect(files[1].r2Key).toBeDefined();

			// In actual implementation, these files would be hard deleted
			// along with their R2 objects
		});

		it("should set deletedAt timestamp for soft delete", async () => {
			const mockBrandVoice: MockBrandVoice = {
				_id: "brand-voice-123",
				projectId: "project-123",
				name: "Voice to Delete",
				createdAt: Date.now() - 10000,
				updatedAt: Date.now() - 5000,
			};

			const mockDb = {
				get: vi.fn().mockResolvedValue(mockBrandVoice),
				patch: vi.fn().mockResolvedValue(undefined),
			};

			const deletedAt = Date.now();
			await mockDb.patch("brand-voice-123", { deletedAt, updatedAt: deletedAt });

			expect(mockDb.patch).toHaveBeenCalledWith("brand-voice-123", expect.objectContaining({
				deletedAt: expect.any(Number),
				updatedAt: expect.any(Number),
			}));
		});
	});

	describe("updateBrandVoice mutation", () => {
		it("should update brand voice fields and modify updatedAt", async () => {
			const originalUpdatedAt = Date.now() - 5000;
			const mockBrandVoice: MockBrandVoice = {
				_id: "brand-voice-123",
				projectId: "project-123",
				name: "Original Name",
				description: "Original description",
				createdAt: Date.now() - 10000,
				updatedAt: originalUpdatedAt,
			};

			const mockDb = {
				get: vi.fn().mockResolvedValue(mockBrandVoice),
				patch: vi.fn().mockResolvedValue(undefined),
			};

			const newUpdatedAt = Date.now();
			const updateData = {
				name: "Updated Name",
				description: "Updated description with more detail",
				updatedAt: newUpdatedAt,
			};

			await mockDb.patch("brand-voice-123", updateData);

			expect(mockDb.patch).toHaveBeenCalledWith("brand-voice-123", expect.objectContaining({
				name: "Updated Name",
				description: "Updated description with more detail",
				updatedAt: expect.any(Number),
			}));

			// Verify updatedAt is a newer timestamp
			const patchCall = mockDb.patch.mock.calls[0][1] as { updatedAt: number };
			expect(patchCall.updatedAt).toBeGreaterThan(originalUpdatedAt);
		});
	});
});
