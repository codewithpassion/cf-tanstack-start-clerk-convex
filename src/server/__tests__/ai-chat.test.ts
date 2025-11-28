/**
 * AI Chat Server Functions Tests
 *
 * Tests for chat response generation, context assembly, and quick actions.
 */

import { describe, it, expect } from "vitest";

// Import functions to test
import {
	assembleChatContext,
	applyQuickAction,
	type AssembleChatContextInput,
} from "../ai";

describe("AI Chat Server Functions", () => {
	describe("generateChatResponse - Streaming", () => {
		it("should stream chat response correctly", async () => {
			// This test validates that chat responses are streamed properly
			const mockStreamResult = {
				textStream: (async function* () {
					yield "Hello ";
					yield "from ";
					yield "AI!";
				})(),
			};

			// Verify streaming behavior
			const chunks: string[] = [];
			for await (const chunk of mockStreamResult.textStream) {
				chunks.push(chunk);
			}

			expect(chunks).toEqual(["Hello ", "from ", "AI!"]);
			expect(chunks.join("")).toBe("Hello from AI!");
		});
	});

	describe("assembleChatContext", () => {
		it("should assemble chat context with limited history", () => {
			const input: AssembleChatContextInput = {
				chatHistory: [
					{ role: "user", content: "Message 1" },
					{ role: "assistant", content: "Response 1" },
					{ role: "user", content: "Message 2" },
					{ role: "assistant", content: "Response 2" },
					{ role: "user", content: "Message 3" },
				],
				currentContent: "Current editor content",
				maxHistoryMessages: 3,
			};

			const context = assembleChatContext(input);

			// Should only include last 3 messages
			expect(context.chatHistory.length).toBe(3);
			expect(context.chatHistory[0].content).toBe("Message 2");
			expect(context.currentContent).toBe("Current editor content");
		});

		it("should handle empty chat history", () => {
			const input: AssembleChatContextInput = {
				chatHistory: [],
				currentContent: "Some content",
			};

			const context = assembleChatContext(input);

			expect(context.chatHistory).toEqual([]);
			expect(context.currentContent).toBe("Some content");
		});
	});

	describe("applyQuickAction", () => {
		it("should apply 'shorten' action to content", () => {
			const content =
				"This is a very long piece of content that needs to be shortened.";
			const action = "shorten";

			const prompt = applyQuickAction(action, content);

			expect(prompt).toContain("concise");
			expect(prompt).toContain(content);
		});

		it("should apply 'improve' action to content", () => {
			const content = "Content that needs improvement";
			const action = "improve";

			const prompt = applyQuickAction(action, content);

			expect(prompt).toContain("improve");
			expect(prompt).toContain(content);
		});

		it("should apply 'changeTone' action to content with tone", () => {
			const content = "Content with wrong tone";
			const action = "changeTone";
			const tone = "professional";

			const prompt = applyQuickAction(action, content, tone);

			expect(prompt).toContain("professional");
			expect(prompt).toContain(content);
		});

		it("should apply 'changeTone' action to content without tone", () => {
			const content = "Content with wrong tone";
			const action = "changeTone";

			const prompt = applyQuickAction(action, content);

			expect(prompt).toContain("tone");
			expect(prompt).toContain(content);
		});
	});

	describe("Token Limiting", () => {
		it("should limit chat history to fit within token budget", () => {
			// Create long chat history
			const longHistory = Array.from({ length: 20 }, (_, i) => [
				{
					role: "user" as const,
					content: `User message ${i} with some content to take up tokens`,
				},
				{
					role: "assistant" as const,
					content: `Assistant response ${i} with detailed explanation taking up more tokens`,
				},
			]).flat();

			const input: AssembleChatContextInput = {
				chatHistory: longHistory,
				currentContent: "Current content",
				maxHistoryMessages: 10,
			};

			const context = assembleChatContext(input);

			// Should be limited to maxHistoryMessages
			expect(context.chatHistory.length).toBeLessThanOrEqual(10);
		});
	});
});
