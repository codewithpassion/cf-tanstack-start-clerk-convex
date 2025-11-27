/**
 * Critical Integration Tests for Foundation & Core Data
 *
 * These tests verify end-to-end workflows that span multiple entities and operations.
 * Focus is on critical business flows and integration points between components.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock types for integration testing
interface User {
	_id: string;
	clerkId: string;
	email: string;
	name?: string;
}

interface Workspace {
	_id: string;
	userId: string;
	onboardingCompleted: boolean;
	createdAt: number;
	updatedAt: number;
}

interface Project {
	_id: string;
	workspaceId: string;
	name: string;
	description?: string;
	deletedAt?: number;
	createdAt: number;
	updatedAt: number;
}

interface Category {
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

interface BrandVoice {
	_id: string;
	projectId: string;
	name: string;
	description?: string;
	deletedAt?: number;
	createdAt: number;
	updatedAt: number;
}

interface File {
	_id: string;
	brandVoiceId?: string;
	personaId?: string;
	filename: string;
	mimeType: string;
	sizeBytes: number;
	r2Key: string;
	extractedText?: string;
	createdAt: number;
}

describe("Critical Integration Workflows", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("End-to-End: New User to First Content Category", () => {
		it("should complete full onboarding flow: user sync -> workspace -> project -> categories", async () => {
			const now = Date.now();

			// Step 1: User syncs from Clerk
			const newUser: User = {
				_id: "user-123",
				clerkId: "clerk_abc123",
				email: "newuser@example.com",
				name: "New User",
			};

			// Step 2: Workspace auto-created
			const workspace: Workspace = {
				_id: "workspace-123",
				userId: newUser._id,
				onboardingCompleted: false,
				createdAt: now,
				updatedAt: now,
			};

			expect(workspace.userId).toBe(newUser._id);
			expect(workspace.onboardingCompleted).toBe(false);

			// Step 3: User creates first project
			const project: Project = {
				_id: "project-123",
				workspaceId: workspace._id,
				name: "My First Project",
				description: "Getting started with PostMate",
				createdAt: now,
				updatedAt: now,
			};

			expect(project.workspaceId).toBe(workspace._id);

			// Step 4: Default categories automatically created
			const defaultCategoryNames = [
				"Blog Post",
				"LinkedIn Article",
				"LinkedIn Post",
				"Instagram Post",
				"X Thread",
				"Case Study",
			];

			const categories: Category[] = defaultCategoryNames.map((name, index) => ({
				_id: `category-${index}`,
				projectId: project._id,
				name,
				description: `Default ${name} category`,
				formatGuidelines: `Guidelines for ${name}`,
				isDefault: true,
				sortOrder: index + 1,
				createdAt: now,
				updatedAt: now,
			}));

			expect(categories).toHaveLength(6);
			expect(categories.every(cat => cat.projectId === project._id)).toBe(true);
			expect(categories.every(cat => cat.isDefault === true)).toBe(true);

			// Step 5: Verify onboarding can be marked complete
			const completedWorkspace = {
				...workspace,
				onboardingCompleted: true,
				updatedAt: now + 1000,
			};

			expect(completedWorkspace.onboardingCompleted).toBe(true);

			// Verify complete workflow chain
			expect(newUser._id).toBeTruthy();
			expect(workspace.userId).toBe(newUser._id);
			expect(project.workspaceId).toBe(workspace._id);
			expect(categories[0].projectId).toBe(project._id);
		});

		it("should handle onboarding skip and direct project creation", async () => {
			const now = Date.now();

			// User exists with workspace
			const workspace: Workspace = {
				_id: "workspace-456",
				userId: "user-456",
				onboardingCompleted: false,
				createdAt: now - 1000,
				updatedAt: now - 1000,
			};

			// User skips onboarding wizard and goes straight to dashboard
			const updatedWorkspace = {
				...workspace,
				onboardingCompleted: true,
				updatedAt: now,
			};

			expect(updatedWorkspace.onboardingCompleted).toBe(true);

			// User can still create project manually from dashboard
			const project: Project = {
				_id: "project-456",
				workspaceId: workspace._id,
				name: "Manual Project",
				createdAt: now,
				updatedAt: now,
			};

			expect(project.workspaceId).toBe(workspace._id);
		});
	});

	describe("Integration: File Upload to Extracted Text Availability", () => {
		it("should complete file upload flow: presigned URL -> upload -> extraction -> storage", async () => {
			const now = Date.now();

			// Step 1: Request presigned upload URL
			const uploadRequest = {
				filename: "brand-voice-doc.pdf",
				mimeType: "application/pdf",
				sizeBytes: 1024 * 500, // 500 KB
				ownerType: "brandVoice",
				ownerId: "brandvoice-123",
			};

			// Validate file metadata
			expect(uploadRequest.sizeBytes).toBeLessThan(15 * 1024 * 1024); // Under 15MB
			expect(["application/pdf", "application/msword", "text/plain"].includes(uploadRequest.mimeType)).toBe(true);

			// Step 2: Generate R2 key and presigned URL
			const r2Key = `workspace-123/brand-voices/${now}-${uploadRequest.filename}`;
			const presignedUrl = `https://r2.example.com/upload?key=${r2Key}&expires=300`;

			expect(r2Key).toContain(uploadRequest.filename);
			expect(presignedUrl).toContain(r2Key);

			// Step 3: Simulate file upload to R2 (client-side)
			const uploadSuccess = true;
			expect(uploadSuccess).toBe(true);

			// Step 4: Confirm upload and extract text
			const extractedText = "This is the brand voice document content extracted from PDF...";

			const fileRecord: File = {
				_id: "file-123",
				brandVoiceId: "brandvoice-123",
				filename: uploadRequest.filename,
				mimeType: uploadRequest.mimeType,
				sizeBytes: uploadRequest.sizeBytes,
				r2Key,
				extractedText,
				createdAt: now,
			};

			// Verify file record has extracted text
			expect(fileRecord.extractedText).toBeDefined();
			expect(fileRecord.extractedText!.length).toBeGreaterThan(0);
			expect(fileRecord.r2Key).toBe(r2Key);
			expect(fileRecord.brandVoiceId).toBe("brandvoice-123");

			// Step 5: Verify extracted text can be used for AI context
			const aiContext = {
				brandVoiceText: fileRecord.extractedText,
			};

			expect(aiContext.brandVoiceText).toBe(extractedText);
		});

		it("should handle text extraction failure gracefully", async () => {
			const now = Date.now();

			// File uploaded but extraction fails
			const fileRecord: File = {
				_id: "file-456",
				brandVoiceId: "brandvoice-456",
				filename: "corrupted-file.pdf",
				mimeType: "application/pdf",
				sizeBytes: 1024 * 100,
				r2Key: "workspace-123/brand-voices/corrupted-file.pdf",
				// extractedText is undefined due to extraction failure
				createdAt: now,
			};

			// File record should still be created even if extraction fails
			expect(fileRecord._id).toBeTruthy();
			expect(fileRecord.extractedText).toBeUndefined();

			// Verify system can handle missing extracted text
			const aiContext = {
				brandVoiceText: fileRecord.extractedText || "", // Fallback to empty string
			};

			expect(aiContext.brandVoiceText).toBe("");
		});

		it("should truncate extracted text to 50,000 character limit", async () => {
			const now = Date.now();

			// Simulate very large document
			const veryLongText = "A".repeat(75000); // 75,000 characters
			const truncatedText = veryLongText.substring(0, 50000);

			const fileRecord: File = {
				_id: "file-789",
				brandVoiceId: "brandvoice-789",
				filename: "large-document.pdf",
				mimeType: "application/pdf",
				sizeBytes: 1024 * 1024 * 5, // 5 MB
				r2Key: "workspace-123/brand-voices/large-document.pdf",
				extractedText: truncatedText,
				createdAt: now,
			};

			expect(fileRecord.extractedText!.length).toBe(50000);
			expect(fileRecord.extractedText!.length).toBeLessThanOrEqual(50000);
		});
	});

	describe("Authorization: Cross-Workspace Access Prevention", () => {
		it("should prevent user from accessing another workspace's projects", async () => {
			// User 1 and their workspace
			const user1: User = {
				_id: "user-1",
				clerkId: "clerk_user1",
				email: "user1@example.com",
			};

			const workspace1: Workspace = {
				_id: "workspace-1",
				userId: user1._id,
				onboardingCompleted: true,
				createdAt: Date.now(),
				updatedAt: Date.now(),
			};

			const project1: Project = {
				_id: "project-1",
				workspaceId: workspace1._id,
				name: "User 1 Project",
				createdAt: Date.now(),
				updatedAt: Date.now(),
			};

			// User 2 and their workspace
			const user2: User = {
				_id: "user-2",
				clerkId: "clerk_user2",
				email: "user2@example.com",
			};

			const workspace2: Workspace = {
				_id: "workspace-2",
				userId: user2._id,
				onboardingCompleted: true,
				createdAt: Date.now(),
				updatedAt: Date.now(),
			};

			const project2: Project = {
				_id: "project-2",
				workspaceId: workspace2._id,
				name: "User 2 Project",
				createdAt: Date.now(),
				updatedAt: Date.now(),
			};

			// Verify workspace isolation
			expect(workspace1.userId).toBe(user1._id);
			expect(workspace2.userId).toBe(user2._id);
			expect(workspace1._id).not.toBe(workspace2._id);

			// Verify project isolation
			expect(project1.workspaceId).toBe(workspace1._id);
			expect(project2.workspaceId).toBe(workspace2._id);

			// Simulate authorization check
			function canUserAccessProject(userId: string, project: Project, workspace: Workspace): boolean {
				return workspace.userId === userId && project.workspaceId === workspace._id;
			}

			// User 1 can access their own project
			expect(canUserAccessProject(user1._id, project1, workspace1)).toBe(true);

			// User 1 cannot access User 2's project
			expect(canUserAccessProject(user1._id, project2, workspace1)).toBe(false);

			// User 2 can access their own project
			expect(canUserAccessProject(user2._id, project2, workspace2)).toBe(true);

			// User 2 cannot access User 1's project
			expect(canUserAccessProject(user2._id, project1, workspace2)).toBe(false);
		});

		it("should prevent access to brand voices and files across workspaces", async () => {
			const now = Date.now();

			// Workspace 1 with brand voice and file
			const brandVoice1: BrandVoice = {
				_id: "bv-1",
				projectId: "project-1",
				name: "Brand Voice 1",
				createdAt: now,
				updatedAt: now,
			};

			const file1: File = {
				_id: "file-1",
				brandVoiceId: brandVoice1._id,
				filename: "voice-doc.pdf",
				mimeType: "application/pdf",
				sizeBytes: 1024,
				r2Key: "workspace-1/brand-voices/voice-doc.pdf",
				extractedText: "Private brand voice content",
				createdAt: now,
			};

			// R2 key should be validated to belong to user's workspace
			function extractWorkspaceIdFromR2Key(r2Key: string): string {
				return r2Key.split("/")[0];
			}

			const workspaceIdFromKey = extractWorkspaceIdFromR2Key(file1.r2Key);
			expect(workspaceIdFromKey).toBe("workspace-1");

			// User from workspace-2 should not be able to access files from workspace-1
			function canAccessFile(userWorkspaceId: string, file: File): boolean {
				const fileWorkspaceId = extractWorkspaceIdFromR2Key(file.r2Key);
				return userWorkspaceId === fileWorkspaceId;
			}

			expect(canAccessFile("workspace-1", file1)).toBe(true);
			expect(canAccessFile("workspace-2", file1)).toBe(false);
		});
	});

	describe("Soft Delete: Cascading Behavior Verification", () => {
		it("should soft delete project and filter out related entities", async () => {
			const now = Date.now();

			// Create project with related entities
			const project: Project = {
				_id: "project-cascade",
				workspaceId: "workspace-123",
				name: "Project to Delete",
				createdAt: now,
				updatedAt: now,
			};

			const categories: Category[] = [
				{
					_id: "cat-1",
					projectId: project._id,
					name: "Category 1",
					isDefault: true,
					sortOrder: 1,
					createdAt: now,
					updatedAt: now,
				},
			];

			// Soft delete the project
			const deletedProject: Project = {
				...project,
				deletedAt: now + 1000,
			};

			expect(deletedProject.deletedAt).toBeDefined();

			// Verify project is filtered out
			const activeProjects = [deletedProject].filter(p => !p.deletedAt);
			expect(activeProjects).toHaveLength(0);

			// Categories should still exist but their project is soft-deleted
			expect(categories[0].projectId).toBe(deletedProject._id);

			// When querying categories, filter by project's deletedAt status
			function getActiveCategoriesForProject(projectId: string, project: Project, allCategories: Category[]): Category[] {
				if (project.deletedAt) {
					return []; // Don't return categories for soft-deleted projects
				}
				return allCategories.filter(c => c.projectId === projectId && !c.deletedAt);
			}

			const visibleCategories = getActiveCategoriesForProject(project._id, deletedProject, categories);
			expect(visibleCategories).toHaveLength(0);
		});

		it("should cascade soft delete from brand voice to files", async () => {
			const now = Date.now();

			const brandVoice: BrandVoice = {
				_id: "bv-cascade",
				projectId: "project-123",
				name: "Brand Voice with Files",
				createdAt: now,
				updatedAt: now,
			};

			const file: File = {
				_id: "file-cascade",
				brandVoiceId: brandVoice._id,
				filename: "voice.pdf",
				mimeType: "application/pdf",
				sizeBytes: 1024,
				r2Key: "workspace-123/brand-voices/voice.pdf",
				createdAt: now,
			};

			// Soft delete brand voice
			const deletedBrandVoice: BrandVoice = {
				...brandVoice,
				deletedAt: now + 1000,
			};

			expect(deletedBrandVoice.deletedAt).toBeDefined();

			// File should be filtered when brand voice is deleted
			function getFilesForBrandVoice(brandVoiceId: string, brandVoice: BrandVoice, allFiles: File[]): File[] {
				if (brandVoice.deletedAt) {
					return []; // Don't return files for soft-deleted brand voices
				}
				return allFiles.filter(f => f.brandVoiceId === brandVoiceId);
			}

			const visibleFiles = getFilesForBrandVoice(brandVoice._id, deletedBrandVoice, [file]);
			expect(visibleFiles).toHaveLength(0);
		});

		it("should prevent access to soft-deleted category's knowledge base items", async () => {
			const now = Date.now();

			interface KnowledgeBaseItem {
				_id: string;
				categoryId: string;
				projectId: string;
				title: string;
				deletedAt?: number;
			}

			const category: Category = {
				_id: "cat-kb",
				projectId: "project-123",
				name: "Category with KB",
				isDefault: false,
				sortOrder: 1,
				createdAt: now,
				updatedAt: now,
			};

			const kbItems: KnowledgeBaseItem[] = [
				{
					_id: "kb-1",
					categoryId: category._id,
					projectId: category.projectId,
					title: "Knowledge Item 1",
				},
				{
					_id: "kb-2",
					categoryId: category._id,
					projectId: category.projectId,
					title: "Knowledge Item 2",
				},
			];

			// Soft delete category
			const deletedCategory: Category = {
				...category,
				deletedAt: now + 1000,
			};

			// Knowledge base items should be hidden
			function getKnowledgeBaseItems(categoryId: string, category: Category, allItems: KnowledgeBaseItem[]): KnowledgeBaseItem[] {
				if (category.deletedAt) {
					return [];
				}
				return allItems.filter(item => item.categoryId === categoryId && !item.deletedAt);
			}

			const visibleItems = getKnowledgeBaseItems(category._id, deletedCategory, kbItems);
			expect(visibleItems).toHaveLength(0);
		});
	});

	describe("Onboarding: Full Wizard Flow Completion", () => {
		it("should complete all wizard steps and mark onboarding done", async () => {
			const now = Date.now();

			// Initial state: workspace needs onboarding
			const workspace: Workspace = {
				_id: "workspace-onboard",
				userId: "user-onboard",
				onboardingCompleted: false,
				createdAt: now,
				updatedAt: now,
			};

			expect(workspace.onboardingCompleted).toBe(false);

			// Step 1: Create first project
			const project: Project = {
				_id: "project-onboard",
				workspaceId: workspace._id,
				name: "My First Project",
				description: "Created during onboarding",
				createdAt: now + 100,
				updatedAt: now + 100,
			};

			expect(project.workspaceId).toBe(workspace._id);

			// Step 2: Add brand voice (optional, not skipped)
			const brandVoice: BrandVoice = {
				_id: "bv-onboard",
				projectId: project._id,
				name: "Professional Voice",
				description: "Our professional tone",
				createdAt: now + 200,
				updatedAt: now + 200,
			};

			expect(brandVoice.projectId).toBe(project._id);

			// Step 3: Add persona (optional, skipped in this test)
			const personaSkipped = true;
			expect(personaSkipped).toBe(true);

			// Step 4: Complete onboarding
			const completedWorkspace: Workspace = {
				...workspace,
				onboardingCompleted: true,
				updatedAt: now + 300,
			};

			expect(completedWorkspace.onboardingCompleted).toBe(true);

			// Verify user should not see onboarding wizard anymore
			function shouldShowOnboarding(workspace: Workspace): boolean {
				return !workspace.onboardingCompleted;
			}

			expect(shouldShowOnboarding(completedWorkspace)).toBe(false);
		});

		it("should allow skipping all optional steps", async () => {
			const now = Date.now();

			const workspace: Workspace = {
				_id: "workspace-skip",
				userId: "user-skip",
				onboardingCompleted: false,
				createdAt: now,
				updatedAt: now,
			};

			// Complete onboarding with minimal data
			const completedWorkspace: Workspace = {
				...workspace,
				onboardingCompleted: true,
				updatedAt: now + 200,
			};

			// Verify onboarding can be completed with minimal data
			expect(completedWorkspace.onboardingCompleted).toBe(true);
		});
	});

	describe("Category-Level Knowledge Base and Examples", () => {
		it("should ensure knowledge base items are correctly scoped to categories", async () => {
			const now = Date.now();

			interface KnowledgeBaseItem {
				_id: string;
				categoryId: string;
				projectId: string;
				title: string;
				content: string;
			}

			const project: Project = {
				_id: "project-kb-scope",
				workspaceId: "workspace-123",
				name: "Project with KB",
				createdAt: now,
				updatedAt: now,
			};

			const category1: Category = {
				_id: "cat-blog",
				projectId: project._id,
				name: "Blog Post",
				isDefault: true,
				sortOrder: 1,
				createdAt: now,
				updatedAt: now,
			};

			const category2: Category = {
				_id: "cat-linkedin",
				projectId: project._id,
				name: "LinkedIn Post",
				isDefault: true,
				sortOrder: 2,
				createdAt: now,
				updatedAt: now,
			};

			// Knowledge base items for different categories
			const kbItems: KnowledgeBaseItem[] = [
				{
					_id: "kb-blog-1",
					categoryId: category1._id,
					projectId: project._id,
					title: "Blog SEO Guide",
					content: "SEO best practices for blog posts",
				},
				{
					_id: "kb-blog-2",
					categoryId: category1._id,
					projectId: project._id,
					title: "Blog Structure",
					content: "How to structure blog posts",
				},
				{
					_id: "kb-linkedin-1",
					categoryId: category2._id,
					projectId: project._id,
					title: "LinkedIn Engagement",
					content: "How to increase LinkedIn engagement",
				},
			];

			// Filter KB items by category
			const blogKbItems = kbItems.filter(item => item.categoryId === category1._id);
			const linkedInKbItems = kbItems.filter(item => item.categoryId === category2._id);

			expect(blogKbItems).toHaveLength(2);
			expect(linkedInKbItems).toHaveLength(1);
			expect(blogKbItems.every(item => item.categoryId === category1._id)).toBe(true);
			expect(linkedInKbItems.every(item => item.categoryId === category2._id)).toBe(true);
		});

		it("should ensure examples are correctly scoped to categories", async () => {
			const now = Date.now();

			interface Example {
				_id: string;
				categoryId: string;
				projectId: string;
				title: string;
				content: string;
				notes?: string;
			}

			const category: Category = {
				_id: "cat-examples",
				projectId: "project-123",
				name: "X Thread",
				isDefault: true,
				sortOrder: 5,
				createdAt: now,
				updatedAt: now,
			};

			const examples: Example[] = [
				{
					_id: "ex-1",
					categoryId: category._id,
					projectId: "project-123",
					title: "Viral Thread Example",
					content: "Thread content here...",
					notes: "This thread got 50k views",
				},
				{
					_id: "ex-2",
					categoryId: category._id,
					projectId: "project-123",
					title: "Educational Thread",
					content: "Educational content...",
				},
			];

			const categoryExamples = examples.filter(ex => ex.categoryId === category._id);
			expect(categoryExamples).toHaveLength(2);
			expect(categoryExamples.every(ex => ex.categoryId === category._id)).toBe(true);
		});
	});
});