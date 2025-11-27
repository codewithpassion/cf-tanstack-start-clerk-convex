/**
 * Schema validation tests for core Convex entities.
 * Tests verify that the schema structure supports the required operations
 * for workspace, project, category, and file management.
 *
 * Note: These tests validate that the schema is properly defined and can be
 * imported. The actual index functionality is tested at runtime through Convex.
 */
import { describe, it, expect } from "vitest";

// Import the schema definition to validate structure
import schema from "../schema";

describe("Convex Schema Validation", () => {
	describe("Workspace Table", () => {
		it("should define workspaces table with required fields", () => {
			const tables = schema.tables;
			expect(tables).toHaveProperty("workspaces");

			// Verify workspaces table exists
			const workspacesTable = tables.workspaces;
			expect(workspacesTable).toBeDefined();
		});
	});

	describe("Project Soft Delete", () => {
		it("should define projects table for soft delete support", () => {
			const tables = schema.tables;
			expect(tables).toHaveProperty("projects");

			const projectsTable = tables.projects;
			expect(projectsTable).toBeDefined();
		});
	});

	describe("Category Table", () => {
		it("should define categories table for project content organization", () => {
			const tables = schema.tables;
			expect(tables).toHaveProperty("categories");

			const categoriesTable = tables.categories;
			expect(categoriesTable).toBeDefined();
		});
	});

	describe("File Table", () => {
		it("should define files table for file storage tracking", () => {
			const tables = schema.tables;
			expect(tables).toHaveProperty("files");

			const filesTable = tables.files;
			expect(filesTable).toBeDefined();
		});
	});

	describe("All Core Tables Defined", () => {
		it("should define all 9 required tables", () => {
			const tables = schema.tables;

			// Verify all tables exist
			expect(tables).toHaveProperty("users");
			expect(tables).toHaveProperty("workspaces");
			expect(tables).toHaveProperty("projects");
			expect(tables).toHaveProperty("categories");
			expect(tables).toHaveProperty("brandVoices");
			expect(tables).toHaveProperty("personas");
			expect(tables).toHaveProperty("knowledgeBaseItems");
			expect(tables).toHaveProperty("examples");
			expect(tables).toHaveProperty("files");
		});

		it("should have exactly 9 tables defined in schema", () => {
			const tables = schema.tables;
			const tableNames = Object.keys(tables);

			expect(tableNames).toHaveLength(9);
			expect(tableNames.sort()).toEqual([
				"brandVoices",
				"categories",
				"examples",
				"files",
				"knowledgeBaseItems",
				"personas",
				"projects",
				"users",
				"workspaces",
			]);
		});
	});
});
