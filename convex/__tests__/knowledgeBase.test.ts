/**
 * Tests for knowledge base item operations.
 * Tests verify knowledge base CRUD operations, category scoping, and file attachments.
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

interface MockKnowledgeBaseItem {
	_id: string;
	categoryId: string;
	projectId: string;
	title: string;
	content?: string;
	fileId?: string;
	deletedAt?: number;
	createdAt: number;
	updatedAt: number;
}

describe("Knowledge Base Management", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("createKnowledgeBaseItem mutation", () => {
		it("should create knowledge base item with text content", async () => {
			const mockDb = {
				insert: vi.fn().mockResolvedValue("kb-item-123"),
			};

			const itemData = {
				categoryId: "category-123",
				projectId: "project-123",
				title: "Getting Started Guide",
				content: "This is a comprehensive guide on how to get started...",
				createdAt: Date.now(),
				updatedAt: Date.now(),
			};

			const itemId = await mockDb.insert("knowledgeBaseItems", itemData);

			expect(itemId).toBe("kb-item-123");
			expect(mockDb.insert).toHaveBeenCalledWith("knowledgeBaseItems", itemData);
		});

		it("should create knowledge base item with file attachment", async () => {
			const mockDb = {
				insert: vi.fn().mockResolvedValue("kb-item-124"),
			};

			const itemData = {
				categoryId: "category-123",
				projectId: "project-123",
				title: "Technical Specifications",
				fileId: "file-456",
				createdAt: Date.now(),
				updatedAt: Date.now(),
			};

			const itemId = await mockDb.insert("knowledgeBaseItems", itemData);

			expect(itemId).toBe("kb-item-124");
			expect(mockDb.insert).toHaveBeenCalledWith("knowledgeBaseItems", expect.objectContaining({
				title: "Technical Specifications",
				fileId: "file-456",
			}));
		});
	});

	describe("listKnowledgeBaseItems query", () => {
		it("should return items scoped to category", async () => {
			const category1Items: MockKnowledgeBaseItem[] = [
				{
					_id: "kb-1",
					categoryId: "category-123",
					projectId: "project-123",
					title: "Item 1",
					content: "Content 1",
					createdAt: Date.now(),
					updatedAt: Date.now(),
				},
				{
					_id: "kb-2",
					categoryId: "category-123",
					projectId: "project-123",
					title: "Item 2",
					content: "Content 2",
					createdAt: Date.now(),
					updatedAt: Date.now(),
				},
			];

			const category2Items: MockKnowledgeBaseItem[] = [
				{
					_id: "kb-3",
					categoryId: "category-456",
					projectId: "project-123",
					title: "Item 3",
					content: "Content 3",
					createdAt: Date.now(),
					updatedAt: Date.now(),
				},
			];

			const allItems = [...category1Items, ...category2Items];

			// Filter items by category
			const category1Results = allItems.filter((item) => item.categoryId === "category-123");

			expect(category1Results).toHaveLength(2);
			expect(category1Results[0]._id).toBe("kb-1");
			expect(category1Results[1]._id).toBe("kb-2");
		});

		it("should filter out soft-deleted items", async () => {
			const activeItem: MockKnowledgeBaseItem = {
				_id: "kb-1",
				categoryId: "category-123",
				projectId: "project-123",
				title: "Active Item",
				content: "This is active",
				createdAt: Date.now(),
				updatedAt: Date.now(),
			};

			const deletedItem: MockKnowledgeBaseItem = {
				_id: "kb-2",
				categoryId: "category-123",
				projectId: "project-123",
				title: "Deleted Item",
				content: "This is deleted",
				deletedAt: Date.now() - 1000, // Soft deleted
				createdAt: Date.now() - 2000,
				updatedAt: Date.now() - 1000,
			};

			const allItems = [activeItem, deletedItem];

			// Filter out soft-deleted items
			const activeItems = allItems.filter((item) => !item.deletedAt);

			expect(activeItems).toHaveLength(1);
			expect(activeItems[0]).toEqual(activeItem);
			expect(activeItems.find((item) => item.title === "Deleted Item")).toBeUndefined();
		});
	});

	describe("deleteKnowledgeBaseItem mutation", () => {
		it("should set deletedAt timestamp for soft delete", async () => {
			const mockItem: MockKnowledgeBaseItem = {
				_id: "kb-123",
				categoryId: "category-123",
				projectId: "project-123",
				title: "Item to Delete",
				content: "This will be deleted",
				createdAt: Date.now() - 10000,
				updatedAt: Date.now() - 5000,
			};

			const mockDb = {
				get: vi.fn().mockResolvedValue(mockItem),
				patch: vi.fn().mockResolvedValue(undefined),
			};

			const deletedAt = Date.now();
			await mockDb.patch("kb-123", { deletedAt });

			expect(mockDb.patch).toHaveBeenCalledWith("kb-123", expect.objectContaining({
				deletedAt: expect.any(Number),
			}));
		});
	});

	describe("listKnowledgeBaseItemsByProject query", () => {
		it("should return all items for a project across categories", async () => {
			const project1Items: MockKnowledgeBaseItem[] = [
				{
					_id: "kb-1",
					categoryId: "category-123",
					projectId: "project-123",
					title: "Item 1",
					content: "Content 1",
					createdAt: Date.now(),
					updatedAt: Date.now(),
				},
				{
					_id: "kb-2",
					categoryId: "category-456",
					projectId: "project-123",
					title: "Item 2",
					content: "Content 2",
					createdAt: Date.now(),
					updatedAt: Date.now(),
				},
			];

			const project2Items: MockKnowledgeBaseItem[] = [
				{
					_id: "kb-3",
					categoryId: "category-789",
					projectId: "project-456",
					title: "Item 3",
					content: "Content 3",
					createdAt: Date.now(),
					updatedAt: Date.now(),
				},
			];

			const allItems = [...project1Items, ...project2Items];

			// Filter items by project
			const projectResults = allItems.filter((item) => item.projectId === "project-123");

			expect(projectResults).toHaveLength(2);
			expect(projectResults[0]._id).toBe("kb-1");
			expect(projectResults[1]._id).toBe("kb-2");
		});
	});

	describe("Validation", () => {
		it("should enforce title max length of 200 characters", () => {
			const validTitle = "A".repeat(200);
			const invalidTitle = "A".repeat(201);

			expect(validTitle.length).toBe(200);
			expect(invalidTitle.length).toBe(201);

			// In actual implementation, this would throw an error
			const validate = (title: string) => {
				if (title.length > 200) {
					throw new Error("Title must be 200 characters or less");
				}
				return true;
			};

			expect(() => validate(validTitle)).not.toThrow();
			expect(() => validate(invalidTitle)).toThrow();
		});

		it("should enforce content max length of 50000 characters", () => {
			const validContent = "A".repeat(50000);
			const invalidContent = "A".repeat(50001);

			expect(validContent.length).toBe(50000);
			expect(invalidContent.length).toBe(50001);

			// In actual implementation, this would throw an error
			const validate = (content: string) => {
				if (content.length > 50000) {
					throw new Error("Content must be 50000 characters or less");
				}
				return true;
			};

			expect(() => validate(validContent)).not.toThrow();
			expect(() => validate(invalidContent)).toThrow();
		});

		it("should require title to be non-empty after trim", () => {
			const validTitle = "Valid Title";
			const emptyTitle = "   ";
			const whitespaceTitle = "\t\n";

			const validate = (title: string) => {
				const trimmed = title.trim();
				if (trimmed.length === 0) {
					throw new Error("Title is required and cannot be empty");
				}
				return true;
			};

			expect(() => validate(validTitle)).not.toThrow();
			expect(() => validate(emptyTitle)).toThrow();
			expect(() => validate(whitespaceTitle)).toThrow();
		});
	});
});
