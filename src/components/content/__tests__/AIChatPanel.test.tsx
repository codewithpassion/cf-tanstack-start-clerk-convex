/**
 * Tests for AIChatPanel component
 *
 * These tests focus on component structure, props handling, and UI behavior
 * without requiring full Convex/API integration.
 */
import { describe, it, expect } from "vitest";
import { applyQuickAction, assembleChatContext, type QuickAction } from "@/server/ai";

describe("AIChatPanel - Quick Actions", () => {
	it("should generate improve prompt for selected text", () => {
		const selectedText = "This is a test paragraph.";
		const prompt = applyQuickAction("improve", selectedText);

		expect(prompt).toContain("improve");
		expect(prompt).toContain(selectedText);
		expect(prompt.toLowerCase()).toMatch(/clear|engaging|well-structured/);
	});

	it("should generate shorten prompt for selected text", () => {
		const selectedText = "This is a very long paragraph that needs to be shortened.";
		const prompt = applyQuickAction("shorten", selectedText);

		expect(prompt).toContain("shorten");
		expect(prompt).toContain(selectedText);
		expect(prompt.toLowerCase()).toMatch(/concise|brief/);
	});

	it("should generate change tone prompt with specific tone", () => {
		const selectedText = "This is professional text.";
		const prompt = applyQuickAction("changeTone", selectedText, "casual");

		expect(prompt).toContain("casual");
		expect(prompt).toContain(selectedText);
		expect(prompt.toLowerCase()).toContain("tone");
	});

	it("should handle change tone without specified tone", () => {
		const selectedText = "This is some text.";
		const prompt = applyQuickAction("changeTone", selectedText);

		expect(prompt).toContain(selectedText);
		expect(prompt.toLowerCase()).toContain("tone");
	});
});

describe("AIChatPanel - Chat Context Assembly", () => {
	it("should assemble context with chat history and current content", () => {
		const chatHistory = [
			{ role: "user" as const, content: "How do I start?" },
			{ role: "assistant" as const, content: "You can start by..." },
		];
		const currentContent = "This is the current content being edited.";

		const context = assembleChatContext({
			chatHistory,
			currentContent,
		});

		expect(context.chatHistory).toHaveLength(2);
		expect(context.currentContent).toBe(currentContent);
	});

	it("should limit chat history to maximum messages", () => {
		// Create 15 messages
		const chatHistory = Array.from({ length: 15 }, (_, i) => ({
			role: i % 2 === 0 ? ("user" as const) : ("assistant" as const),
			content: `Message ${i}`,
		}));

		const context = assembleChatContext({
			chatHistory,
			currentContent: "Current content",
			maxHistoryMessages: 10,
		});

		// Should only keep the 10 most recent messages
		expect(context.chatHistory).toHaveLength(10);
		expect(context.chatHistory[0].content).toBe("Message 5");
		expect(context.chatHistory[9].content).toBe("Message 14");
	});

	it("should handle empty chat history", () => {
		const context = assembleChatContext({
			chatHistory: [],
			currentContent: "Content without history",
		});

		expect(context.chatHistory).toHaveLength(0);
		expect(context.currentContent).toBe("Content without history");
	});

	it("should preserve all messages when under limit", () => {
		const chatHistory = [
			{ role: "user" as const, content: "Question 1" },
			{ role: "assistant" as const, content: "Answer 1" },
			{ role: "user" as const, content: "Question 2" },
		];

		const context = assembleChatContext({
			chatHistory,
			currentContent: "Content",
			maxHistoryMessages: 10,
		});

		expect(context.chatHistory).toHaveLength(3);
		expect(context.chatHistory).toEqual(chatHistory);
	});
});

describe("AIChatPanel - Component Props and Structure", () => {
	it("should export required types and functions", () => {
		// Verify that the module exports what we expect
		expect(typeof applyQuickAction).toBe("function");
		expect(typeof assembleChatContext).toBe("function");
	});

	it("should handle all quick action types", () => {
		const actions: QuickAction[] = ["improve", "shorten", "changeTone"];
		const selectedText = "Test text";

		actions.forEach((action) => {
			const prompt = applyQuickAction(action, selectedText);
			expect(prompt).toBeTruthy();
			expect(prompt.length).toBeGreaterThan(0);
		});
	});
});
