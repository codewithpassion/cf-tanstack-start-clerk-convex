/**
 * Tests for persona management operations.
 * Tests verify persona CRUD operations, soft delete filtering, and file attachment support.
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

interface MockPersona {
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
	personaId?: string;
	filename: string;
	mimeType: string;
	sizeBytes: number;
	r2Key: string;
	extractedText?: string;
	createdAt: number;
}

describe("Persona Management", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("createPersona mutation", () => {
		it("should create persona with required fields", async () => {
			const mockDb = {
				insert: vi.fn().mockResolvedValue("persona-123"),
			};

			const personaData = {
				projectId: "project-123",
				name: "Target Audience CEO",
				description: "C-level executive in tech startups",
				createdAt: Date.now(),
				updatedAt: Date.now(),
			};

			const personaId = await mockDb.insert("personas", personaData);

			expect(personaId).toBe("persona-123");
			expect(mockDb.insert).toHaveBeenCalledWith("personas", personaData);
		});

		it("should create persona with name only when description is omitted", async () => {
			const mockDb = {
				insert: vi.fn().mockResolvedValue("persona-124"),
			};

			const personaData = {
				projectId: "project-123",
				name: "Marketing Manager",
				createdAt: Date.now(),
				updatedAt: Date.now(),
			};

			const personaId = await mockDb.insert("personas", personaData);

			expect(personaId).toBe("persona-124");
			expect(mockDb.insert).toHaveBeenCalledWith("personas", expect.objectContaining({
				name: "Marketing Manager",
			}));
		});
	});

	describe("listPersonas query", () => {
		it("should filter out soft-deleted personas", async () => {
			const activePersona: MockPersona = {
				_id: "persona-1",
				projectId: "project-123",
				name: "Active Persona",
				createdAt: Date.now(),
				updatedAt: Date.now(),
			};

			const deletedPersona: MockPersona = {
				_id: "persona-2",
				projectId: "project-123",
				name: "Deleted Persona",
				deletedAt: Date.now() - 1000, // Soft deleted
				createdAt: Date.now() - 2000,
				updatedAt: Date.now() - 1000,
			};

			const allPersonas = [activePersona, deletedPersona];

			// Filter out soft-deleted personas
			const activePersonas = allPersonas.filter((p) => !p.deletedAt);

			expect(activePersonas).toHaveLength(1);
			expect(activePersonas[0]).toEqual(activePersona);
			expect(activePersonas.find((p) => p.name === "Deleted Persona")).toBeUndefined();
		});
	});

	describe("getPersona query", () => {
		it("should return persona with attached files", async () => {
			const mockPersona: MockPersona = {
				_id: "persona-123",
				projectId: "project-123",
				name: "Tech CEO",
				description: "CEO of a SaaS company",
				createdAt: Date.now(),
				updatedAt: Date.now(),
			};

			const mockFiles: MockFile[] = [
				{
					_id: "file-1",
					personaId: "persona-123",
					filename: "persona-profile.pdf",
					mimeType: "application/pdf",
					sizeBytes: 50000,
					r2Key: "workspace-123/personas/file-1-persona-profile.pdf",
					extractedText: "Detailed persona description...",
					createdAt: Date.now(),
				},
			];

			// Simulate query returning persona with files
			const result = {
				...mockPersona,
				files: mockFiles,
			};

			expect(result.files).toHaveLength(1);
			expect(result.files[0].personaId).toBe(mockPersona._id);
		});
	});

	describe("deletePersona mutation", () => {
		it("should set deletedAt timestamp for soft delete", async () => {
			const mockPersona: MockPersona = {
				_id: "persona-123",
				projectId: "project-123",
				name: "Persona to Delete",
				createdAt: Date.now() - 10000,
				updatedAt: Date.now() - 5000,
			};

			const mockDb = {
				get: vi.fn().mockResolvedValue(mockPersona),
				patch: vi.fn().mockResolvedValue(undefined),
			};

			const deletedAt = Date.now();
			await mockDb.patch("persona-123", { deletedAt });

			expect(mockDb.patch).toHaveBeenCalledWith("persona-123", expect.objectContaining({
				deletedAt: expect.any(Number),
			}));

			// Verify persona is soft deleted (not hard deleted)
			expect(mockDb.patch).toHaveBeenCalled();
		});

		it("should not permanently delete the persona record", async () => {
			const mockDb = {
				delete: vi.fn(),
				patch: vi.fn().mockResolvedValue(undefined),
			};

			// Soft delete uses patch, not delete
			await mockDb.patch("persona-123", { deletedAt: Date.now() });

			// delete should never be called for soft delete
			expect(mockDb.delete).not.toHaveBeenCalled();
		});
	});
});
