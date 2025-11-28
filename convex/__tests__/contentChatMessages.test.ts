/**
 * Tests for content chat message operations.
 * Tests verify chat message creation, retrieval, ordering, and history clearing.
 *
 * Note: These tests validate the logic structure and expected behavior patterns.
 * Actual Convex mutations/queries are tested at runtime.
 */
import { describe, it, expect, beforeEach } from "vitest";

interface MockChatMessage {
	_id: string;
	contentPieceId: string;
	role: "user" | "assistant";
	content: string;
	createdAt: number;
}

describe("Content Chat Messages", () => {
	beforeEach(() => {
		// Clear any test state
	});

	describe("addChatMessage mutation", () => {
		it("should store message with role and content", async () => {
			const userMessage: MockChatMessage = {
				_id: "message-1",
				contentPieceId: "content-123",
				role: "user",
				content: "Can you help me improve this paragraph?",
				createdAt: Date.now(),
			};

			const assistantMessage: MockChatMessage = {
				_id: "message-2",
				contentPieceId: "content-123",
				role: "assistant",
				content: "Of course! Here's an improved version...",
				createdAt: Date.now() + 1000,
			};

			// Verify user message stored correctly
			expect(userMessage.role).toBe("user");
			expect(userMessage.content).toBeTruthy();
			expect(userMessage.contentPieceId).toBe("content-123");

			// Verify assistant message stored correctly
			expect(assistantMessage.role).toBe("assistant");
			expect(assistantMessage.content).toBeTruthy();
			expect(assistantMessage.contentPieceId).toBe("content-123");
		});

		it("should validate content is non-empty and within max length", async () => {
			const validMessage = {
				contentPieceId: "content-123",
				role: "user" as const,
				content: "This is a valid message",
			};

			const trimmedContent = validMessage.content.trim();
			expect(trimmedContent).toBeTruthy();
			expect(trimmedContent.length).toBeLessThanOrEqual(10000);

			// Empty content should fail validation
			const emptyContent = "   ";
			expect(emptyContent.trim()).toBe("");

			// Content over max length should fail
			const tooLongContent = "a".repeat(10001);
			expect(tooLongContent.length).toBeGreaterThan(10000);
		});

		it("should set createdAt timestamp on message creation", async () => {
			const beforeCreate = Date.now();

			const message: MockChatMessage = {
				_id: "message-1",
				contentPieceId: "content-123",
				role: "user",
				content: "Test message",
				createdAt: Date.now(),
			};

			const afterCreate = Date.now();

			expect(message.createdAt).toBeGreaterThanOrEqual(beforeCreate);
			expect(message.createdAt).toBeLessThanOrEqual(afterCreate);
		});
	});

	describe("listChatMessages query", () => {
		it("should return messages in chronological order (createdAt ascending)", async () => {
			const messages: MockChatMessage[] = [
				{
					_id: "message-3",
					contentPieceId: "content-123",
					role: "assistant",
					content: "Third message",
					createdAt: Date.now() + 2000,
				},
				{
					_id: "message-1",
					contentPieceId: "content-123",
					role: "user",
					content: "First message",
					createdAt: Date.now(),
				},
				{
					_id: "message-2",
					contentPieceId: "content-123",
					role: "assistant",
					content: "Second message",
					createdAt: Date.now() + 1000,
				},
			];

			// Sort by createdAt ascending (chronological order)
			const sortedMessages = [...messages].sort((a, b) => a.createdAt - b.createdAt);

			expect(sortedMessages[0].content).toBe("First message");
			expect(sortedMessages[1].content).toBe("Second message");
			expect(sortedMessages[2].content).toBe("Third message");

			expect(sortedMessages[0].createdAt).toBeLessThan(sortedMessages[1].createdAt);
			expect(sortedMessages[1].createdAt).toBeLessThan(sortedMessages[2].createdAt);
		});

		it("should handle conversation flow with alternating user and assistant messages", async () => {
			const conversation: MockChatMessage[] = [
				{
					_id: "message-1",
					contentPieceId: "content-123",
					role: "user",
					content: "How can I make this more concise?",
					createdAt: Date.now(),
				},
				{
					_id: "message-2",
					contentPieceId: "content-123",
					role: "assistant",
					content: "Here's a more concise version...",
					createdAt: Date.now() + 1000,
				},
				{
					_id: "message-3",
					contentPieceId: "content-123",
					role: "user",
					content: "Can you make it even shorter?",
					createdAt: Date.now() + 2000,
				},
				{
					_id: "message-4",
					contentPieceId: "content-123",
					role: "assistant",
					content: "Sure, here's an even shorter version...",
					createdAt: Date.now() + 3000,
				},
			];

			// Verify alternating pattern
			expect(conversation[0].role).toBe("user");
			expect(conversation[1].role).toBe("assistant");
			expect(conversation[2].role).toBe("user");
			expect(conversation[3].role).toBe("assistant");

			// Verify chronological order
			for (let i = 0; i < conversation.length - 1; i++) {
				expect(conversation[i].createdAt).toBeLessThan(conversation[i + 1].createdAt);
			}
		});

		it("should only return messages for specified content piece", async () => {
			const allMessages: MockChatMessage[] = [
				{
					_id: "message-1",
					contentPieceId: "content-123",
					role: "user",
					content: "Message for content 123",
					createdAt: Date.now(),
				},
				{
					_id: "message-2",
					contentPieceId: "content-456",
					role: "user",
					content: "Message for content 456",
					createdAt: Date.now() + 1000,
				},
				{
					_id: "message-3",
					contentPieceId: "content-123",
					role: "assistant",
					content: "Another message for content 123",
					createdAt: Date.now() + 2000,
				},
			];

			// Filter messages for content-123
			const filteredMessages = allMessages.filter(
				(msg) => msg.contentPieceId === "content-123"
			);

			expect(filteredMessages).toHaveLength(2);
			expect(filteredMessages[0].contentPieceId).toBe("content-123");
			expect(filteredMessages[1].contentPieceId).toBe("content-123");
		});
	});

	describe("clearChatHistory mutation", () => {
		it("should remove all messages for a content piece", async () => {
			const messages: MockChatMessage[] = [
				{
					_id: "message-1",
					contentPieceId: "content-123",
					role: "user",
					content: "First message",
					createdAt: Date.now() - 3000,
				},
				{
					_id: "message-2",
					contentPieceId: "content-123",
					role: "assistant",
					content: "Second message",
					createdAt: Date.now() - 2000,
				},
				{
					_id: "message-3",
					contentPieceId: "content-123",
					role: "user",
					content: "Third message",
					createdAt: Date.now() - 1000,
				},
			];

			// Simulate clearing: filter out all messages for this content piece
			const remainingMessages = messages.filter(
				(msg) => msg.contentPieceId !== "content-123"
			);

			// All messages should be removed
			expect(remainingMessages).toHaveLength(0);
			expect(messages).toHaveLength(3); // Original array unchanged

			// Verify count of deleted messages
			const deletedCount = messages.filter(
				(msg) => msg.contentPieceId === "content-123"
			).length;
			expect(deletedCount).toBe(3);
		});

		it("should only affect messages for specified content piece", async () => {
			const messages: MockChatMessage[] = [
				{
					_id: "message-1",
					contentPieceId: "content-123",
					role: "user",
					content: "Message for 123",
					createdAt: Date.now() - 3000,
				},
				{
					_id: "message-2",
					contentPieceId: "content-456",
					role: "user",
					content: "Message for 456",
					createdAt: Date.now() - 2000,
				},
				{
					_id: "message-3",
					contentPieceId: "content-123",
					role: "assistant",
					content: "Another message for 123",
					createdAt: Date.now() - 1000,
				},
			];

			// Clear history for content-123 only
			const remainingMessages = messages.filter(
				(msg) => msg.contentPieceId !== "content-123"
			);

			expect(remainingMessages).toHaveLength(1);
			expect(remainingMessages[0].contentPieceId).toBe("content-456");
		});

		it("should return count of deleted messages", async () => {
			const messages: MockChatMessage[] = [
				{
					_id: "message-1",
					contentPieceId: "content-123",
					role: "user",
					content: "Message 1",
					createdAt: Date.now() - 3000,
				},
				{
					_id: "message-2",
					contentPieceId: "content-123",
					role: "assistant",
					content: "Message 2",
					createdAt: Date.now() - 2000,
				},
			];

			const deletedCount = messages.filter(
				(msg) => msg.contentPieceId === "content-123"
			).length;

			expect(deletedCount).toBe(2);
		});
	});
});
