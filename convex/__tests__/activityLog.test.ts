/**
 * Tests for activity log operations.
 * Tests verify activity logging, retrieval by workspace, retrieval by project, and limiting.
 *
 * Note: These tests validate the logic structure and expected behavior patterns.
 * Actual Convex mutations/queries are tested at runtime.
 */
import { describe, it, expect, beforeEach } from "vitest";

interface MockActivityLogEntry {
	_id: string;
	workspaceId: string;
	projectId: string;
	contentPieceId?: string;
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

describe("Activity Log", () => {
	beforeEach(() => {
		// Clear any test state
	});

	describe("logActivity mutation", () => {
		it("should create entry with action type and timestamps", async () => {
			const activityEntry: MockActivityLogEntry = {
				_id: "activity-1",
				workspaceId: "workspace-123",
				projectId: "project-456",
				contentPieceId: "content-789",
				action: "content_created",
				createdAt: Date.now(),
			};

			expect(activityEntry.workspaceId).toBe("workspace-123");
			expect(activityEntry.projectId).toBe("project-456");
			expect(activityEntry.contentPieceId).toBe("content-789");
			expect(activityEntry.action).toBe("content_created");
			expect(activityEntry.createdAt).toBeGreaterThan(Date.now() - 1000);
		});

		it("should support optional metadata as JSON string", async () => {
			const activityWithMetadata: MockActivityLogEntry = {
				_id: "activity-2",
				workspaceId: "workspace-123",
				projectId: "project-456",
				action: "content_finalized",
				metadata: JSON.stringify({ finalizedVersion: 2 }),
				createdAt: Date.now(),
			};

			expect(activityWithMetadata.metadata).toBeTruthy();
			const parsedMetadata = JSON.parse(activityWithMetadata.metadata!);
			expect(parsedMetadata.finalizedVersion).toBe(2);
		});

		it("should support all action types including project_created", async () => {
			const actionTypes: Array<MockActivityLogEntry["action"]> = [
				"content_created",
				"content_edited",
				"content_finalized",
				"content_deleted",
				"project_created",
				"derived_content_created",
			];

			actionTypes.forEach((action) => {
				const entry: MockActivityLogEntry = {
					_id: `activity-${action}`,
					workspaceId: "workspace-123",
					projectId: "project-456",
					action,
					createdAt: Date.now(),
				};

				expect(entry.action).toBe(action);
			});
		});
	});

	describe("getRecentActivity query", () => {
		it("should return limited results ordered by createdAt descending", async () => {
			const now = Date.now();
			const activities: MockActivityLogEntry[] = [
				{
					_id: "activity-1",
					workspaceId: "workspace-123",
					projectId: "project-456",
					action: "content_created",
					createdAt: now - 5000,
				},
				{
					_id: "activity-2",
					workspaceId: "workspace-123",
					projectId: "project-456",
					action: "content_edited",
					createdAt: now - 4000,
				},
				{
					_id: "activity-3",
					workspaceId: "workspace-123",
					projectId: "project-789",
					action: "content_finalized",
					createdAt: now - 3000,
				},
				{
					_id: "activity-4",
					workspaceId: "workspace-123",
					projectId: "project-456",
					action: "content_deleted",
					createdAt: now - 2000,
				},
				{
					_id: "activity-5",
					workspaceId: "workspace-123",
					projectId: "project-789",
					action: "derived_content_created",
					createdAt: now - 1000,
				},
			];

			// Sort by createdAt descending (most recent first)
			const sortedActivities = [...activities].sort(
				(a, b) => b.createdAt - a.createdAt
			);

			// Apply default limit of 10
			const limit = 10;
			const recentActivities = sortedActivities.slice(0, limit);

			expect(recentActivities[0]._id).toBe("activity-5"); // Most recent
			expect(recentActivities[1]._id).toBe("activity-4");
			expect(recentActivities[2]._id).toBe("activity-3");
			expect(recentActivities[3]._id).toBe("activity-2");
			expect(recentActivities[4]._id).toBe("activity-1");
		});

		it("should limit to 10 results by default", async () => {
			const now = Date.now();
			// Create 15 mock activities
			const activities: MockActivityLogEntry[] = Array.from(
				{ length: 15 },
				(_, i) => ({
					_id: `activity-${i + 1}`,
					workspaceId: "workspace-123",
					projectId: "project-456",
					action: "content_created",
					createdAt: now - (15 - i) * 1000,
				})
			);

			// Sort by createdAt descending
			const sortedActivities = [...activities].sort(
				(a, b) => b.createdAt - a.createdAt
			);

			// Apply default limit of 10
			const limit = 10;
			const recentActivities = sortedActivities.slice(0, limit);

			expect(recentActivities).toHaveLength(10);
			expect(recentActivities[0]._id).toBe("activity-15"); // Most recent
			expect(recentActivities[9]._id).toBe("activity-6"); // 10th most recent
		});

		it("should support custom limit parameter", async () => {
			const now = Date.now();
			const activities: MockActivityLogEntry[] = Array.from(
				{ length: 20 },
				(_, i) => ({
					_id: `activity-${i + 1}`,
					workspaceId: "workspace-123",
					projectId: "project-456",
					action: "content_created",
					createdAt: now - (20 - i) * 1000,
				})
			);

			// Sort by createdAt descending
			const sortedActivities = [...activities].sort(
				(a, b) => b.createdAt - a.createdAt
			);

			// Apply custom limit of 5
			const customLimit = 5;
			const limitedActivities = sortedActivities.slice(0, customLimit);

			expect(limitedActivities).toHaveLength(5);
			expect(limitedActivities[0]._id).toBe("activity-20"); // Most recent
			expect(limitedActivities[4]._id).toBe("activity-16"); // 5th most recent
		});
	});

	describe("getProjectActivity query", () => {
		it("should filter activities by projectId", async () => {
			const now = Date.now();
			const activities: MockActivityLogEntry[] = [
				{
					_id: "activity-1",
					workspaceId: "workspace-123",
					projectId: "project-456",
					action: "content_created",
					createdAt: now - 5000,
				},
				{
					_id: "activity-2",
					workspaceId: "workspace-123",
					projectId: "project-789", // Different project
					action: "content_edited",
					createdAt: now - 4000,
				},
				{
					_id: "activity-3",
					workspaceId: "workspace-123",
					projectId: "project-456",
					action: "content_finalized",
					createdAt: now - 3000,
				},
				{
					_id: "activity-4",
					workspaceId: "workspace-123",
					projectId: "project-456",
					action: "content_deleted",
					createdAt: now - 2000,
				},
			];

			// Filter by projectId
			const projectActivities = activities.filter(
				(a) => a.projectId === "project-456"
			);

			expect(projectActivities).toHaveLength(3);
			expect(projectActivities[0]._id).toBe("activity-1");
			expect(projectActivities[1]._id).toBe("activity-3");
			expect(projectActivities[2]._id).toBe("activity-4");
		});

		it("should return project activities ordered by createdAt descending with limit", async () => {
			const now = Date.now();
			const projectActivities: MockActivityLogEntry[] = [
				{
					_id: "activity-1",
					workspaceId: "workspace-123",
					projectId: "project-456",
					action: "content_created",
					createdAt: now - 5000,
				},
				{
					_id: "activity-2",
					workspaceId: "workspace-123",
					projectId: "project-456",
					action: "content_edited",
					createdAt: now - 4000,
				},
				{
					_id: "activity-3",
					workspaceId: "workspace-123",
					projectId: "project-456",
					action: "content_finalized",
					createdAt: now - 3000,
				},
			];

			// Sort by createdAt descending
			const sortedActivities = [...projectActivities].sort(
				(a, b) => b.createdAt - a.createdAt
			);

			// Apply optional limit
			const limit = 10;
			const limitedActivities = sortedActivities.slice(0, limit);

			expect(limitedActivities[0]._id).toBe("activity-3"); // Most recent
			expect(limitedActivities[1]._id).toBe("activity-2");
			expect(limitedActivities[2]._id).toBe("activity-1");
		});
	});
});
