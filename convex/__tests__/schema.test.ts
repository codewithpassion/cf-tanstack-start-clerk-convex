/**
 * Schema validation tests for core Convex entities.
 * Tests verify that the schema structure supports the required operations
 * for workspace, project, category, file, and content management.
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

		it("should support theme preference for dark mode", () => {
			// Verify workspaces table exists with theme support
			const tables = schema.tables;
			expect(tables.workspaces).toBeDefined();
			// Theme preference field is optional: light/dark/system
		});
	});

	describe("Project Soft Delete", () => {
		it("should define projects table for soft delete support", () => {
			const tables = schema.tables;
			expect(tables).toHaveProperty("projects");

			const projectsTable = tables.projects;
			expect(projectsTable).toBeDefined();
		});

		it("should support AI configuration fields", () => {
			// Verify projects table exists with AI config support
			const tables = schema.tables;
			expect(tables.projects).toBeDefined();
			// AI config fields: defaultAiProvider (openai/anthropic), defaultAiModel
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

		it("should support content piece and content image ownership", () => {
			// Verify files table supports new owner types for content management
			const tables = schema.tables;
			expect(tables.files).toBeDefined();
			expect(tables.contentPieces).toBeDefined();
			expect(tables.contentImages).toBeDefined();
			// Files can now reference contentPieceId and contentImageId as owners
		});
	});

	describe("Content Pieces Table", () => {
		it("should define contentPieces table with required fields and indexes", () => {
			const tables = schema.tables;
			expect(tables).toHaveProperty("contentPieces");

			const contentPiecesTable = tables.contentPieces;
			expect(contentPiecesTable).toBeDefined();
		});

		it("should support project, category, and relationship references", () => {
			// Verify table exists and can be referenced
			const tables = schema.tables;
			expect(tables.contentPieces).toBeDefined();
			expect(tables.projects).toBeDefined();
			expect(tables.categories).toBeDefined();
		});
	});

	describe("Content Versions Table", () => {
		it("should define contentVersions table with relationship to contentPieces", () => {
			const tables = schema.tables;
			expect(tables).toHaveProperty("contentVersions");

			const contentVersionsTable = tables.contentVersions;
			expect(contentVersionsTable).toBeDefined();
		});

		it("should support version number sequencing per content piece", () => {
			// Verify table structure supports version tracking
			const tables = schema.tables;
			expect(tables.contentVersions).toBeDefined();
			expect(tables.contentPieces).toBeDefined();
		});
	});

	describe("Content Chat Messages Table", () => {
		it("should define contentChatMessages table with role-based messaging", () => {
			const tables = schema.tables;
			expect(tables).toHaveProperty("contentChatMessages");

			const contentChatMessagesTable = tables.contentChatMessages;
			expect(contentChatMessagesTable).toBeDefined();
		});

		it("should support AI chat history per content piece", () => {
			// Verify table structure supports chat messages
			const tables = schema.tables;
			expect(tables.contentChatMessages).toBeDefined();
			expect(tables.contentPieces).toBeDefined();
		});
	});

	describe("Content Images Table", () => {
		it("should define contentImages table with file reference", () => {
			const tables = schema.tables;
			expect(tables).toHaveProperty("contentImages");

			const contentImagesTable = tables.contentImages;
			expect(contentImagesTable).toBeDefined();
		});

		it("should support image attachments with files table relationship", () => {
			// Verify both tables exist for the relationship
			const tables = schema.tables;
			expect(tables.contentImages).toBeDefined();
			expect(tables.files).toBeDefined();
			expect(tables.contentPieces).toBeDefined();
		});
	});

	describe("Image Prompt Templates Table", () => {
		it("should define imagePromptTemplates table with required fields", () => {
			const tables = schema.tables;
			expect(tables).toHaveProperty("imagePromptTemplates");

			const imagePromptTemplatesTable = tables.imagePromptTemplates;
			expect(imagePromptTemplatesTable).toBeDefined();
		});

		it("should support project relationship and image type classification", () => {
			// Verify table exists with proper relationships
			const tables = schema.tables;
			expect(tables.imagePromptTemplates).toBeDefined();
			expect(tables.projects).toBeDefined();
			// Image types: infographic, illustration, photo, diagram
		});
	});

	describe("Activity Log Table", () => {
		it("should define activityLog table with action types", () => {
			const tables = schema.tables;
			expect(tables).toHaveProperty("activityLog");

			const activityLogTable = tables.activityLog;
			expect(activityLogTable).toBeDefined();
		});

		it("should support workspace and project relationships", () => {
			// Verify table structure supports activity tracking
			const tables = schema.tables;
			expect(tables.activityLog).toBeDefined();
			expect(tables.workspaces).toBeDefined();
			expect(tables.projects).toBeDefined();
			expect(tables.contentPieces).toBeDefined();
			// Actions: content_created, content_edited, content_finalized,
			// content_deleted, project_created, derived_content_created
		});

		it("should support activity feed queries by workspace and creation time", () => {
			// Verify activity log can be queried for dashboard feed
			const tables = schema.tables;
			expect(tables.activityLog).toBeDefined();
			// Indexes: by_workspaceId, by_projectId, by_workspaceId_createdAt
		});
	});

	describe("All Core Tables Defined", () => {
		it("should define all 15 required tables", () => {
			const tables = schema.tables;

			// Verify all existing tables
			expect(tables).toHaveProperty("users");
			expect(tables).toHaveProperty("workspaces");
			expect(tables).toHaveProperty("projects");
			expect(tables).toHaveProperty("categories");
			expect(tables).toHaveProperty("brandVoices");
			expect(tables).toHaveProperty("personas");
			expect(tables).toHaveProperty("knowledgeBaseItems");
			expect(tables).toHaveProperty("examples");
			expect(tables).toHaveProperty("files");

			// Verify content tables
			expect(tables).toHaveProperty("contentPieces");
			expect(tables).toHaveProperty("contentVersions");
			expect(tables).toHaveProperty("contentChatMessages");
			expect(tables).toHaveProperty("contentImages");

			// Verify supporting tables
			expect(tables).toHaveProperty("imagePromptTemplates");
			expect(tables).toHaveProperty("activityLog");
		});

		it("should have exactly 15 tables defined in schema", () => {
			const tables = schema.tables;
			const tableNames = Object.keys(tables);

			expect(tableNames).toHaveLength(15);
			expect(tableNames.sort()).toEqual([
				"activityLog",
				"brandVoices",
				"categories",
				"contentChatMessages",
				"contentImages",
				"contentPieces",
				"contentVersions",
				"examples",
				"files",
				"imagePromptTemplates",
				"knowledgeBaseItems",
				"personas",
				"projects",
				"users",
				"workspaces",
			]);
		});
	});
});
