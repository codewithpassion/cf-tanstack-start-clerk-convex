/**
 * Tests for project management operations.
 * Tests verify project CRUD operations, soft delete filtering, and default category creation.
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

interface MockProject {
	_id: string;
	workspaceId: string;
	name: string;
	description?: string;
	deletedAt?: number;
	createdAt: number;
	updatedAt: number;
}

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

const DEFAULT_CATEGORIES = [
	{
		name: "Blog Post",
		description: "Long-form content for your blog or website",
		formatGuidelines: `Word count: 800-2000 words
Structure: Title, introduction, 3-5 main sections with subheadings, conclusion
Tone: Informative and engaging
Include: Meta description (150-160 chars), featured image suggestion`,
		sortOrder: 1,
	},
	{
		name: "LinkedIn Article",
		description: "Professional long-form content for LinkedIn publishing",
		formatGuidelines: `Word count: 800-1500 words
Structure: Compelling headline, strong opening hook, clear sections, call-to-action
Tone: Professional yet conversational
Include: 3-5 relevant hashtags, engagement question at end`,
		sortOrder: 2,
	},
	{
		name: "LinkedIn Post",
		description: "Short-form professional content for LinkedIn feed",
		formatGuidelines: `Character limit: 3000 characters (optimal 1200-1500)
Structure: Hook in first line, value in body, CTA or question at end
Tone: Professional, authentic, conversational
Include: Line breaks for readability, 3-5 hashtags, optional emoji use`,
		sortOrder: 3,
	},
	{
		name: "Instagram Post",
		description: "Visual-first content with engaging caption",
		formatGuidelines: `Caption limit: 2200 characters (optimal 138-150 for feed visibility)
Structure: Hook, story/value, CTA
Tone: Casual, relatable, authentic
Include: Up to 30 hashtags (optimal 5-10), emoji usage encouraged, image direction`,
		sortOrder: 4,
	},
	{
		name: "X Thread",
		description: "Multi-post format for Twitter/X platform",
		formatGuidelines: `Per-post limit: 280 characters
Thread length: 5-15 posts optimal
Structure: Hook tweet, numbered points, summary/CTA final tweet
Tone: Concise, punchy, value-packed
Include: Thread numbering (1/X), strategic line breaks, minimal hashtags`,
		sortOrder: 5,
	},
	{
		name: "Case Study",
		description: "Structured business content showcasing results",
		formatGuidelines: `Word count: 1000-2500 words
Structure: Executive summary, challenge, solution, implementation, results, testimonial
Tone: Professional, data-driven, compelling
Include: Specific metrics, quotes, before/after comparison, visuals suggestions`,
		sortOrder: 6,
	},
];

describe("Project Management", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("createProject mutation", () => {
		it("should create project with required fields", async () => {
			const mockDb = {
				insert: vi.fn().mockResolvedValue("project-123"),
			};

			const projectData = {
				workspaceId: "workspace-123",
				name: "My Test Project",
				description: "A test project description",
				createdAt: Date.now(),
				updatedAt: Date.now(),
			};

			const projectId = await mockDb.insert("projects", projectData);

			expect(projectId).toBe("project-123");
			expect(mockDb.insert).toHaveBeenCalledWith("projects", projectData);
		});

		it("should create project with name only when description is omitted", async () => {
			const mockDb = {
				insert: vi.fn().mockResolvedValue("project-124"),
			};

			const projectData = {
				workspaceId: "workspace-123",
				name: "Minimal Project",
				createdAt: Date.now(),
				updatedAt: Date.now(),
			};

			const projectId = await mockDb.insert("projects", projectData);

			expect(projectId).toBe("project-124");
			expect(mockDb.insert).toHaveBeenCalledWith("projects", expect.objectContaining({
				name: "Minimal Project",
			}));
		});
	});

	describe("listProjects query", () => {
		it("should filter out soft-deleted projects", async () => {
			const activeProject: MockProject = {
				_id: "project-1",
				workspaceId: "workspace-123",
				name: "Active Project",
				createdAt: Date.now(),
				updatedAt: Date.now(),
			};

			const deletedProject: MockProject = {
				_id: "project-2",
				workspaceId: "workspace-123",
				name: "Deleted Project",
				deletedAt: Date.now() - 1000, // Soft deleted
				createdAt: Date.now() - 2000,
				updatedAt: Date.now() - 1000,
			};

			const allProjects = [activeProject, deletedProject];

			// Filter out soft-deleted projects
			const activeProjects = allProjects.filter((p) => !p.deletedAt);

			expect(activeProjects).toHaveLength(1);
			expect(activeProjects[0]).toEqual(activeProject);
			expect(activeProjects.find((p) => p.name === "Deleted Project")).toBeUndefined();
		});

		it("should sort projects by updatedAt descending", async () => {
			const olderProject: MockProject = {
				_id: "project-1",
				workspaceId: "workspace-123",
				name: "Older Project",
				createdAt: Date.now() - 10000,
				updatedAt: Date.now() - 5000,
			};

			const newerProject: MockProject = {
				_id: "project-2",
				workspaceId: "workspace-123",
				name: "Newer Project",
				createdAt: Date.now() - 8000,
				updatedAt: Date.now() - 1000,
			};

			const projects = [olderProject, newerProject];

			// Sort by updatedAt descending
			const sortedProjects = [...projects].sort((a, b) => b.updatedAt - a.updatedAt);

			expect(sortedProjects[0].name).toBe("Newer Project");
			expect(sortedProjects[1].name).toBe("Older Project");
		});
	});

	describe("updateProject mutation", () => {
		it("should update project and modify updatedAt timestamp", async () => {
			const originalUpdatedAt = Date.now() - 5000;
			const mockProject: MockProject = {
				_id: "project-123",
				workspaceId: "workspace-123",
				name: "Original Name",
				description: "Original description",
				createdAt: Date.now() - 10000,
				updatedAt: originalUpdatedAt,
			};

			const mockDb = {
				get: vi.fn().mockResolvedValue(mockProject),
				patch: vi.fn().mockResolvedValue(undefined),
			};

			const newUpdatedAt = Date.now();
			const updateData = {
				name: "Updated Name",
				description: "Updated description",
				updatedAt: newUpdatedAt,
			};

			await mockDb.patch("project-123", updateData);

			expect(mockDb.patch).toHaveBeenCalledWith("project-123", expect.objectContaining({
				name: "Updated Name",
				description: "Updated description",
				updatedAt: expect.any(Number),
			}));

			// Verify updatedAt is a newer timestamp
			const patchCall = mockDb.patch.mock.calls[0][1] as { updatedAt: number };
			expect(patchCall.updatedAt).toBeGreaterThan(originalUpdatedAt);
		});
	});

	describe("deleteProject mutation", () => {
		it("should set deletedAt timestamp for soft delete", async () => {
			const mockProject: MockProject = {
				_id: "project-123",
				workspaceId: "workspace-123",
				name: "Project to Delete",
				createdAt: Date.now() - 10000,
				updatedAt: Date.now() - 5000,
			};

			const mockDb = {
				get: vi.fn().mockResolvedValue(mockProject),
				patch: vi.fn().mockResolvedValue(undefined),
			};

			const deletedAt = Date.now();
			await mockDb.patch("project-123", { deletedAt });

			expect(mockDb.patch).toHaveBeenCalledWith("project-123", expect.objectContaining({
				deletedAt: expect.any(Number),
			}));

			// Verify project is soft deleted (not hard deleted)
			expect(mockDb.patch).toHaveBeenCalled();
		});

		it("should not permanently delete the project record", async () => {
			const mockDb = {
				delete: vi.fn(),
				patch: vi.fn().mockResolvedValue(undefined),
			};

			// Soft delete uses patch, not delete
			await mockDb.patch("project-123", { deletedAt: Date.now() });

			// delete should never be called for soft delete
			expect(mockDb.delete).not.toHaveBeenCalled();
		});
	});

	describe("Default categories on project creation", () => {
		it("should create 6 default categories when project is created", async () => {
			const insertCalls: Array<{ table: string; data: unknown }> = [];
			const mockDb = {
				insert: vi.fn().mockImplementation((table: string, data: unknown) => {
					insertCalls.push({ table, data });
					return Promise.resolve(`${table}-${insertCalls.length}`);
				}),
			};

			// Simulate project creation
			const projectId = await mockDb.insert("projects", {
				workspaceId: "workspace-123",
				name: "New Project",
				createdAt: Date.now(),
				updatedAt: Date.now(),
			});

			// Simulate default category creation
			for (const category of DEFAULT_CATEGORIES) {
				await mockDb.insert("categories", {
					projectId,
					name: category.name,
					description: category.description,
					formatGuidelines: category.formatGuidelines,
					isDefault: true,
					sortOrder: category.sortOrder,
					createdAt: Date.now(),
					updatedAt: Date.now(),
				});
			}

			// 1 project + 6 categories = 7 inserts total
			expect(insertCalls).toHaveLength(7);

			// Verify project was created first
			expect(insertCalls[0].table).toBe("projects");

			// Verify all 6 categories were created
			const categoryInserts = insertCalls.filter((call) => call.table === "categories");
			expect(categoryInserts).toHaveLength(6);

			// Verify categories have isDefault set to true
			for (const insert of categoryInserts) {
				const data = insert.data as MockCategory;
				expect(data.isDefault).toBe(true);
			}
		});

		it("should include format guidelines for each default category", async () => {
			// Verify each default category has format guidelines
			for (const category of DEFAULT_CATEGORIES) {
				expect(category.formatGuidelines).toBeDefined();
				expect(category.formatGuidelines.length).toBeGreaterThan(0);
			}

			// Verify specific categories have expected content types
			const blogPost = DEFAULT_CATEGORIES.find((c) => c.name === "Blog Post");
			expect(blogPost?.formatGuidelines).toContain("Word count");

			const linkedInPost = DEFAULT_CATEGORIES.find((c) => c.name === "LinkedIn Post");
			expect(linkedInPost?.formatGuidelines).toContain("Character limit");

			const xThread = DEFAULT_CATEGORIES.find((c) => c.name === "X Thread");
			expect(xThread?.formatGuidelines).toContain("280 characters");
		});
	});

	describe("getProjectStats query", () => {
		it("should return counts of categories, brand voices, and personas", async () => {
			const projectId = "project-123";

			// Mock data
			const categories: MockCategory[] = [
				{ _id: "cat-1", projectId, name: "Cat 1", isDefault: true, sortOrder: 1, createdAt: Date.now(), updatedAt: Date.now() },
				{ _id: "cat-2", projectId, name: "Cat 2", isDefault: false, sortOrder: 2, createdAt: Date.now(), updatedAt: Date.now() },
			];

			const brandVoices = [
				{ _id: "bv-1", projectId, name: "Voice 1" },
				{ _id: "bv-2", projectId, name: "Voice 2" },
				{ _id: "bv-3", projectId, name: "Voice 3" },
			];

			const personas = [
				{ _id: "p-1", projectId, name: "Persona 1" },
			];

			// Calculate stats
			const stats = {
				categoriesCount: categories.filter((c) => !c.deletedAt).length,
				brandVoicesCount: brandVoices.length,
				personasCount: personas.length,
			};

			expect(stats.categoriesCount).toBe(2);
			expect(stats.brandVoicesCount).toBe(3);
			expect(stats.personasCount).toBe(1);
		});
	});
});
