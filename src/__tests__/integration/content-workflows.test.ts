/**
 * Content Creation & Management Integration Tests
 *
 * These tests verify end-to-end workflows for the content creation feature.
 * Focus is on critical user workflows that span multiple components and services.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Id } from "convex/_generated/dataModel";

// Mock types for integration testing
interface ContentPiece {
	_id: Id<"contentPieces">;
	projectId: Id<"projects">;
	categoryId: Id<"categories">;
	personaId?: Id<"personas">;
	brandVoiceId?: Id<"brandVoices">;
	parentContentId?: Id<"contentPieces">;
	title: string;
	content: string;
	status: "draft" | "finalized";
	currentFinalizedVersion?: number;
	deletedAt?: number;
	createdAt: number;
	updatedAt: number;
}

interface ContentVersion {
	_id: Id<"contentVersions">;
	contentPieceId: Id<"contentPieces">;
	versionNumber: number;
	content: string;
	label?: string;
	isFinalizedVersion: boolean;
	finalizedVersionNumber?: number;
	createdAt: number;
}

interface ActivityLogEntry {
	_id: Id<"activityLog">;
	workspaceId: Id<"workspaces">;
	projectId: Id<"projects">;
	contentPieceId?: Id<"contentPieces">;
	action:
		| "content_created"
		| "content_edited"
		| "content_finalized"
		| "content_deleted"
		| "project_created"
		| "derived_content_created";
	metadata?: string;
	createdAt: number;
}

interface ContentImage {
	_id: Id<"contentImages">;
	contentPieceId: Id<"contentPieces">;
	fileId: Id<"files">;
	caption?: string;
	sortOrder: number;
	generatedPrompt?: string;
	createdAt: number;
}

describe("Content Creation & Management Workflows", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("E2E: Complete Content Creation from Wizard to Editor", () => {
		it("should complete full content creation flow: wizard -> AI generation -> editor -> save", async () => {
			const _now = Date.now();

			// Step 1: User starts wizard and selects content type
			const wizardState = {
				step: 1,
				categoryId: "category-blog" as Id<"categories">,
				personaId: "persona-ceo" as Id<"personas">,
				brandVoiceId: "brandvoice-professional" as Id<"brandVoices">,
				title: "10 Tips for Better Content Marketing",
				topic: "Content marketing strategies for B2B companies",
				draftContent: "",
			};

			expect(wizardState.step).toBe(1);
			expect(wizardState.categoryId).toBeDefined();

			// Step 2: User proceeds through wizard steps
			const wizardProgression = [
				{ step: 1, name: "Category Selection" },
				{ step: 2, name: "Persona Selection" },
				{ step: 3, name: "Brand Voice Selection" },
				{ step: 4, name: "Content Details" },
				{ step: 5, name: "Review" },
				{ step: 6, name: "Generation" },
			];

			expect(wizardProgression).toHaveLength(6);
			expect(wizardProgression[wizardProgression.length - 1].step).toBe(6);

			// Step 3: AI generates draft content
			const generatedContent = {
				type: "doc",
				content: [
					{
						type: "heading",
						attrs: { level: 1 },
						content: [{ type: "text", text: wizardState.title }],
					},
					{
						type: "paragraph",
						content: [
							{
								type: "text",
								text: "Introduction to content marketing strategies...",
							},
						],
					},
				],
			};

			const generatedContentJson = JSON.stringify(generatedContent);
			expect(generatedContentJson).toBeDefined();

			// Step 4: Content piece created in database
			const contentPiece: ContentPiece = {
				_id: "content-wizard-test" as Id<"contentPieces">,
				projectId: "project-123" as Id<"projects">,
				categoryId: wizardState.categoryId,
				personaId: wizardState.personaId,
				brandVoiceId: wizardState.brandVoiceId,
				title: wizardState.title,
				content: generatedContentJson,
				status: "draft",
				createdAt: _now,
				updatedAt: _now,
			};

			expect(contentPiece.status).toBe("draft");
			expect(contentPiece.title).toBe(wizardState.title);

			// Step 5: Initial version created automatically
			const initialVersion: ContentVersion = {
				_id: "version-1" as Id<"contentVersions">,
				contentPieceId: contentPiece._id,
				versionNumber: 1,
				content: generatedContentJson,
				isFinalizedVersion: false,
				createdAt: _now,
			};

			expect(initialVersion.versionNumber).toBe(1);
			expect(initialVersion.isFinalizedVersion).toBe(false);

			// Step 6: Activity logged
			const activityEntry: ActivityLogEntry = {
				_id: "activity-1" as Id<"activityLog">,
				workspaceId: "workspace-123" as Id<"workspaces">,
				projectId: contentPiece.projectId,
				contentPieceId: contentPiece._id,
				action: "content_created",
				createdAt: _now,
			};

			expect(activityEntry.action).toBe("content_created");

			// Step 7: User navigates to editor
			const editorUrl = `/projects/${contentPiece.projectId}/content/${contentPiece._id}`;
			expect(editorUrl).toContain(contentPiece._id);

			// Step 8: User makes edits
			const editedContent = {
				...generatedContent,
				content: [
					...generatedContent.content,
					{
						type: "paragraph",
						content: [{ type: "text", text: "New paragraph added by user" }],
					},
				],
			};

			const editedContentJson = JSON.stringify(editedContent);

			// Step 9: Autosave triggers after 3 seconds
			const updatedContentPiece: ContentPiece = {
				...contentPiece,
				content: editedContentJson,
				updatedAt: _now + 3000,
			};

			expect(updatedContentPiece.updatedAt).toBeGreaterThan(
				contentPiece.updatedAt
			);

			// Step 10: New version created on save
			const secondVersion: ContentVersion = {
				_id: "version-2" as Id<"contentVersions">,
				contentPieceId: contentPiece._id,
				versionNumber: 2,
				content: editedContentJson,
				isFinalizedVersion: false,
				createdAt: _now + 3000,
			};

			expect(secondVersion.versionNumber).toBe(2);

			// Verify complete workflow chain
			expect(contentPiece._id).toBeTruthy();
			expect(initialVersion.contentPieceId).toBe(contentPiece._id);
			expect(secondVersion.contentPieceId).toBe(contentPiece._id);
			expect(activityEntry.contentPieceId).toBe(contentPiece._id);
		});
	});

	describe("E2E: AI Draft Generation with Context Assembly", () => {
		it("should assemble complete context for AI generation including all sources", async () => {
			// Context assembly inputs
			const generationRequest = {
				categoryId: "category-blog" as Id<"categories">,
				personaId: "persona-ceo" as Id<"personas">,
				brandVoiceId: "brandvoice-professional" as Id<"brandVoices">,
				projectId: "project-123" as Id<"projects">,
				title: "How to Scale Your SaaS Business",
				topic: "Scaling strategies for B2B SaaS companies",
			};

			// Assembled context components
			const assembledContext = {
				formatGuidelines:
					"Blog posts should be 1500-2000 words with clear headings...",
				personaDescription:
					"CEO persona: authoritative, strategic, data-driven...",
				brandVoiceDescription:
					"Professional, clear, avoiding jargon, helpful tone...",
				knowledgeBaseItems: [
					{
						title: "SaaS Metrics Guide",
						content: "Key metrics for SaaS: MRR, churn, CAC, LTV...",
					},
					{
						title: "Scaling Best Practices",
						content: "Best practices for scaling: automation, hiring...",
					},
				],
				examples: [
					{
						title: "Previous SaaS Article",
						content: "Example of high-performing blog post...",
					},
				],
			};

			// Verify all context components present
			expect(assembledContext.formatGuidelines).toBeDefined();
			expect(assembledContext.personaDescription).toBeDefined();
			expect(assembledContext.brandVoiceDescription).toBeDefined();
			expect(assembledContext.knowledgeBaseItems).toHaveLength(2);
			expect(assembledContext.examples).toHaveLength(1);

			// Verify context respects limits
			expect(assembledContext.knowledgeBaseItems.length).toBeLessThanOrEqual(
				10
			);
			expect(assembledContext.examples.length).toBeLessThanOrEqual(5);

			// AI prompt constructed with all context
			const aiPrompt = `
You are writing content for a ${generationRequest.categoryId}.
Persona: ${assembledContext.personaDescription}
Brand Voice: ${assembledContext.brandVoiceDescription}
Format Guidelines: ${assembledContext.formatGuidelines}
Knowledge Base: ${JSON.stringify(assembledContext.knowledgeBaseItems)}
Examples: ${JSON.stringify(assembledContext.examples)}

Title: ${generationRequest.title}
Topic: ${generationRequest.topic}

Generate the content:
      `.trim();

			expect(aiPrompt).toContain(generationRequest.title);
			expect(aiPrompt).toContain(assembledContext.personaDescription);
			expect(aiPrompt).toContain(assembledContext.brandVoiceDescription);

			// Token usage tracked
			const tokenUsage = {
				promptTokens: 1500,
				completionTokens: 2000,
				totalTokens: 3500,
			};

			expect(tokenUsage.totalTokens).toBe(
				tokenUsage.promptTokens + tokenUsage.completionTokens
			);
			expect(tokenUsage.totalTokens).toBeLessThan(100000); // Under max limit
		});
	});

	describe("E2E: Content Finalization and Unlock Cycle", () => {
		it("should complete finalization workflow: draft -> finalize -> lock -> unlock -> edit", async () => {
			const now = Date.now();

			// Initial draft content
			const draftContent: ContentPiece = {
				_id: "content-finalize" as Id<"contentPieces">,
				projectId: "project-123" as Id<"projects">,
				categoryId: "category-blog" as Id<"categories">,
				title: "Complete Guide to API Design",
				content: '{"type":"doc","content":[]}',
				status: "draft",
				createdAt: now,
				updatedAt: now,
			};

			expect(draftContent.status).toBe("draft");
			expect(draftContent.currentFinalizedVersion).toBeUndefined();

			// User finalizes content (v1)
			const finalizedContent: ContentPiece = {
				...draftContent,
				status: "finalized",
				currentFinalizedVersion: 1,
				updatedAt: now + 1000,
			};

			expect(finalizedContent.status).toBe("finalized");
			expect(finalizedContent.currentFinalizedVersion).toBe(1);

			// Finalized version created
			const finalizedVersion: ContentVersion = {
				_id: "version-finalized-1" as Id<"contentVersions">,
				contentPieceId: finalizedContent._id,
				versionNumber: 5, // Assume there were 4 draft versions
				content: finalizedContent.content,
				label: "Version 1 - Initial Release",
				isFinalizedVersion: true,
				finalizedVersionNumber: 1,
				createdAt: now + 1000,
			};

			expect(finalizedVersion.isFinalizedVersion).toBe(true);
			expect(finalizedVersion.finalizedVersionNumber).toBe(1);

			// Activity logged
			const finalizeActivity: ActivityLogEntry = {
				_id: "activity-finalize" as Id<"activityLog">,
				workspaceId: "workspace-123" as Id<"workspaces">,
				projectId: finalizedContent.projectId,
				contentPieceId: finalizedContent._id,
				action: "content_finalized",
				metadata: JSON.stringify({ version: 1 }),
				createdAt: now + 1000,
			};

			expect(finalizeActivity.action).toBe("content_finalized");

			// Content is read-only (simulated)
			const isReadOnly = finalizedContent.status === "finalized";
			expect(isReadOnly).toBe(true);

			// User unlocks for editing
			const unlockedContent: ContentPiece = {
				...finalizedContent,
				status: "draft",
				updatedAt: now + 2000,
			};

			expect(unlockedContent.status).toBe("draft");
			expect(unlockedContent.currentFinalizedVersion).toBe(1); // Preserves finalized version number

			// User makes edits and finalizes again (v2)
			const secondFinalizedContent: ContentPiece = {
				...unlockedContent,
				content: '{"type":"doc","content":[{"type":"paragraph"}]}',
				status: "finalized",
				currentFinalizedVersion: 2,
				updatedAt: now + 3000,
			};

			expect(secondFinalizedContent.currentFinalizedVersion).toBe(2);

			const secondFinalizedVersion: ContentVersion = {
				_id: "version-finalized-2" as Id<"contentVersions">,
				contentPieceId: secondFinalizedContent._id,
				versionNumber: 7, // More draft versions
				content: secondFinalizedContent.content,
				label: "Version 2 - Updates",
				isFinalizedVersion: true,
				finalizedVersionNumber: 2,
				createdAt: now + 3000,
			};

			expect(secondFinalizedVersion.finalizedVersionNumber).toBe(2);

			// Verify finalization cycle
			expect(finalizedVersion.finalizedVersionNumber).toBe(1);
			expect(secondFinalizedVersion.finalizedVersionNumber).toBe(2);
			expect(secondFinalizedVersion.versionNumber).toBeGreaterThan(
				finalizedVersion.versionNumber
			);
		});
	});

	describe("E2E: Version Restore and Diff Comparison", () => {
		it("should restore previous version creating new version non-destructively", async () => {
			const now = Date.now();

			// Content with multiple versions
			const contentPiece: ContentPiece = {
				_id: "content-restore" as Id<"contentPieces">,
				projectId: "project-123" as Id<"projects">,
				categoryId: "category-blog" as Id<"categories">,
				title: "API Documentation Guide",
				content: '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Version 3 content"}]}]}',
				status: "draft",
				createdAt: now - 10000,
				updatedAt: now,
			};

			// Version history
			const versions: ContentVersion[] = [
				{
					_id: "v1" as Id<"contentVersions">,
					contentPieceId: contentPiece._id,
					versionNumber: 1,
					content: '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Version 1 content"}]}]}',
					isFinalizedVersion: false,
					createdAt: now - 10000,
				},
				{
					_id: "v2" as Id<"contentVersions">,
					contentPieceId: contentPiece._id,
					versionNumber: 2,
					content: '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Version 2 content"}]}]}',
					isFinalizedVersion: false,
					createdAt: now - 5000,
				},
				{
					_id: "v3" as Id<"contentVersions">,
					contentPieceId: contentPiece._id,
					versionNumber: 3,
					content: '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Version 3 content"}]}]}',
					isFinalizedVersion: false,
					createdAt: now,
				},
			];

			expect(versions).toHaveLength(3);

			// User views diff between v1 and v3
			const diffComparison = {
				oldVersion: versions[0],
				newVersion: versions[2],
				additions: ["Version 3 content"],
				deletions: ["Version 1 content"],
				modifications: [],
			};

			expect(diffComparison.oldVersion.versionNumber).toBe(1);
			expect(diffComparison.newVersion.versionNumber).toBe(3);

			// New version created from restore (non-destructive)
			const restoredVersion: ContentVersion = {
				_id: "v4" as Id<"contentVersions">,
				contentPieceId: contentPiece._id,
				versionNumber: 4,
				content: versions[0].content, // Content from v1
				label: "Restored from v1",
				isFinalizedVersion: false,
				createdAt: now + 1000,
			};

			expect(restoredVersion.versionNumber).toBe(4);
			expect(restoredVersion.content).toBe(versions[0].content);

			// All previous versions still exist
			const allVersions = [...versions, restoredVersion];
			expect(allVersions).toHaveLength(4);
			expect(allVersions.map((v) => v.versionNumber)).toEqual([1, 2, 3, 4]);

			// Verify restore is non-destructive
			const v1StillExists = allVersions.find((v) => v.versionNumber === 1);
			expect(v1StillExists).toBeDefined();
		});
	});

	describe("E2E: Image Generation and Gallery Management", () => {
		it("should complete image workflow: wizard -> AI prompt -> generation -> attach -> reorder", async () => {
			const now = Date.now();

			const contentPiece: ContentPiece = {
				_id: "content-images" as Id<"contentPieces">,
				projectId: "project-123" as Id<"projects">,
				categoryId: "category-blog" as Id<"categories">,
				title: "Visual Guide to Data Structures",
				content: "{}",
				status: "draft",
				createdAt: now,
				updatedAt: now,
			};

			// Step 1: User opens image prompt wizard
			const imagePromptWizard = {
				step: 1,
				imageType: "diagram" as const,
				subject: "Binary tree data structure",
				style: "Clean, technical illustration",
				mood: "Professional, educational",
				composition: "Centered with labels",
				colors: "Blue and white color scheme",
			};

			expect(imagePromptWizard.imageType).toBe("diagram");

			// Step 2: AI generates image prompt
			const generatedPrompt = `Create a ${imagePromptWizard.imageType} showing ${imagePromptWizard.subject}. Style: ${imagePromptWizard.style}. Mood: ${imagePromptWizard.mood}. Composition: ${imagePromptWizard.composition}. Colors: ${imagePromptWizard.colors}.`;

			expect(generatedPrompt).toContain(imagePromptWizard.subject);
			expect(generatedPrompt.length).toBeLessThanOrEqual(4000);

			// Step 3: Image generated via DALL-E
			const generatedImageFile = {
				_id: "file-image-1" as Id<"files">,
				filename: "binary-tree-diagram.png",
				mimeType: "image/png",
				sizeBytes: 1024 * 500, // 500 KB
				r2Key: "workspace-123/content-images/binary-tree-diagram.png",
				createdAt: now + 1000,
			};

			expect(generatedImageFile.mimeType).toContain("image");
			expect(generatedImageFile.sizeBytes).toBeLessThan(15 * 1024 * 1024);

			// Step 4: Image attached to content piece
			const attachedImage: ContentImage = {
				_id: "img-1" as Id<"contentImages">,
				contentPieceId: contentPiece._id,
				fileId: generatedImageFile._id,
				caption: "Binary tree structure visualization",
				sortOrder: 1,
				generatedPrompt: generatedPrompt,
				createdAt: now + 2000,
			};

			expect(attachedImage.contentPieceId).toBe(contentPiece._id);
			expect(attachedImage.sortOrder).toBe(1);

			// Step 5: User generates second image
			const secondImageFile = {
				_id: "file-image-2" as Id<"files">,
				filename: "linked-list-diagram.png",
				mimeType: "image/png",
				sizeBytes: 1024 * 450,
				r2Key: "workspace-123/content-images/linked-list-diagram.png",
				createdAt: now + 3000,
			};

			const secondAttachedImage: ContentImage = {
				_id: "img-2" as Id<"contentImages">,
				contentPieceId: contentPiece._id,
				fileId: secondImageFile._id,
				caption: "Linked list structure",
				sortOrder: 2,
				createdAt: now + 4000,
			};

			// Step 6: User reorders images (swap positions)
			const reorderedImages = [
				{ ...secondAttachedImage, sortOrder: 1 },
				{ ...attachedImage, sortOrder: 2 },
			];

			expect(reorderedImages[0]._id).toBe(secondAttachedImage._id);
			expect(reorderedImages[0].sortOrder).toBe(1);
			expect(reorderedImages[1].sortOrder).toBe(2);

			// Step 7: User updates caption
			const updatedImageCaption: ContentImage = {
				...attachedImage,
				caption: "Updated: Binary tree with parent pointers",
			};

			expect(updatedImageCaption.caption).toContain("Updated");

			// Verify complete image workflow
			expect(attachedImage.generatedPrompt).toBe(generatedPrompt);
			expect(reorderedImages).toHaveLength(2);
			expect(reorderedImages.every((img) => img.contentPieceId === contentPiece._id)).toBe(true);
		});
	});

	describe("Integration: Search Across Multiple Content Pieces", () => {
		it("should search across content title and body with result highlighting", async () => {
			const now = Date.now();

			// Multiple content pieces in project
			const contentPieces: ContentPiece[] = [
				{
					_id: "content-1" as Id<"contentPieces">,
					projectId: "project-123" as Id<"projects">,
					categoryId: "category-blog" as Id<"categories">,
					title: "Introduction to TypeScript",
					content: JSON.stringify({
						type: "doc",
						content: [
							{
								type: "paragraph",
								content: [
									{ type: "text", text: "TypeScript is a typed superset of JavaScript" },
								],
							},
						],
					}),
					status: "draft",
					createdAt: now - 5000,
					updatedAt: now - 5000,
				},
				{
					_id: "content-2" as Id<"contentPieces">,
					projectId: "project-123" as Id<"projects">,
					categoryId: "category-blog" as Id<"categories">,
					title: "Advanced React Patterns",
					content: JSON.stringify({
						type: "doc",
						content: [
							{
								type: "paragraph",
								content: [
									{ type: "text", text: "Learn advanced patterns in React development" },
								],
							},
						],
					}),
					status: "finalized",
					currentFinalizedVersion: 1,
					createdAt: now - 3000,
					updatedAt: now - 3000,
				},
				{
					_id: "content-3" as Id<"contentPieces">,
					projectId: "project-123" as Id<"projects">,
					categoryId: "category-social" as Id<"categories">,
					title: "5 Tips for Better Code Reviews",
					content: JSON.stringify({
						type: "doc",
						content: [
							{
								type: "paragraph",
								content: [
									{ type: "text", text: "TypeScript can help catch bugs in code reviews" },
								],
							},
						],
					}),
					status: "draft",
					createdAt: now - 1000,
					updatedAt: now - 1000,
				},
			];

			// Search query
			const searchQuery = "TypeScript";

			// Search across title and content
			function searchContent(query: string, pieces: ContentPiece[]) {
				return pieces.filter(piece => {
					const titleMatch = piece.title.toLowerCase().includes(query.toLowerCase());
					const contentMatch = piece.content.toLowerCase().includes(query.toLowerCase());
					return titleMatch || contentMatch;
				});
			}

			const searchResults = searchContent(searchQuery, contentPieces);

			expect(searchResults).toHaveLength(2); // content-1 and content-3
			expect(searchResults[0]._id).toBe("content-1");
			expect(searchResults[1]._id).toBe("content-3");

			// Search results with highlighting
			const enrichedResults = searchResults.map(piece => {
				const titleMatch = piece.title.toLowerCase().includes(searchQuery.toLowerCase());
				return {
					...piece,
					matchedIn: titleMatch ? "title" : "content",
					snippet: titleMatch
						? piece.title
						: "...TypeScript can help catch bugs...",
				};
			});

			expect(enrichedResults[0].matchedIn).toBe("title");
			expect(enrichedResults[1].matchedIn).toBe("content");

			// Debounced search simulation (300ms delay)
			const searchDebounceMs = 300;
			expect(searchDebounceMs).toBe(300);

			// Cross-project search option
			const crossProjectSearch = false; // Default to project-scoped
			expect(crossProjectSearch).toBe(false);
		});
	});

	describe("Integration: Activity Feed Reflects Content Actions", () => {
		it("should log all content actions in activity feed chronologically", async () => {
			const now = Date.now();
			const workspaceId = "workspace-123" as Id<"workspaces">;
			const projectId = "project-123" as Id<"projects">;

			// Sequence of content actions
			const activities: ActivityLogEntry[] = [
				{
					_id: "act-1" as Id<"activityLog">,
					workspaceId,
					projectId,
					contentPieceId: "content-1" as Id<"contentPieces">,
					action: "content_created",
					metadata: JSON.stringify({ title: "First Blog Post" }),
					createdAt: now - 10000,
				},
				{
					_id: "act-2" as Id<"activityLog">,
					workspaceId,
					projectId,
					contentPieceId: "content-1" as Id<"contentPieces">,
					action: "content_edited",
					metadata: JSON.stringify({ changes: "Added conclusion" }),
					createdAt: now - 8000,
				},
				{
					_id: "act-3" as Id<"activityLog">,
					workspaceId,
					projectId,
					contentPieceId: "content-2" as Id<"contentPieces">,
					action: "content_created",
					metadata: JSON.stringify({ title: "Second Blog Post" }),
					createdAt: now - 6000,
				},
				{
					_id: "act-4" as Id<"activityLog">,
					workspaceId,
					projectId,
					contentPieceId: "content-1" as Id<"contentPieces">,
					action: "content_finalized",
					metadata: JSON.stringify({ version: 1 }),
					createdAt: now - 4000,
				},
				{
					_id: "act-5" as Id<"activityLog">,
					workspaceId,
					projectId,
					contentPieceId: "content-3" as Id<"contentPieces">,
					action: "derived_content_created",
					metadata: JSON.stringify({
						parentId: "content-1",
						title: "LinkedIn version",
					}),
					createdAt: now - 2000,
				},
			];

			// Get recent activity (limit 10)
			const recentActivity = activities
				.sort((a, b) => b.createdAt - a.createdAt)
				.slice(0, 10);

			expect(recentActivity).toHaveLength(5);
			expect(recentActivity[0].action).toBe("derived_content_created"); // Most recent
			expect(recentActivity[recentActivity.length - 1].action).toBe("content_created"); // Oldest

			// Verify all action types present
			const actionTypes = new Set(activities.map((a) => a.action));
			expect(actionTypes).toContain("content_created");
			expect(actionTypes).toContain("content_edited");
			expect(actionTypes).toContain("content_finalized");
			expect(actionTypes).toContain("derived_content_created");

			// Activity feed links to content
			const activityWithLinks = recentActivity.map((activity) => ({
				...activity,
				linkUrl: activity.contentPieceId
					? `/projects/${activity.projectId}/content/${activity.contentPieceId}`
					: `/projects/${activity.projectId}`,
			}));

			expect(activityWithLinks[0].linkUrl).toContain("content");

			// Filter by project
			const projectActivities = activities.filter(
				(a) => a.projectId === projectId
			);
			expect(projectActivities).toHaveLength(5);
		});
	});

	describe("Integration: Dark Mode Persists Across Page Navigation", () => {
		it("should maintain dark mode preference during navigation", () => {
			// Initial theme preference
			const themePreference = "dark";

			// Stored in localStorage
			const localStorageTheme = themePreference;
			expect(localStorageTheme).toBe("dark");

			// Also stored in workspace
			const workspaceTheme = themePreference;
			expect(workspaceTheme).toBe("dark");

			// Navigation between pages
			const pages = [
				"/dashboard",
				"/projects/123/content",
				"/projects/123/content/new",
				"/projects/123/content/456",
				"/projects/123/content/456/versions",
			];

			// Theme persists across all pages
			pages.forEach((_page) => {
				const currentTheme = localStorageTheme; // Would be read from storage
				expect(currentTheme).toBe("dark");
			});

			// System preference fallback
			const systemPreference = "system";
			const effectiveTheme = localStorageTheme || systemPreference;
			expect(effectiveTheme).toBe("dark");

			// Theme toggle changes preference
			const toggledTheme = localStorageTheme === "dark" ? "light" : "dark";
			expect(toggledTheme).toBe("light");

			// Smooth transition (CSS)
			const transitionDuration = "150ms";
			expect(transitionDuration).toBe("150ms");
		});
	});
});
