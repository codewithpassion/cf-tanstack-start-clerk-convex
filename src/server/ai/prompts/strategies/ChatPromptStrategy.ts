/**
 * ChatPromptStrategy - Prompt Building for Chat Responses
 *
 * Builds XML-structured prompts for AI chat assistant responses
 * in the context of content editing.
 */

import { PromptBuilder } from "../PromptBuilder";

/**
 * Strategy for building chat response prompts
 */
export class ChatPromptStrategy {
	private readonly builder = new PromptBuilder();

	/**
	 * Build system prompt for chat context
	 */
	buildSystemPrompt(currentContent: string): string {
		return this.builder
			.reset()
			.addRole(
				"AI writing assistant helping to edit and improve content",
			)
			.addTask(`
You are assisting a user who is working on the content shown below. Your role is to:
- Provide helpful suggestions to improve the content
- Answer questions about the content
- Help with rewriting and editing tasks
- Maintain the user's intended meaning and style unless asked to change it
			`.trim())
			.addSection("current_content", currentContent)
			.addConstraints([
				"Be concise and actionable in your responses",
				"When suggesting changes, explain briefly why",
				"If asked to rewrite something, provide the rewritten text directly",
				"Stay focused on the content editing context",
			])
			.build();
	}

	/**
	 * Build messages array for chat completion
	 */
	buildMessages(
		chatHistory: Array<{ role: "user" | "assistant"; content: string }>,
		newMessage: string,
	): Array<{ role: "user" | "assistant"; content: string }> {
		return [
			...chatHistory,
			{ role: "user" as const, content: newMessage },
		];
	}
}
