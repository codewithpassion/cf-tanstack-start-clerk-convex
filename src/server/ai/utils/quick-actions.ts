/**
 * Quick Actions Utility
 *
 * Pre-defined prompt templates for common editing tasks.
 */

import type { QuickAction } from "../core/types";

/**
 * Apply quick action to generate prompt template
 *
 * Quick actions provide pre-defined prompt templates for common editing tasks.
 * Each action modifies the user's prompt to achieve a specific outcome.
 */
export function applyQuickAction(
	action: QuickAction,
	selectedText: string,
	tone?: string,
): string {
	switch (action) {
		case "improve":
			return `Please improve this paragraph to make it more clear, engaging, and well-structured while maintaining its core message:\n\n${selectedText}`;

		case "shorten":
			return `Please rewrite this text to be more concise and brief while preserving the key points:\n\n${selectedText}`;

		case "changeTone":
			if (tone) {
				return `Please rewrite this text with a ${tone} tone:\n\n${selectedText}`;
			}
			return `Please rewrite this text with a different tone (suggest an appropriate tone):\n\n${selectedText}`;

		default:
			return selectedText;
	}
}
