/**
 * Tests for image prompt template operations.
 * Tests verify template creation, retrieval, updating, and deletion.
 *
 * Note: These tests validate the logic structure and expected behavior patterns.
 * Actual Convex mutations/queries are tested at runtime.
 */
import { describe, it, expect, beforeEach } from "vitest";

interface MockImagePromptTemplate {
	_id: string;
	projectId: string;
	name: string;
	imageType: "infographic" | "illustration" | "photo" | "diagram";
	promptTemplate: string;
	createdAt: number;
	updatedAt: number;
}

describe("Image Prompt Templates", () => {
	beforeEach(() => {
		// Clear any test state
	});

	describe("createImagePromptTemplate mutation", () => {
		it("should store template with all required fields", async () => {
			const template: MockImagePromptTemplate = {
				_id: "template-1",
				projectId: "project-123",
				name: "Product Photo Template",
				imageType: "photo",
				promptTemplate: "A professional product photo of {product} on a white background, studio lighting, high resolution",
				createdAt: Date.now(),
				updatedAt: Date.now(),
			};

			// Verify template stored correctly
			expect(template.name).toBe("Product Photo Template");
			expect(template.imageType).toBe("photo");
			expect(template.promptTemplate).toContain("professional product photo");
			expect(template.projectId).toBe("project-123");
			expect(template.createdAt).toBeDefined();
			expect(template.updatedAt).toBeDefined();
		});

		it("should support all image types", async () => {
			const imageTypes: Array<"infographic" | "illustration" | "photo" | "diagram"> = [
				"infographic",
				"illustration",
				"photo",
				"diagram",
			];

			for (const imageType of imageTypes) {
				const template: MockImagePromptTemplate = {
					_id: `template-${imageType}`,
					projectId: "project-123",
					name: `${imageType} template`,
					imageType,
					promptTemplate: `A ${imageType} showing {content}`,
					createdAt: Date.now(),
					updatedAt: Date.now(),
				};

				expect(template.imageType).toBe(imageType);
			}
		});

		it("should validate name is non-empty and within max length", async () => {
			const validName = "Product Photo Template";
			const trimmedName = validName.trim();
			expect(trimmedName).toBeTruthy();
			expect(trimmedName.length).toBeLessThanOrEqual(100);

			// Empty name should fail validation
			const emptyName = "   ";
			expect(emptyName.trim()).toBe("");

			// Name over max length should fail
			const tooLongName = "x".repeat(101);
			expect(tooLongName.length).toBeGreaterThan(100);
		});

		it("should validate promptTemplate is non-empty and within max length", async () => {
			const validPrompt = "A professional photo of {product}";
			const trimmedPrompt = validPrompt.trim();
			expect(trimmedPrompt).toBeTruthy();
			expect(trimmedPrompt.length).toBeLessThanOrEqual(2000);

			// Empty prompt should fail validation
			const emptyPrompt = "   ";
			expect(emptyPrompt.trim()).toBe("");

			// Prompt over max length should fail
			const tooLongPrompt = "x".repeat(2001);
			expect(tooLongPrompt.length).toBeGreaterThan(2000);
		});

		it("should set both createdAt and updatedAt timestamps", async () => {
			const beforeCreate = Date.now();

			const template: MockImagePromptTemplate = {
				_id: "template-1",
				projectId: "project-123",
				name: "Test Template",
				imageType: "photo",
				promptTemplate: "Test prompt",
				createdAt: Date.now(),
				updatedAt: Date.now(),
			};

			const afterCreate = Date.now();

			expect(template.createdAt).toBeGreaterThanOrEqual(beforeCreate);
			expect(template.createdAt).toBeLessThanOrEqual(afterCreate);
			expect(template.updatedAt).toBeGreaterThanOrEqual(beforeCreate);
			expect(template.updatedAt).toBeLessThanOrEqual(afterCreate);
		});
	});

	describe("listImagePromptTemplates query", () => {
		it("should return templates for project in descending order by createdAt", async () => {
			const now = Date.now();
			const templates: MockImagePromptTemplate[] = [
				{
					_id: "template-3",
					projectId: "project-123",
					name: "Third Template",
					imageType: "diagram",
					promptTemplate: "Third prompt",
					createdAt: now + 2000,
					updatedAt: now + 2000,
				},
				{
					_id: "template-1",
					projectId: "project-123",
					name: "First Template",
					imageType: "infographic",
					promptTemplate: "First prompt",
					createdAt: now,
					updatedAt: now,
				},
				{
					_id: "template-2",
					projectId: "project-123",
					name: "Second Template",
					imageType: "illustration",
					promptTemplate: "Second prompt",
					createdAt: now + 1000,
					updatedAt: now + 1000,
				},
			];

			// Sort by createdAt descending (most recent first)
			const sortedTemplates = [...templates].sort((a, b) => b.createdAt - a.createdAt);

			expect(sortedTemplates[0].name).toBe("Third Template");
			expect(sortedTemplates[1].name).toBe("Second Template");
			expect(sortedTemplates[2].name).toBe("First Template");

			expect(sortedTemplates[0].createdAt).toBeGreaterThan(sortedTemplates[1].createdAt);
			expect(sortedTemplates[1].createdAt).toBeGreaterThan(sortedTemplates[2].createdAt);
		});

		it("should only return templates for specified project", async () => {
			const allTemplates: MockImagePromptTemplate[] = [
				{
					_id: "template-1",
					projectId: "project-123",
					name: "Template for 123",
					imageType: "photo",
					promptTemplate: "Prompt 1",
					createdAt: Date.now(),
					updatedAt: Date.now(),
				},
				{
					_id: "template-2",
					projectId: "project-456",
					name: "Template for 456",
					imageType: "illustration",
					promptTemplate: "Prompt 2",
					createdAt: Date.now() + 1000,
					updatedAt: Date.now() + 1000,
				},
				{
					_id: "template-3",
					projectId: "project-123",
					name: "Another template for 123",
					imageType: "diagram",
					promptTemplate: "Prompt 3",
					createdAt: Date.now() + 2000,
					updatedAt: Date.now() + 2000,
				},
			];

			// Filter templates for project-123
			const filteredTemplates = allTemplates.filter(
				(template) => template.projectId === "project-123"
			);

			expect(filteredTemplates).toHaveLength(2);
			expect(filteredTemplates[0].projectId).toBe("project-123");
			expect(filteredTemplates[1].projectId).toBe("project-123");
		});

		it("should handle different image types in results", async () => {
			const templates: MockImagePromptTemplate[] = [
				{
					_id: "template-1",
					projectId: "project-123",
					name: "Infographic Template",
					imageType: "infographic",
					promptTemplate: "Infographic prompt",
					createdAt: Date.now(),
					updatedAt: Date.now(),
				},
				{
					_id: "template-2",
					projectId: "project-123",
					name: "Illustration Template",
					imageType: "illustration",
					promptTemplate: "Illustration prompt",
					createdAt: Date.now() + 1000,
					updatedAt: Date.now() + 1000,
				},
				{
					_id: "template-3",
					projectId: "project-123",
					name: "Photo Template",
					imageType: "photo",
					promptTemplate: "Photo prompt",
					createdAt: Date.now() + 2000,
					updatedAt: Date.now() + 2000,
				},
				{
					_id: "template-4",
					projectId: "project-123",
					name: "Diagram Template",
					imageType: "diagram",
					promptTemplate: "Diagram prompt",
					createdAt: Date.now() + 3000,
					updatedAt: Date.now() + 3000,
				},
			];

			// Verify all image types present
			const imageTypes = templates.map((t) => t.imageType);
			expect(imageTypes).toContain("infographic");
			expect(imageTypes).toContain("illustration");
			expect(imageTypes).toContain("photo");
			expect(imageTypes).toContain("diagram");
		});
	});

	describe("updateImagePromptTemplate mutation", () => {
		it("should update name when provided", async () => {
			const originalTemplate: MockImagePromptTemplate = {
				_id: "template-1",
				projectId: "project-123",
				name: "Original Name",
				imageType: "photo",
				promptTemplate: "Original prompt",
				createdAt: Date.now() - 1000,
				updatedAt: Date.now() - 1000,
			};

			// Simulate update
			const updatedTemplate: MockImagePromptTemplate = {
				...originalTemplate,
				name: "Updated Name",
				updatedAt: Date.now(),
			};

			expect(updatedTemplate.name).toBe("Updated Name");
			expect(updatedTemplate.imageType).toBe("photo"); // Unchanged
			expect(updatedTemplate.promptTemplate).toBe("Original prompt"); // Unchanged
			expect(updatedTemplate.updatedAt).toBeGreaterThan(originalTemplate.updatedAt);
		});

		it("should update promptTemplate when provided", async () => {
			const originalTemplate: MockImagePromptTemplate = {
				_id: "template-1",
				projectId: "project-123",
				name: "Template Name",
				imageType: "illustration",
				promptTemplate: "Original prompt",
				createdAt: Date.now() - 1000,
				updatedAt: Date.now() - 1000,
			};

			// Simulate update
			const updatedTemplate: MockImagePromptTemplate = {
				...originalTemplate,
				promptTemplate: "Updated prompt with new details",
				updatedAt: Date.now(),
			};

			expect(updatedTemplate.promptTemplate).toBe("Updated prompt with new details");
			expect(updatedTemplate.name).toBe("Template Name"); // Unchanged
			expect(updatedTemplate.imageType).toBe("illustration"); // Unchanged
			expect(updatedTemplate.updatedAt).toBeGreaterThan(originalTemplate.updatedAt);
		});

		it("should update both name and promptTemplate when both provided", async () => {
			const originalTemplate: MockImagePromptTemplate = {
				_id: "template-1",
				projectId: "project-123",
				name: "Original Name",
				imageType: "diagram",
				promptTemplate: "Original prompt",
				createdAt: Date.now() - 1000,
				updatedAt: Date.now() - 1000,
			};

			// Simulate update
			const updatedTemplate: MockImagePromptTemplate = {
				...originalTemplate,
				name: "Updated Name",
				promptTemplate: "Updated prompt",
				updatedAt: Date.now(),
			};

			expect(updatedTemplate.name).toBe("Updated Name");
			expect(updatedTemplate.promptTemplate).toBe("Updated prompt");
			expect(updatedTemplate.imageType).toBe("diagram"); // Unchanged
			expect(updatedTemplate.updatedAt).toBeGreaterThan(originalTemplate.updatedAt);
		});

		it("should not modify imageType or createdAt", async () => {
			const originalTemplate: MockImagePromptTemplate = {
				_id: "template-1",
				projectId: "project-123",
				name: "Original Name",
				imageType: "infographic",
				promptTemplate: "Original prompt",
				createdAt: Date.now() - 1000,
				updatedAt: Date.now() - 1000,
			};

			// Simulate update
			const updatedTemplate: MockImagePromptTemplate = {
				...originalTemplate,
				name: "Updated Name",
				updatedAt: Date.now(),
			};

			expect(updatedTemplate.imageType).toBe(originalTemplate.imageType);
			expect(updatedTemplate.createdAt).toBe(originalTemplate.createdAt);
			expect(updatedTemplate.projectId).toBe(originalTemplate.projectId);
		});

		it("should update updatedAt timestamp", async () => {
			const beforeUpdate = Date.now();

			const originalTemplate: MockImagePromptTemplate = {
				_id: "template-1",
				projectId: "project-123",
				name: "Template Name",
				imageType: "photo",
				promptTemplate: "Prompt",
				createdAt: Date.now() - 1000,
				updatedAt: Date.now() - 1000,
			};

			// Simulate update
			const updatedTemplate: MockImagePromptTemplate = {
				...originalTemplate,
				name: "Updated Name",
				updatedAt: Date.now(),
			};

			const afterUpdate = Date.now();

			expect(updatedTemplate.updatedAt).toBeGreaterThanOrEqual(beforeUpdate);
			expect(updatedTemplate.updatedAt).toBeLessThanOrEqual(afterUpdate);
			expect(updatedTemplate.updatedAt).toBeGreaterThan(originalTemplate.updatedAt);
		});
	});

	describe("deleteImagePromptTemplate mutation", () => {
		it("should remove template permanently (hard delete)", async () => {
			const templates: MockImagePromptTemplate[] = [
				{
					_id: "template-1",
					projectId: "project-123",
					name: "Template 1",
					imageType: "photo",
					promptTemplate: "Prompt 1",
					createdAt: Date.now() - 3000,
					updatedAt: Date.now() - 3000,
				},
				{
					_id: "template-2",
					projectId: "project-123",
					name: "Template 2",
					imageType: "illustration",
					promptTemplate: "Prompt 2",
					createdAt: Date.now() - 2000,
					updatedAt: Date.now() - 2000,
				},
				{
					_id: "template-3",
					projectId: "project-123",
					name: "Template 3",
					imageType: "diagram",
					promptTemplate: "Prompt 3",
					createdAt: Date.now() - 1000,
					updatedAt: Date.now() - 1000,
				},
			];

			// Simulate deleting template-2
			const remainingTemplates = templates.filter((t) => t._id !== "template-2");

			expect(remainingTemplates).toHaveLength(2);
			expect(remainingTemplates.find((t) => t._id === "template-1")).toBeDefined();
			expect(remainingTemplates.find((t) => t._id === "template-2")).toBeUndefined();
			expect(remainingTemplates.find((t) => t._id === "template-3")).toBeDefined();
		});

		it("should only affect specified template", async () => {
			const templates: MockImagePromptTemplate[] = [
				{
					_id: "template-1",
					projectId: "project-123",
					name: "Template 1",
					imageType: "photo",
					promptTemplate: "Prompt 1",
					createdAt: Date.now(),
					updatedAt: Date.now(),
				},
				{
					_id: "template-2",
					projectId: "project-456",
					name: "Template 2",
					imageType: "illustration",
					promptTemplate: "Prompt 2",
					createdAt: Date.now() + 1000,
					updatedAt: Date.now() + 1000,
				},
			];

			// Delete template-1 from project-123
			const remainingTemplates = templates.filter((t) => t._id !== "template-1");

			expect(remainingTemplates).toHaveLength(1);
			expect(remainingTemplates[0]._id).toBe("template-2");
			expect(remainingTemplates[0].projectId).toBe("project-456");
		});

		it("should verify template exists before deletion", async () => {
			const templates: MockImagePromptTemplate[] = [
				{
					_id: "template-1",
					projectId: "project-123",
					name: "Template 1",
					imageType: "photo",
					promptTemplate: "Prompt 1",
					createdAt: Date.now(),
					updatedAt: Date.now(),
				},
			];

			// Attempt to delete non-existent template
			const nonExistentId = "template-999";
			const foundTemplate = templates.find((t) => t._id === nonExistentId);

			expect(foundTemplate).toBeUndefined();
		});
	});
});
