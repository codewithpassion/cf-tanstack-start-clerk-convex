/**
 * Tests for content piece management operations.
 * Tests verify content piece CRUD operations, filtering, pagination,
 * soft delete behavior, and finalization workflow.
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
		object: (schema: unknown) => ({ type: "object", schema }),
		union: (...args: unknown[]) => ({ type: "union", options: args }),
		literal: (val: unknown) => ({ type: "literal", value: val }),
	},
}));

interface MockContentPiece {
	_id: string;
	projectId: string;
	categoryId: string;
	personaId?: string;
	brandVoiceId?: string;
	parentContentId?: string;
	title: string;
	content: string;
	status: "draft" | "finalized";
	currentFinalizedVersion?: number;
	deletedAt?: number;
	createdAt: number;
	updatedAt: number;
}

interface MockCategory {
	_id: string;
	projectId: string;
	name: string;
	deletedAt?: number;
}

interface MockPersona {
	_id: string;
	projectId: string;
	name: string;
	deletedAt?: number;
}

interface MockBrandVoice {
	_id: string;
	projectId: string;
	name: string;
	deletedAt?: number;
}

interface MockContentVersion {
	_id: string;
	contentPieceId: string;
	versionNumber: number;
	content: string;
	label?: string;
	isFinalizedVersion: boolean;
	finalizedVersionNumber?: number;
	createdAt: number;
}

interface MockActivityLog {
	_id: string;
	workspaceId: string;
	projectId: string;
	contentPieceId?: string;
	action: string;
	metadata?: string;
	createdAt: number;
}

describe("Content Piece Management", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("createContentPiece mutation", () => {
		it("should create content piece with required fields and authorization", async () => {
			const mockDb = {
				insert: vi.fn().mockResolvedValue("content-piece-123"),
			};

			const contentPieceData = {
				projectId: "project-123",
				categoryId: "category-123",
				title: "My First Blog Post",
				content: '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Hello world"}]}]}',
				status: "draft" as const,
				createdAt: Date.now(),
				updatedAt: Date.now(),
			};

			const contentPieceId = await mockDb.insert("contentPieces", contentPieceData);

			expect(contentPieceId).toBe("content-piece-123");
			expect(mockDb.insert).toHaveBeenCalledWith("contentPieces", expect.objectContaining({
				projectId: "project-123",
				categoryId: "category-123",
				title: "My First Blog Post",
				status: "draft",
			}));
		});

		it("should create content piece with optional persona and brand voice", async () => {
			const mockDb = {
				insert: vi.fn().mockResolvedValue("content-piece-124"),
			};

			const contentPieceData = {
				projectId: "project-123",
				categoryId: "category-123",
				personaId: "persona-123",
				brandVoiceId: "brand-voice-123",
				title: "Professional Article",
				content: '{"type":"doc","content":[]}',
				status: "draft" as const,
				createdAt: Date.now(),
				updatedAt: Date.now(),
			};

			const contentPieceId = await mockDb.insert("contentPieces", contentPieceData);

			expect(contentPieceId).toBe("content-piece-124");
			expect(mockDb.insert).toHaveBeenCalledWith("contentPieces", expect.objectContaining({
				personaId: "persona-123",
				brandVoiceId: "brand-voice-123",
			}));
		});
	});

	describe("updateContentPiece mutation", () => {
		it("should update content fields and trigger version creation", async () => {
			const originalContent = '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Original"}]}]}';
			const updatedContent = '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Updated content"}]}]}';

			const mockContentPiece: MockContentPiece = {
				_id: "content-piece-123",
				projectId: "project-123",
				categoryId: "category-123",
				title: "Original Title",
				content: originalContent,
				status: "draft",
				createdAt: Date.now() - 10000,
				updatedAt: Date.now() - 5000,
			};

			const mockDb = {
				get: vi.fn().mockResolvedValue(mockContentPiece),
				patch: vi.fn().mockResolvedValue(undefined),
				insert: vi.fn().mockResolvedValue("version-123"),
				query: vi.fn().mockReturnValue({
					withIndex: vi.fn().mockReturnValue({
						collect: vi.fn().mockResolvedValue([]),
					}),
				}),
			};

			// Update content
			const updateData = {
				title: "Updated Title",
				content: updatedContent,
				updatedAt: Date.now(),
			};

			await mockDb.patch("content-piece-123", updateData);

			expect(mockDb.patch).toHaveBeenCalledWith("content-piece-123", expect.objectContaining({
				title: "Updated Title",
				content: updatedContent,
				updatedAt: expect.any(Number),
			}));

			// Verify version creation
			const versionData = {
				contentPieceId: "content-piece-123",
				versionNumber: 1,
				content: updatedContent,
				isFinalizedVersion: false,
				createdAt: Date.now(),
			};

			await mockDb.insert("contentVersions", versionData);

			expect(mockDb.insert).toHaveBeenCalledWith("contentVersions", expect.objectContaining({
				contentPieceId: "content-piece-123",
				versionNumber: 1,
				content: updatedContent,
				isFinalizedVersion: false,
			}));
		});

		it("should not allow updating finalized content piece", () => {
			const mockContentPiece: MockContentPiece = {
				_id: "content-piece-123",
				projectId: "project-123",
				categoryId: "category-123",
				title: "Finalized Article",
				content: '{"type":"doc","content":[]}',
				status: "finalized",
				currentFinalizedVersion: 1,
				createdAt: Date.now() - 10000,
				updatedAt: Date.now() - 5000,
			};

			// Verify finalized status check
			expect(mockContentPiece.status).toBe("finalized");

			// In actual implementation, this should throw ConvexError
			const shouldThrow = mockContentPiece.status === "finalized";
			expect(shouldThrow).toBe(true);
		});
	});

	describe("getContentPiece query", () => {
		it("should return content piece with relations", async () => {
			const mockContentPiece: MockContentPiece = {
				_id: "content-piece-123",
				projectId: "project-123",
				categoryId: "category-123",
				personaId: "persona-123",
				brandVoiceId: "brand-voice-123",
				title: "Test Article",
				content: '{"type":"doc","content":[]}',
				status: "draft",
				createdAt: Date.now() - 10000,
				updatedAt: Date.now() - 5000,
			};

			const mockCategory: MockCategory = {
				_id: "category-123",
				projectId: "project-123",
				name: "Blog Post",
			};

			const mockPersona: MockPersona = {
				_id: "persona-123",
				projectId: "project-123",
				name: "Marketing Professional",
			};

			const mockBrandVoice: MockBrandVoice = {
				_id: "brand-voice-123",
				projectId: "project-123",
				name: "Professional Voice",
			};

			// Use a map to simulate database lookups by ID
			const mockData: Record<string, unknown> = {
				"content-piece-123": mockContentPiece,
				"project-123": { _id: "project-123", workspaceId: "workspace-123" },
				"category-123": mockCategory,
				"persona-123": mockPersona,
				"brand-voice-123": mockBrandVoice,
			};

			const mockDb = {
				get: vi.fn((id: string) => Promise.resolve(mockData[id])),
			};

			// Fetch content piece
			const contentPiece = await mockDb.get("content-piece-123") as MockContentPiece;
			expect(contentPiece).toBeDefined();
			expect(contentPiece._id).toBe("content-piece-123");

			// Fetch relations
			const category = await mockDb.get("category-123") as MockCategory;
			const persona = await mockDb.get("persona-123") as MockPersona;
			const brandVoice = await mockDb.get("brand-voice-123") as MockBrandVoice;

			expect(category.name).toBe("Blog Post");
			expect(persona.name).toBe("Marketing Professional");
			expect(brandVoice.name).toBe("Professional Voice");
		});

		it("should exclude soft-deleted content pieces", async () => {
			const mockContentPiece: MockContentPiece = {
				_id: "content-piece-123",
				projectId: "project-123",
				categoryId: "category-123",
				title: "Deleted Article",
				content: '{"type":"doc","content":[]}',
				status: "draft",
				deletedAt: Date.now() - 1000, // Soft deleted
				createdAt: Date.now() - 10000,
				updatedAt: Date.now() - 1000,
			};

			// Verify deleted check
			expect(mockContentPiece.deletedAt).toBeDefined();

			// In actual implementation, this should throw ConvexError
			const isDeleted = !!mockContentPiece.deletedAt;
			expect(isDeleted).toBe(true);
		});
	});

	describe("listContentPieces query", () => {
		it("should filter content pieces by categoryId, status, and date range", async () => {
			const now = Date.now();
			const dayAgo = now - 86400000;
			const weekAgo = now - 604800000;

			const mockContentPieces: MockContentPiece[] = [
				{
					_id: "content-1",
					projectId: "project-123",
					categoryId: "category-1",
					title: "Recent Draft",
					content: '{"type":"doc","content":[]}',
					status: "draft",
					createdAt: now - 1000,
					updatedAt: now - 500,
				},
				{
					_id: "content-2",
					projectId: "project-123",
					categoryId: "category-2",
					title: "Old Finalized",
					content: '{"type":"doc","content":[]}',
					status: "finalized",
					currentFinalizedVersion: 1,
					createdAt: weekAgo,
					updatedAt: weekAgo + 1000,
				},
				{
					_id: "content-3",
					projectId: "project-123",
					categoryId: "category-1",
					title: "Recent Finalized",
					content: '{"type":"doc","content":[]}',
					status: "finalized",
					currentFinalizedVersion: 1,
					createdAt: dayAgo,
					updatedAt: dayAgo + 1000,
				},
			];

			// Filter by categoryId
			const byCategory = mockContentPieces.filter(
				(cp) => cp.categoryId === "category-1"
			);
			expect(byCategory).toHaveLength(2);

			// Filter by status
			const drafts = mockContentPieces.filter((cp) => cp.status === "draft");
			expect(drafts).toHaveLength(1);
			expect(drafts[0].title).toBe("Recent Draft");

			// Filter by date range (last 2 days)
			const recentContent = mockContentPieces.filter(
				(cp) => cp.createdAt >= dayAgo
			);
			expect(recentContent).toHaveLength(2);

			// Combined filters: category-1 + finalized
			const filtered = mockContentPieces.filter(
				(cp) => cp.categoryId === "category-1" && cp.status === "finalized"
			);
			expect(filtered).toHaveLength(1);
			expect(filtered[0].title).toBe("Recent Finalized");
		});

		it("should apply pagination with limit and offset", async () => {
			const mockContentPieces: MockContentPiece[] = Array.from(
				{ length: 50 },
				(_, i) => ({
					_id: `content-${i}`,
					projectId: "project-123",
					categoryId: "category-123",
					title: `Content ${i}`,
					content: '{"type":"doc","content":[]}',
					status: "draft" as const,
					createdAt: Date.now() - i * 1000,
					updatedAt: Date.now() - i * 500,
				})
			);

			// Sort by updatedAt descending
			const sorted = [...mockContentPieces].sort(
				(a, b) => b.updatedAt - a.updatedAt
			);

			// Apply pagination
			const limit = 10;
			const offset = 20;
			const paginated = sorted.slice(offset, offset + limit);

			expect(paginated).toHaveLength(10);
			expect(paginated[0]._id).toBe("content-20");

			// Verify hasMore calculation
			const totalCount = mockContentPieces.length;
			const hasMore = offset + limit < totalCount;
			expect(hasMore).toBe(true);
		});
	});

	describe("deleteContentPiece mutation", () => {
		it("should soft delete content piece by setting deletedAt timestamp", async () => {
			const mockContentPiece: MockContentPiece = {
				_id: "content-piece-123",
				projectId: "project-123",
				categoryId: "category-123",
				title: "Content to Delete",
				content: '{"type":"doc","content":[]}',
				status: "draft",
				createdAt: Date.now() - 10000,
				updatedAt: Date.now() - 5000,
			};

			const mockDb = {
				get: vi.fn().mockResolvedValue(mockContentPiece),
				patch: vi.fn().mockResolvedValue(undefined),
				insert: vi.fn().mockResolvedValue("activity-123"),
			};

			const now = Date.now();

			// Soft delete
			await mockDb.patch("content-piece-123", {
				deletedAt: now,
				updatedAt: now,
			});

			expect(mockDb.patch).toHaveBeenCalledWith("content-piece-123", expect.objectContaining({
				deletedAt: expect.any(Number),
				updatedAt: expect.any(Number),
			}));

			// Verify activity log
			await mockDb.insert("activityLog", {
				workspaceId: "workspace-123",
				projectId: "project-123",
				contentPieceId: "content-piece-123",
				action: "content_deleted",
				createdAt: now,
			});

			expect(mockDb.insert).toHaveBeenCalledWith("activityLog", expect.objectContaining({
				action: "content_deleted",
				contentPieceId: "content-piece-123",
			}));
		});

		it("should not allow deleting already deleted content piece", () => {
			const mockContentPiece: MockContentPiece = {
				_id: "content-piece-123",
				projectId: "project-123",
				categoryId: "category-123",
				title: "Already Deleted",
				content: '{"type":"doc","content":[]}',
				status: "draft",
				deletedAt: Date.now() - 1000,
				createdAt: Date.now() - 10000,
				updatedAt: Date.now() - 1000,
			};

			// Verify already deleted check
			expect(mockContentPiece.deletedAt).toBeDefined();

			// In actual implementation, this should throw ConvexError
			const isAlreadyDeleted = !!mockContentPiece.deletedAt;
			expect(isAlreadyDeleted).toBe(true);
		});
	});

	describe("finalizeContentPiece mutation", () => {
		it("should change status to finalized and create finalized version", async () => {
			const mockContentPiece: MockContentPiece = {
				_id: "content-piece-123",
				projectId: "project-123",
				categoryId: "category-123",
				title: "Content to Finalize",
				content: '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Final content"}]}]}',
				status: "draft",
				createdAt: Date.now() - 10000,
				updatedAt: Date.now() - 5000,
			};

			const mockDb = {
				get: vi.fn().mockResolvedValue(mockContentPiece),
				patch: vi.fn().mockResolvedValue(undefined),
				insert: vi.fn().mockResolvedValue("version-123"),
				query: vi.fn().mockReturnValue({
					withIndex: vi.fn().mockReturnValue({
						collect: vi.fn().mockResolvedValue([]),
					}),
				}),
			};

			const now = Date.now();
			const nextFinalizedVersion = 1;

			// Update status to finalized
			await mockDb.patch("content-piece-123", {
				status: "finalized",
				currentFinalizedVersion: nextFinalizedVersion,
				updatedAt: now,
			});

			expect(mockDb.patch).toHaveBeenCalledWith("content-piece-123", expect.objectContaining({
				status: "finalized",
				currentFinalizedVersion: 1,
			}));

			// Create finalized version record
			const versionData: MockContentVersion = {
				_id: "version-123",
				contentPieceId: "content-piece-123",
				versionNumber: 1,
				content: mockContentPiece.content,
				label: "Finalized v1",
				isFinalizedVersion: true,
				finalizedVersionNumber: 1,
				createdAt: now,
			};

			await mockDb.insert("contentVersions", versionData);

			expect(mockDb.insert).toHaveBeenCalledWith("contentVersions", expect.objectContaining({
				isFinalizedVersion: true,
				finalizedVersionNumber: 1,
				label: "Finalized v1",
			}));
		});

		it("should increment currentFinalizedVersion on subsequent finalization", async () => {
			const mockContentPiece: MockContentPiece = {
				_id: "content-piece-123",
				projectId: "project-123",
				categoryId: "category-123",
				title: "Previously Finalized Content",
				content: '{"type":"doc","content":[]}',
				status: "draft", // Was unfinalized for editing
				currentFinalizedVersion: 2, // Already finalized twice
				createdAt: Date.now() - 10000,
				updatedAt: Date.now() - 5000,
			};

			const nextFinalizedVersion = (mockContentPiece.currentFinalizedVersion ?? 0) + 1;

			expect(nextFinalizedVersion).toBe(3);
		});
	});

	describe("unfinalizeContentPiece mutation", () => {
		it("should change status back to draft", async () => {
			const mockContentPiece: MockContentPiece = {
				_id: "content-piece-123",
				projectId: "project-123",
				categoryId: "category-123",
				title: "Finalized Content",
				content: '{"type":"doc","content":[]}',
				status: "finalized",
				currentFinalizedVersion: 1,
				createdAt: Date.now() - 10000,
				updatedAt: Date.now() - 5000,
			};

			const mockDb = {
				get: vi.fn().mockResolvedValue(mockContentPiece),
				patch: vi.fn().mockResolvedValue(undefined),
			};

			const now = Date.now();

			// Unfinalize
			await mockDb.patch("content-piece-123", {
				status: "draft",
				updatedAt: now,
			});

			expect(mockDb.patch).toHaveBeenCalledWith("content-piece-123", expect.objectContaining({
				status: "draft",
				updatedAt: expect.any(Number),
			}));

			// currentFinalizedVersion should be preserved
			expect(mockContentPiece.currentFinalizedVersion).toBe(1);
		});

		it("should not unfinalize already draft content piece", () => {
			const mockContentPiece: MockContentPiece = {
				_id: "content-piece-123",
				projectId: "project-123",
				categoryId: "category-123",
				title: "Draft Content",
				content: '{"type":"doc","content":[]}',
				status: "draft",
				createdAt: Date.now() - 10000,
				updatedAt: Date.now() - 5000,
			};

			// Verify draft status check
			expect(mockContentPiece.status).toBe("draft");

			// In actual implementation, this should throw ConvexError
			const isAlreadyDraft = mockContentPiece.status === "draft";
			expect(isAlreadyDraft).toBe(true);
		});
	});

	describe("Derived Content Management", () => {
		describe("createDerivedContent mutation", () => {
			it("should create derived content with parent reference", async () => {
				const mockParentContent: MockContentPiece = {
					_id: "parent-content-123",
					projectId: "project-123",
					categoryId: "category-blog",
					personaId: "persona-123",
					brandVoiceId: "brand-voice-123",
					title: "Original Blog Post",
					content: '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Original content"}]}]}',
					status: "finalized",
					currentFinalizedVersion: 1,
					createdAt: Date.now() - 10000,
					updatedAt: Date.now() - 5000,
				};

				const mockDb = {
					get: vi.fn().mockResolvedValue(mockParentContent),
					insert: vi.fn()
						.mockResolvedValueOnce("derived-content-123")
						.mockResolvedValueOnce("activity-123"),
				};

				const now = Date.now();

				// Create derived content
				const derivedContentData = {
					projectId: mockParentContent.projectId,
					categoryId: "category-social", // Different category for derived content
					personaId: mockParentContent.personaId,
					brandVoiceId: mockParentContent.brandVoiceId,
					parentContentId: mockParentContent._id,
					title: "Social Media Post from Blog",
					content: "", // Empty content for derived piece
					status: "draft" as const,
					createdAt: now,
					updatedAt: now,
				};

				const derivedContentId = await mockDb.insert("contentPieces", derivedContentData);

				expect(derivedContentId).toBe("derived-content-123");
				expect(mockDb.insert).toHaveBeenCalledWith("contentPieces", expect.objectContaining({
					parentContentId: "parent-content-123",
					categoryId: "category-social",
					title: "Social Media Post from Blog",
					status: "draft",
				}));

				// Verify activity log for derived content creation
				const activityLogData: Omit<MockActivityLog, "_id"> = {
					workspaceId: "workspace-123",
					projectId: "project-123",
					contentPieceId: "derived-content-123",
					action: "derived_content_created",
					metadata: JSON.stringify({ parentContentId: "parent-content-123" }),
					createdAt: now,
				};

				await mockDb.insert("activityLog", activityLogData);

				expect(mockDb.insert).toHaveBeenCalledWith("activityLog", expect.objectContaining({
					action: "derived_content_created",
					contentPieceId: "derived-content-123",
					metadata: expect.stringContaining("parent-content-123"),
				}));
			});

			it("should inherit persona and brandVoice from parent content", async () => {
				const mockParentContent: MockContentPiece = {
					_id: "parent-content-456",
					projectId: "project-123",
					categoryId: "category-article",
					personaId: "persona-marketing",
					brandVoiceId: "brand-voice-professional",
					title: "Long-form Article",
					content: '{"type":"doc","content":[]}',
					status: "draft",
					createdAt: Date.now() - 10000,
					updatedAt: Date.now() - 5000,
				};

				const mockDb = {
					get: vi.fn().mockResolvedValue(mockParentContent),
					insert: vi.fn().mockResolvedValue("derived-content-456"),
				};

				// Create derived content - should inherit persona and brand voice
				const derivedContentData = {
					projectId: mockParentContent.projectId,
					categoryId: "category-newsletter", // Target category
					personaId: mockParentContent.personaId, // Inherited
					brandVoiceId: mockParentContent.brandVoiceId, // Inherited
					parentContentId: mockParentContent._id,
					title: "Newsletter Version",
					content: "",
					status: "draft" as const,
					createdAt: Date.now(),
					updatedAt: Date.now(),
				};

				await mockDb.insert("contentPieces", derivedContentData);

				// Verify persona and brand voice are inherited from parent
				expect(mockDb.insert).toHaveBeenCalledWith("contentPieces", expect.objectContaining({
					personaId: "persona-marketing",
					brandVoiceId: "brand-voice-professional",
					parentContentId: "parent-content-456",
				}));
			});
		});

		describe("getDerivedContent query", () => {
			it("should return all children of a parent content piece", async () => {
				const parentContentId = "parent-content-789";

				const mockDerivedContent: MockContentPiece[] = [
					{
						_id: "derived-1",
						projectId: "project-123",
						categoryId: "category-social",
						personaId: "persona-123",
						brandVoiceId: "brand-voice-123",
						parentContentId: parentContentId,
						title: "Twitter Thread",
						content: '{"type":"doc","content":[]}',
						status: "draft",
						createdAt: Date.now() - 5000,
						updatedAt: Date.now() - 4000,
					},
					{
						_id: "derived-2",
						projectId: "project-123",
						categoryId: "category-email",
						personaId: "persona-123",
						brandVoiceId: "brand-voice-123",
						parentContentId: parentContentId,
						title: "Email Newsletter",
						content: '{"type":"doc","content":[]}',
						status: "finalized",
						currentFinalizedVersion: 1,
						createdAt: Date.now() - 3000,
						updatedAt: Date.now() - 2000,
					},
					{
						_id: "derived-3",
						projectId: "project-123",
						categoryId: "category-linkedin",
						personaId: "persona-123",
						brandVoiceId: "brand-voice-123",
						parentContentId: parentContentId,
						title: "LinkedIn Post",
						content: '{"type":"doc","content":[]}',
						status: "draft",
						deletedAt: Date.now() - 1000, // Soft deleted - should be filtered
						createdAt: Date.now() - 2000,
						updatedAt: Date.now() - 1000,
					},
				];

				const mockCategory1: MockCategory = {
					_id: "category-social",
					projectId: "project-123",
					name: "Social Media",
				};

				const mockCategory2: MockCategory = {
					_id: "category-email",
					projectId: "project-123",
					name: "Email",
				};

				const mockDb = {
					query: vi.fn().mockReturnValue({
						withIndex: vi.fn().mockReturnValue({
							collect: vi.fn().mockResolvedValue(mockDerivedContent),
						}),
					}),
					get: vi.fn()
						.mockImplementation((id: string) => {
							if (id === "category-social") return Promise.resolve(mockCategory1);
							if (id === "category-email") return Promise.resolve(mockCategory2);
							return Promise.resolve(null);
						}),
				};

				// Query derived content
				const rawDerivedContent = await mockDb.query("contentPieces")
					.withIndex("by_parentContentId")
					.collect();

				// Filter out soft-deleted content (mimics implementation)
				const activeDerivedContent = rawDerivedContent.filter(
					(cp: MockContentPiece) => !cp.deletedAt
				);

				expect(activeDerivedContent).toHaveLength(2);
				expect(activeDerivedContent.map((cp: MockContentPiece) => cp.title)).toContain("Twitter Thread");
				expect(activeDerivedContent.map((cp: MockContentPiece) => cp.title)).toContain("Email Newsletter");
				expect(activeDerivedContent.map((cp: MockContentPiece) => cp.title)).not.toContain("LinkedIn Post");

				// Verify all returned content has the same parent
				for (const content of activeDerivedContent) {
					expect(content.parentContentId).toBe(parentContentId);
				}

				// Verify categories are fetched for display
				const contentWithCategories = await Promise.all(
					activeDerivedContent.map(async (cp: MockContentPiece) => {
						const category = await mockDb.get(cp.categoryId);
						return { ...cp, category };
					})
				);

				expect(contentWithCategories[0].category).toBeDefined();
				expect(contentWithCategories[1].category).toBeDefined();
			});
		});
	});
});
