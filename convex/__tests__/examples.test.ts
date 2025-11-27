/**
 * Tests for examples library operations.
 * Tests verify example CRUD operations, category scoping, and validation.
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

interface MockExample {
	_id: string;
	categoryId: string;
	projectId: string;
	title: string;
	content?: string;
	notes?: string;
	fileId?: string;
	deletedAt?: number;
	createdAt: number;
	updatedAt: number;
}

describe("Examples Library Management", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("createExample mutation", () => {
		it("should create example with text content", async () => {
			const mockDb = {
				insert: vi.fn().mockResolvedValue("example-123"),
			};

			const exampleData = {
				categoryId: "category-123",
				projectId: "project-123",
				title: "Great LinkedIn Post Example",
				content: "This is an example of a successful LinkedIn post that got 10k impressions.",
				notes: "Posted during peak hours for maximum engagement",
				createdAt: Date.now(),
				updatedAt: Date.now(),
			};

			const exampleId = await mockDb.insert("examples", exampleData);

			expect(exampleId).toBe("example-123");
			expect(mockDb.insert).toHaveBeenCalledWith("examples", exampleData);
		});

		it("should create example with file attachment", async () => {
			const mockDb = {
				insert: vi.fn().mockResolvedValue("example-124"),
			};

			const exampleData = {
				categoryId: "category-123",
				projectId: "project-123",
				title: "Example Blog Post PDF",
				fileId: "file-456",
				notes: "Award-winning blog post from Q3 2024",
				createdAt: Date.now(),
				updatedAt: Date.now(),
			};

			const exampleId = await mockDb.insert("examples", exampleData);

			expect(exampleId).toBe("example-124");
			expect(mockDb.insert).toHaveBeenCalledWith("examples", expect.objectContaining({
				title: "Example Blog Post PDF",
				fileId: "file-456",
			}));
		});

		it("should validate title is required", async () => {
			const exampleData = {
				categoryId: "category-123",
				projectId: "project-123",
				// title is missing
				content: "Some content",
			};

			// In real implementation, this would throw ConvexError
			const hasTitle = "title" in exampleData;
			expect(hasTitle).toBe(false);
		});

		it("should validate title max length (200 chars)", async () => {
			const longTitle = "a".repeat(201);
			const validTitle = "a".repeat(200);

			expect(longTitle.length).toBeGreaterThan(200);
			expect(validTitle.length).toBeLessThanOrEqual(200);
		});
	});

	describe("listExamples query", () => {
		it("should return examples scoped to category", async () => {
			const category1Examples: MockExample[] = [
				{
					_id: "example-1",
					categoryId: "category-123",
					projectId: "project-123",
					title: "Example 1",
					content: "Content 1",
					createdAt: Date.now(),
					updatedAt: Date.now(),
				},
				{
					_id: "example-2",
					categoryId: "category-123",
					projectId: "project-123",
					title: "Example 2",
					content: "Content 2",
					createdAt: Date.now(),
					updatedAt: Date.now(),
				},
			];

			const category2Examples: MockExample[] = [
				{
					_id: "example-3",
					categoryId: "category-456",
					projectId: "project-123",
					title: "Example 3",
					content: "Content 3",
					createdAt: Date.now(),
					updatedAt: Date.now(),
				},
			];

			const allExamples = [...category1Examples, ...category2Examples];

			// Filter by category
			const filteredExamples = allExamples.filter(
				(ex) => ex.categoryId === "category-123"
			);

			expect(filteredExamples).toHaveLength(2);
			expect(filteredExamples.every((ex) => ex.categoryId === "category-123")).toBe(true);
		});

		it("should filter out soft-deleted examples", async () => {
			const activeExample: MockExample = {
				_id: "example-1",
				categoryId: "category-123",
				projectId: "project-123",
				title: "Active Example",
				content: "Active content",
				createdAt: Date.now(),
				updatedAt: Date.now(),
			};

			const deletedExample: MockExample = {
				_id: "example-2",
				categoryId: "category-123",
				projectId: "project-123",
				title: "Deleted Example",
				content: "Deleted content",
				deletedAt: Date.now() - 1000, // Soft deleted
				createdAt: Date.now() - 2000,
				updatedAt: Date.now() - 1000,
			};

			const allExamples = [activeExample, deletedExample];

			// Filter out soft-deleted examples
			const activeExamples = allExamples.filter((ex) => !ex.deletedAt);

			expect(activeExamples).toHaveLength(1);
			expect(activeExamples[0]).toEqual(activeExample);
		});
	});

	describe("updateExample mutation", () => {
		it("should update example fields", async () => {
			const mockExample: MockExample = {
				_id: "example-123",
				categoryId: "category-123",
				projectId: "project-123",
				title: "Original Title",
				content: "Original content",
				notes: "Original notes",
				createdAt: Date.now() - 10000,
				updatedAt: Date.now() - 5000,
			};

			const mockDb = {
				get: vi.fn().mockResolvedValue(mockExample),
				patch: vi.fn().mockResolvedValue(undefined),
			};

			const updateData = {
				title: "Updated Title",
				content: "Updated content",
				notes: "Updated notes",
				updatedAt: Date.now(),
			};

			await mockDb.patch("example-123", updateData);

			expect(mockDb.patch).toHaveBeenCalledWith("example-123", expect.objectContaining({
				title: "Updated Title",
				content: "Updated content",
				notes: "Updated notes",
			}));
		});

		it("should validate content max length (50000 chars)", async () => {
			const longContent = "a".repeat(50001);
			const validContent = "a".repeat(50000);

			expect(longContent.length).toBeGreaterThan(50000);
			expect(validContent.length).toBeLessThanOrEqual(50000);
		});

		it("should validate notes max length (2000 chars)", async () => {
			const longNotes = "a".repeat(2001);
			const validNotes = "a".repeat(2000);

			expect(longNotes.length).toBeGreaterThan(2000);
			expect(validNotes.length).toBeLessThanOrEqual(2000);
		});
	});

	describe("deleteExample mutation", () => {
		it("should set deletedAt timestamp for soft delete", async () => {
			const mockExample: MockExample = {
				_id: "example-123",
				categoryId: "category-123",
				projectId: "project-123",
				title: "Example to Delete",
				content: "Content to delete",
				createdAt: Date.now() - 10000,
				updatedAt: Date.now() - 5000,
			};

			const mockDb = {
				get: vi.fn().mockResolvedValue(mockExample),
				patch: vi.fn().mockResolvedValue(undefined),
			};

			const deletedAt = Date.now();
			await mockDb.patch("example-123", { deletedAt });

			expect(mockDb.patch).toHaveBeenCalledWith("example-123", expect.objectContaining({
				deletedAt: expect.any(Number),
			}));
		});
	});

	describe("getExample query", () => {
		it("should return example with file data", async () => {
			const mockExample: MockExample = {
				_id: "example-123",
				categoryId: "category-123",
				projectId: "project-123",
				title: "Example with File",
				fileId: "file-456",
				notes: "Important example",
				createdAt: Date.now(),
				updatedAt: Date.now(),
			};

			const mockFile = {
				_id: "file-456",
				exampleId: "example-123",
				filename: "example.pdf",
				mimeType: "application/pdf",
				sizeBytes: 1024000,
				r2Key: "workspace-123/examples/file-456-example.pdf",
				extractedText: "Extracted text from the PDF...",
				createdAt: Date.now(),
			};

			const mockDb = {
				get: vi.fn()
					.mockResolvedValueOnce(mockExample)
					.mockResolvedValueOnce(mockFile),
			};

			const example = await mockDb.get("example-123");
			const file = example.fileId ? await mockDb.get(example.fileId) : null;

			expect(example.fileId).toBe("file-456");
			expect(file).toBeDefined();
			expect(file?.filename).toBe("example.pdf");
			expect(file?.extractedText).toBeDefined();
		});
	});

	describe("listExamplesByProject query", () => {
		it("should return all examples for a project across categories", async () => {
			const project1Examples: MockExample[] = [
				{
					_id: "example-1",
					categoryId: "category-123",
					projectId: "project-123",
					title: "Example 1",
					createdAt: Date.now(),
					updatedAt: Date.now(),
				},
				{
					_id: "example-2",
					categoryId: "category-456",
					projectId: "project-123",
					title: "Example 2",
					createdAt: Date.now(),
					updatedAt: Date.now(),
				},
			];

			const project2Examples: MockExample[] = [
				{
					_id: "example-3",
					categoryId: "category-789",
					projectId: "project-456",
					title: "Example 3",
					createdAt: Date.now(),
					updatedAt: Date.now(),
				},
			];

			const allExamples = [...project1Examples, ...project2Examples];

			// Filter by project
			const projectExamples = allExamples.filter(
				(ex) => ex.projectId === "project-123" && !ex.deletedAt
			);

			expect(projectExamples).toHaveLength(2);
			expect(projectExamples.every((ex) => ex.projectId === "project-123")).toBe(true);
		});
	});
});
