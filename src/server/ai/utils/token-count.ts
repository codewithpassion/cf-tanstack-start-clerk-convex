/**
 * Token Counting Utilities
 */

import { estimateTokenCount } from "@/lib/ai/models";

/**
 * Count tokens in a prompt (system + user)
 */
export function countPromptTokens(
	systemPrompt: string,
	userPrompt: string,
): number {
	return estimateTokenCount(systemPrompt + userPrompt);
}
