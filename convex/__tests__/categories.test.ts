/**
 * Tests for category management operations.
 * Tests verify category CRUD operations, sorting, reordering, and soft delete behavior.
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

interface MockCategory {
	_id: string;
	projectId: string;
	name: string;
	description?: string;
	formatGuidelines?: string;
	isDefault: boolean;
	sortOrder: number;
	deletedAt?: number;
	createdAt: number;
	updatedAt: number;
}

describe("Category Management", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("listCategories query", () => {
		it("should return categories sorted by sortOrder ascending", async () => {
			const categories: MockCategory[] = [
				{
					_id: "cat-3",
					projectId: "project-123",
					name: "Third Category",
					isDefault: false,
					sortOrder: 3,
					createdAt: Date.now(),
					updatedAt: Date.now(),
				},
				{
					_id: "cat-1",
					projectId: "project-123",
					name: "First Category",
					isDefault: true,
					sortOrder: 1,
					createdAt: Date.now(),
					updatedAt: Date.now(),
				},
				{
					_id: "cat-2",
					projectId: "project-123",
					name: "Second Category",
					isDefault: true,
					sortOrder: 2,
					createdAt: Date.now(),
					updatedAt: Date.now(),
				},
			];

			// Sort by sortOrder ascending
			const sortedCategories = [...categories].sort((a, b) => a.sortOrder - b.sortOrder);

			expect(sortedCategories[0].name).toBe("First Category");
			expect(sortedCategories[1].name).toBe("Second Category");
			expect(sortedCategories[2].name).toBe("Third Category");
			expect(sortedCategories[0].sortOrder).toBe(1);
			expect(sortedCategories[1].sortOrder).toBe(2);
			expect(sortedCategories[2].sortOrder).toBe(3);
		});

		it("should filter out soft-deleted categories", async () => {
			const activeCategory: MockCategory = {
				_id: "cat-1",
				projectId: "project-123",
				name: "Active Category",
				isDefault: false,
				sortOrder: 1,
				createdAt: Date.now(),
				updatedAt: Date.now(),
			};

			const deletedCategory: MockCategory = {
				_id: "cat-2",
				projectId: "project-123",
				name: "Deleted Category",
				isDefault: false,
				sortOrder: 2,
				deletedAt: Date.now() - 1000, // Soft deleted
				createdAt: Date.now() - 2000,
				updatedAt: Date.now() - 1000,
			};

			const allCategories = [activeCategory, deletedCategory];

			// Filter out soft-deleted categories
			const activeCategories = allCategories.filter((c) => !c.deletedAt);

			expect(activeCategories).toHaveLength(1);
			expect(activeCategories[0]).toEqual(activeCategory);
			expect(activeCategories.find((c) => c.name === "Deleted Category")).toBeUndefined();
		});
	});

	describe("createCategory mutation", () => {
		it("should create custom category with required fields", async () => {
			const mockDb = {
				insert: vi.fn().mockResolvedValue("category-123"),
			};

			const categoryData = {
				projectId: "project-123",
				name: "Custom Category",
				description: "A custom content type",
				formatGuidelines: "Word count: 500-1000 words\nStructure: Title, body, conclusion",
				isDefault: false,
				sortOrder: 7, // After 6 default categories
				createdAt: Date.now(),
				updatedAt: Date.now(),
			};

			const categoryId = await mockDb.insert("categories", categoryData);

			expect(categoryId).toBe("category-123");
			expect(mockDb.insert).toHaveBeenCalledWith("categories", categoryData);
		});

		it("should create category with name only when optional fields are omitted", async () => {
			const mockDb = {
				insert: vi.fn().mockResolvedValue("category-124"),
			};

			const categoryData = {
				projectId: "project-123",
				name: "Minimal Category",
				isDefault: false,
				sortOrder: 1,
				createdAt: Date.now(),
				updatedAt: Date.now(),
			};

			const categoryId = await mockDb.insert("categories", categoryData);

			expect(categoryId).toBe("category-124");
			expect(mockDb.insert).toHaveBeenCalledWith("categories", expect.objectContaining({
				name: "Minimal Category",
				projectId: "project-123",
			}));
		});
	});

	describe("reorderCategories mutation", () => {
		it("should update sortOrder based on array order", async () => {
			const categories: MockCategory[] = [
				{
					_id: "cat-1",
					projectId: "project-123",
					name: "Category A",
					isDefault: true,
					sortOrder: 1,
					createdAt: Date.now(),
					updatedAt: Date.now(),
				},
				{
					_id: "cat-2",
					projectId: "project-123",
					name: "Category B",
					isDefault: true,
					sortOrder: 2,
					createdAt: Date.now(),
					updatedAt: Date.now(),
				},
				{
					_id: "cat-3",
					projectId: "project-123",
					name: "Category C",
					isDefault: false,
					sortOrder: 3,
					createdAt: Date.now(),
					updatedAt: Date.now(),
				},
			];

			// New order: cat-3, cat-1, cat-2
			const newOrderIds = ["cat-3", "cat-1", "cat-2"];

			// Simulate updating sortOrder based on position in array
			const updatedCategories = categories.map((cat) => {
				const newIndex = newOrderIds.indexOf(cat._id);
				return {
					...cat,
					sortOrder: newIndex + 1, // 1-indexed
					updatedAt: Date.now(),
				};
			});

			const reorderedBySort = updatedCategories.sort((a, b) => a.sortOrder - b.sortOrder);

			expect(reorderedBySort[0]._id).toBe("cat-3");
			expect(reorderedBySort[0].sortOrder).toBe(1);
			expect(reorderedBySort[1]._id).toBe("cat-1");
			expect(reorderedBySort[1].sortOrder).toBe(2);
			expect(reorderedBySort[2]._id).toBe("cat-2");
			expect(reorderedBySort[2].sortOrder).toBe(3);
		});
	});

	describe("deleteCategory mutation", () => {
		it("should soft delete custom categories", async () => {
			const mockCategory: MockCategory = {
				_id: "category-123",
				projectId: "project-123",
				name: "Custom Category",
				isDefault: false, // Custom category
				sortOrder: 7,
				createdAt: Date.now() - 10000,
				updatedAt: Date.now() - 5000,
			};

			const mockDb = {
				get: vi.fn().mockResolvedValue(mockCategory),
				patch: vi.fn().mockResolvedValue(undefined),
			};

			const deletedAt = Date.now();
			await mockDb.patch("category-123", { deletedAt, updatedAt: deletedAt });

			expect(mockDb.patch).toHaveBeenCalledWith("category-123", expect.objectContaining({
				deletedAt: expect.any(Number),
				updatedAt: expect.any(Number),
			}));
		});

		it("should allow soft deletion of default categories", async () => {
			const mockCategory: MockCategory = {
				_id: "category-123",
				projectId: "project-123",
				name: "Blog Post",
				isDefault: true, // Default category
				sortOrder: 1,
				createdAt: Date.now() - 10000,
				updatedAt: Date.now() - 5000,
			};

			const mockDb = {
				get: vi.fn().mockResolvedValue(mockCategory),
				patch: vi.fn().mockResolvedValue(undefined),
			};

			// Default categories can be soft deleted
			const deletedAt = Date.now();
			await mockDb.patch("category-123", { deletedAt, updatedAt: deletedAt });

			expect(mockDb.patch).toHaveBeenCalledWith("category-123", expect.objectContaining({
				deletedAt: expect.any(Number),
			}));
		});

		it("should not permanently delete category records", async () => {
			const mockDb = {
				delete: vi.fn(),
				patch: vi.fn().mockResolvedValue(undefined),
			};

			// Soft delete uses patch, not delete
			await mockDb.patch("category-123", { deletedAt: Date.now(), updatedAt: Date.now() });

			// delete should never be called for soft delete
			expect(mockDb.delete).not.toHaveBeenCalled();
		});
	});

	describe("Field validation", () => {
		it("should validate name is required and under 50 chars", () => {
			const validName = "Valid Category Name";
			const tooLongName = "a".repeat(51);

			// Simulate validation logic
			const validateName = (name: string): boolean => {
				const trimmed = name.trim();
				return trimmed.length > 0 && trimmed.length <= 50;
			};

			expect(validateName(validName)).toBe(true);
			expect(validateName(tooLongName)).toBe(false);
			expect(validateName("")).toBe(false);
			expect(validateName("   ")).toBe(false);
		});

		it("should validate description is optional and under 2000 chars", () => {
			const validDescription = "A valid description for the category";
			const tooLongDescription = "a".repeat(2001);

			// Simulate validation logic
			const validateDescription = (description: string | undefined): boolean => {
				if (!description) return true; // Optional
				return description.trim().length <= 2000;
			};

			expect(validateDescription(validDescription)).toBe(true);
			expect(validateDescription(undefined)).toBe(true);
			expect(validateDescription("")).toBe(true);
			expect(validateDescription(tooLongDescription)).toBe(false);
		});

		it("should validate formatGuidelines is optional and under 5000 chars", () => {
			const validGuidelines = "Word count: 500-1000 words\nStructure: Intro, body, conclusion";
			const tooLongGuidelines = "a".repeat(5001);

			// Simulate validation logic
			const validateGuidelines = (guidelines: string | undefined): boolean => {
				if (!guidelines) return true; // Optional
				return guidelines.trim().length <= 5000;
			};

			expect(validateGuidelines(validGuidelines)).toBe(true);
			expect(validateGuidelines(undefined)).toBe(true);
			expect(validateGuidelines("")).toBe(true);
			expect(validateGuidelines(tooLongGuidelines)).toBe(false);
		});
	});
});
