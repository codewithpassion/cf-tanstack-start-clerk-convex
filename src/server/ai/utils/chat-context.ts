/**
 * Chat Context Assembly Utility
 *
 * Assembles chat context from history and current content.
 */

import type { ChatMessage } from "../core/types";
import { TOKEN_LIMITS } from "../core/constants";

/**
 * Input for assembling chat context
 */
export interface AssembleChatContextInput {
	chatHistory: ChatMessage[];
	currentContent: string;
	maxHistoryMessages?: number;
}

/**
 * Assembled chat context
 */
export interface ChatContext {
	chatHistory: ChatMessage[];
	currentContent: string;
}

/**
 * Assemble chat context from history and current content
 *
 * Combines recent chat messages with current editor content to provide
 * context for AI chat responses. Limits history to prevent token overflow.
 */
export function assembleChatContext(input: AssembleChatContextInput): ChatContext {
	const {
		chatHistory,
		currentContent,
		maxHistoryMessages = TOKEN_LIMITS.MAX_CHAT_HISTORY,
	} = input;

	// Limit history to recent N messages to fit in token budget
	const recentHistory =
		chatHistory.length > maxHistoryMessages
			? chatHistory.slice(-maxHistoryMessages)
			: chatHistory;

	return {
		chatHistory: recentHistory,
		currentContent,
	};
}
