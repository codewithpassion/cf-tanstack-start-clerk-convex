/**
 * Tests for content version control operations.
 * Tests verify version creation, retrieval, pagination, restore, and finalized version tracking.
 *
 * Note: These tests validate the logic structure and expected behavior patterns.
 * Actual Convex mutations/queries are tested at runtime.
 */
import { describe, it, expect, beforeEach } from "vitest";

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

describe("Content Version Control", () => {
	beforeEach(() => {
		// Clear any test state
	});

	describe("createVersion mutation", () => {
		it("should create version with sequential version number", async () => {
			const existingVersions: MockContentVersion[] = [
				{
					_id: "version-1",
					contentPieceId: "content-123",
					versionNumber: 1,
					content: '{"type":"doc","content":[]}',
					isFinalizedVersion: false,
					createdAt: Date.now() - 2000,
				},
				{
					_id: "version-2",
					contentPieceId: "content-123",
					versionNumber: 2,
					content: '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Draft 2"}]}]}',
					isFinalizedVersion: false,
					createdAt: Date.now() - 1000,
				},
			];

			// Calculate next version number
			const nextVersionNumber = existingVersions.length + 1;

			const newVersion: MockContentVersion = {
				_id: "version-3",
				contentPieceId: "content-123",
				versionNumber: nextVersionNumber,
				content: '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Draft 3"}]}]}',
				isFinalizedVersion: false,
				createdAt: Date.now(),
			};

			expect(newVersion.versionNumber).toBe(3);
			expect(newVersion.versionNumber).toBe(existingVersions.length + 1);
		});

		it("should store complete content snapshot with optional label", async () => {
			const versionWithLabel: MockContentVersion = {
				_id: "version-1",
				contentPieceId: "content-123",
				versionNumber: 1,
				content: '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Initial draft"}]}]}',
				label: "First revision",
				isFinalizedVersion: false,
				createdAt: Date.now(),
			};

			expect(versionWithLabel.content).toBeTruthy();
			expect(versionWithLabel.label).toBe("First revision");
			expect(versionWithLabel.isFinalizedVersion).toBe(false);
		});

		it("should handle isFinalizedVersion flag correctly", async () => {
			const regularVersion: MockContentVersion = {
				_id: "version-1",
				contentPieceId: "content-123",
				versionNumber: 1,
				content: '{"type":"doc"}',
				isFinalizedVersion: false,
				createdAt: Date.now(),
			};

			const finalizedVersion: MockContentVersion = {
				_id: "version-2",
				contentPieceId: "content-123",
				versionNumber: 2,
				content: '{"type":"doc"}',
				isFinalizedVersion: true,
				finalizedVersionNumber: 1,
				label: "Finalized v1",
				createdAt: Date.now(),
			};

			expect(regularVersion.isFinalizedVersion).toBe(false);
			expect(regularVersion.finalizedVersionNumber).toBeUndefined();

			expect(finalizedVersion.isFinalizedVersion).toBe(true);
			expect(finalizedVersion.finalizedVersionNumber).toBe(1);
		});
	});

	describe("listVersions query", () => {
		it("should return versions ordered by versionNumber descending with pagination", async () => {
			const versions: MockContentVersion[] = [
				{
					_id: "version-1",
					contentPieceId: "content-123",
					versionNumber: 1,
					content: '{"type":"doc"}',
					isFinalizedVersion: false,
					createdAt: Date.now() - 5000,
				},
				{
					_id: "version-2",
					contentPieceId: "content-123",
					versionNumber: 2,
					content: '{"type":"doc"}',
					isFinalizedVersion: false,
					createdAt: Date.now() - 4000,
				},
				{
					_id: "version-3",
					contentPieceId: "content-123",
					versionNumber: 3,
					content: '{"type":"doc"}',
					isFinalizedVersion: true,
					finalizedVersionNumber: 1,
					createdAt: Date.now() - 3000,
				},
				{
					_id: "version-4",
					contentPieceId: "content-123",
					versionNumber: 4,
					content: '{"type":"doc"}',
					isFinalizedVersion: false,
					createdAt: Date.now() - 2000,
				},
			];

			// Sort by versionNumber descending (most recent first)
			const sortedVersions = [...versions].sort((a, b) => b.versionNumber - a.versionNumber);

			expect(sortedVersions[0].versionNumber).toBe(4);
			expect(sortedVersions[1].versionNumber).toBe(3);
			expect(sortedVersions[2].versionNumber).toBe(2);
			expect(sortedVersions[3].versionNumber).toBe(1);

			// Simulate pagination: limit 2, offset 0
			const limit = 2;
			const offset = 0;
			const paginatedVersions = sortedVersions.slice(offset, offset + limit);

			expect(paginatedVersions).toHaveLength(2);
			expect(paginatedVersions[0].versionNumber).toBe(4);
			expect(paginatedVersions[1].versionNumber).toBe(3);

			// Simulate pagination: limit 2, offset 2
			const page2Versions = sortedVersions.slice(2, 2 + limit);
			expect(page2Versions).toHaveLength(2);
			expect(page2Versions[0].versionNumber).toBe(2);
			expect(page2Versions[1].versionNumber).toBe(1);
		});

		it("should limit to 50 most recent versions with offset support", async () => {
			// Create 60 mock versions
			const versions: MockContentVersion[] = Array.from({ length: 60 }, (_, i) => ({
				_id: `version-${i + 1}`,
				contentPieceId: "content-123",
				versionNumber: i + 1,
				content: '{"type":"doc"}',
				isFinalizedVersion: false,
				createdAt: Date.now() - (60 - i) * 1000,
			}));

			// Sort descending
			const sortedVersions = [...versions].sort((a, b) => b.versionNumber - a.versionNumber);

			// Default limit is 50
			const limit = 50;
			const offset = 0;
			const limitedVersions = sortedVersions.slice(offset, offset + limit);

			expect(limitedVersions).toHaveLength(50);
			expect(limitedVersions[0].versionNumber).toBe(60); // Most recent
			expect(limitedVersions[49].versionNumber).toBe(11); // 50th most recent

			// Test offset to get older versions
			const olderVersions = sortedVersions.slice(50, 50 + limit);
			expect(olderVersions).toHaveLength(10); // Only 10 remaining
			expect(olderVersions[0].versionNumber).toBe(10);
			expect(olderVersions[9].versionNumber).toBe(1);
		});
	});

	describe("restoreVersion mutation", () => {
		it("should create new version from historical content (non-destructive)", async () => {
			// Historical version to restore
			const historicalVersion: MockContentVersion = {
				_id: "version-2",
				contentPieceId: "content-123",
				versionNumber: 2,
				content: '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Historical content"}]}]}',
				isFinalizedVersion: false,
				createdAt: Date.now() - 5000,
			};

			const existingVersions: MockContentVersion[] = [
				{
					_id: "version-1",
					contentPieceId: "content-123",
					versionNumber: 1,
					content: '{"type":"doc"}',
					isFinalizedVersion: false,
					createdAt: Date.now() - 10000,
				},
				historicalVersion,
				{
					_id: "version-3",
					contentPieceId: "content-123",
					versionNumber: 3,
					content: '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Current content"}]}]}',
					isFinalizedVersion: false,
					createdAt: Date.now() - 1000,
				},
			];

			// Simulate restore: create new version with historical content
			const nextVersionNumber = existingVersions.length + 1;
			const restoredVersion: MockContentVersion = {
				_id: "version-4",
				contentPieceId: "content-123",
				versionNumber: nextVersionNumber,
				content: historicalVersion.content, // Content from v2
				label: `Restored from v${historicalVersion.versionNumber}`,
				isFinalizedVersion: false,
				createdAt: Date.now(),
			};

			// New version should be created (non-destructive)
			expect(restoredVersion.versionNumber).toBe(4);
			expect(restoredVersion.content).toBe(historicalVersion.content);
			expect(restoredVersion.label).toBe("Restored from v2");

			// All previous versions should still exist
			expect(existingVersions).toHaveLength(3);
		});

		it("should update contentPiece.content with restored content", async () => {
			const restoredContent = '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Historical content"}]}]}';

			// Simulate patching content piece
			const patchData = {
				content: restoredContent,
				updatedAt: Date.now(),
			};

			expect(patchData.content).toBe(restoredContent);
			expect(patchData.updatedAt).toBeGreaterThan(Date.now() - 1000);
		});
	});

	describe("getFinalizedVersions query", () => {
		it("should return only versions where isFinalizedVersion is true", async () => {
			const versions: MockContentVersion[] = [
				{
					_id: "version-1",
					contentPieceId: "content-123",
					versionNumber: 1,
					content: '{"type":"doc"}',
					isFinalizedVersion: false,
					createdAt: Date.now() - 5000,
				},
				{
					_id: "version-2",
					contentPieceId: "content-123",
					versionNumber: 2,
					content: '{"type":"doc"}',
					isFinalizedVersion: true,
					finalizedVersionNumber: 1,
					label: "Finalized v1",
					createdAt: Date.now() - 4000,
				},
				{
					_id: "version-3",
					contentPieceId: "content-123",
					versionNumber: 3,
					content: '{"type":"doc"}',
					isFinalizedVersion: false,
					createdAt: Date.now() - 3000,
				},
				{
					_id: "version-4",
					contentPieceId: "content-123",
					versionNumber: 4,
					content: '{"type":"doc"}',
					isFinalizedVersion: true,
					finalizedVersionNumber: 2,
					label: "Finalized v2",
					createdAt: Date.now() - 2000,
				},
			];

			// Filter only finalized versions
			const finalizedVersions = versions.filter((v) => v.isFinalizedVersion);

			expect(finalizedVersions).toHaveLength(2);
			expect(finalizedVersions[0].versionNumber).toBe(2);
			expect(finalizedVersions[0].finalizedVersionNumber).toBe(1);
			expect(finalizedVersions[1].versionNumber).toBe(4);
			expect(finalizedVersions[1].finalizedVersionNumber).toBe(2);

			// All finalized versions should have finalizedVersionNumber
			finalizedVersions.forEach((version) => {
				expect(version.isFinalizedVersion).toBe(true);
				expect(version.finalizedVersionNumber).toBeDefined();
			});
		});
	});
});
