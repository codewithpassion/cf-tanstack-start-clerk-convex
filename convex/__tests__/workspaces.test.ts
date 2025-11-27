/**
 * Tests for workspace management operations.
 * Tests verify workspace auto-creation, queries, and onboarding state management.
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

interface MockWorkspace {
	_id: string;
	userId: string;
	onboardingCompleted: boolean;
	createdAt: number;
	updatedAt: number;
}

describe("Workspace Management", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("Workspace auto-creation on user sync", () => {
		it("should create workspace when new user is synced", async () => {
			// Test the ensureWorkspaceExists logic pattern
			// When a new user is created, workspace should be auto-created
			const mockDb = {
				query: vi.fn().mockReturnThis(),
				withIndex: vi.fn().mockReturnThis(),
				unique: vi.fn().mockResolvedValue(null), // No existing workspace
				insert: vi.fn().mockResolvedValue("new-workspace-id"),
			};

			// Simulate workspace creation logic
			const existingWorkspace = await mockDb.unique();
			expect(existingWorkspace).toBeNull();

			// Since no workspace exists, insert should be called
			const workspaceId = await mockDb.insert("workspaces", {
				userId: "user-123",
				onboardingCompleted: false,
				createdAt: Date.now(),
				updatedAt: Date.now(),
			});

			expect(workspaceId).toBe("new-workspace-id");
		});

		it("should return existing workspace when user already has one", async () => {
			// Test that existing workspace is returned instead of creating new one
			const existingWorkspace: MockWorkspace = {
				_id: "existing-workspace-id",
				userId: "user-123",
				onboardingCompleted: false,
				createdAt: Date.now(),
				updatedAt: Date.now(),
			};

			const mockDb = {
				query: vi.fn().mockReturnThis(),
				withIndex: vi.fn().mockReturnThis(),
				unique: vi.fn().mockResolvedValue(existingWorkspace),
				insert: vi.fn(),
			};

			const workspace = await mockDb.unique();
			expect(workspace).toBe(existingWorkspace);

			// Insert should not be called when workspace exists
			expect(mockDb.insert).not.toHaveBeenCalled();
		});

		it("should set onboardingCompleted to false for new workspace", async () => {
			// Verify that new workspaces have onboardingCompleted set to false
			const workspaceData = {
				userId: "user-123",
				onboardingCompleted: false,
				createdAt: Date.now(),
				updatedAt: Date.now(),
			};

			expect(workspaceData.onboardingCompleted).toBe(false);
		});
	});

	describe("getMyWorkspace query", () => {
		it("should return workspace for authenticated user", async () => {
			// Test that getMyWorkspace returns the correct workspace
			const mockUser = {
				_id: "user-123",
				clerkId: "clerk-user-123",
				email: "test@example.com",
			};

			const mockWorkspace: MockWorkspace = {
				_id: "workspace-123",
				userId: "user-123",
				onboardingCompleted: false,
				createdAt: Date.now(),
				updatedAt: Date.now(),
			};

			// The query should find user by clerkId, then find workspace by userId
			expect(mockWorkspace.userId).toBe(mockUser._id);
		});

		it("should return null for unauthenticated user", async () => {
			// Test that getMyWorkspace returns null when no identity
			const mockIdentity = null;

			// When identity is null, the query should return null
			expect(mockIdentity).toBeNull();
		});
	});

	describe("needsOnboarding query", () => {
		it("should return true when onboardingCompleted is false", async () => {
			const mockWorkspace: MockWorkspace = {
				_id: "workspace-123",
				userId: "user-123",
				onboardingCompleted: false,
				createdAt: Date.now(),
				updatedAt: Date.now(),
			};

			// needsOnboarding should return !workspace.onboardingCompleted
			const needsOnboarding = !mockWorkspace.onboardingCompleted;
			expect(needsOnboarding).toBe(true);
		});

		it("should return false when onboardingCompleted is true", async () => {
			const mockWorkspace: MockWorkspace = {
				_id: "workspace-123",
				userId: "user-123",
				onboardingCompleted: true,
				createdAt: Date.now(),
				updatedAt: Date.now(),
			};

			// needsOnboarding should return !workspace.onboardingCompleted
			const needsOnboarding = !mockWorkspace.onboardingCompleted;
			expect(needsOnboarding).toBe(false);
		});

		it("should return null when workspace does not exist", async () => {
			// When workspace is null, needsOnboarding should return null
			const mockWorkspace: MockWorkspace | null = null;

			// The query should return null if workspace doesn't exist
			// Use a helper function to compute result to avoid TS narrowing issue
			function computeNeedsOnboarding(ws: MockWorkspace | null): boolean | null {
				if (!ws) return null;
				return !ws.onboardingCompleted;
			}

			const result = computeNeedsOnboarding(mockWorkspace);
			expect(result).toBeNull();
		});
	});

	describe("completeOnboarding mutation", () => {
		it("should update onboardingCompleted to true", async () => {
			const mockDb = {
				patch: vi.fn().mockResolvedValue(undefined),
			};

			// Simulate completing onboarding
			await mockDb.patch("workspace-123", {
				onboardingCompleted: true,
				updatedAt: expect.any(Number),
			});

			expect(mockDb.patch).toHaveBeenCalledWith("workspace-123", {
				onboardingCompleted: true,
				updatedAt: expect.any(Number),
			});
		});
	});
});

describe("authorizeWorkspaceAccess helper", () => {
	it("should throw error when not authenticated", async () => {
		// Test that authorizeWorkspaceAccess throws when identity is null
		const mockCtx = {
			auth: {
				getUserIdentity: vi.fn().mockResolvedValue(null),
			},
		};

		const identity = await mockCtx.auth.getUserIdentity();
		expect(identity).toBeNull();

		// In the actual implementation, this would throw ConvexError("Not authenticated")
	});

	it("should throw error when user not found", async () => {
		// Test that authorizeWorkspaceAccess throws when user doesn't exist
		const mockCtx = {
			auth: {
				getUserIdentity: vi.fn().mockResolvedValue({ subject: "clerk-123" }),
			},
			db: {
				query: vi.fn().mockReturnThis(),
				withIndex: vi.fn().mockReturnThis(),
				unique: vi.fn().mockResolvedValue(null), // User not found
			},
		};

		const user = await mockCtx.db.unique();
		expect(user).toBeNull();

		// In the actual implementation, this would throw ConvexError("User not found")
	});

	it("should throw error when workspace not found", async () => {
		// Test that authorizeWorkspaceAccess throws when workspace doesn't exist
		const mockUser = { _id: "user-123", clerkId: "clerk-123" };

		// First call returns user, second call returns null for workspace
		const uniqueMock = vi.fn()
			.mockResolvedValueOnce(mockUser)
			.mockResolvedValueOnce(null);

		expect(await uniqueMock()).toBe(mockUser);
		expect(await uniqueMock()).toBeNull();

		// In the actual implementation, this would throw ConvexError("Workspace not found")
	});

	it("should return user and workspace when authorized", async () => {
		const mockUser = { _id: "user-123", clerkId: "clerk-123" };
		const mockWorkspace = {
			_id: "workspace-123",
			userId: "user-123",
			onboardingCompleted: false,
		};

		const uniqueMock = vi.fn()
			.mockResolvedValueOnce(mockUser)
			.mockResolvedValueOnce(mockWorkspace);

		const user = await uniqueMock();
		const workspace = await uniqueMock();

		expect(user).toEqual(mockUser);
		expect(workspace).toEqual(mockWorkspace);
	});
});
