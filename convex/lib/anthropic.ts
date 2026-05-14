import Anthropic from "@anthropic-ai/sdk";

export const DRAFT_MODEL = "claude-sonnet-4-6";
export const PROFILE_MODEL = "claude-opus-4-7";

export function getAnthropicClient(): Anthropic {
	const apiKey = process.env.ANTHROPIC_API_KEY;
	if (!apiKey) {
		throw new Error("ANTHROPIC_API_KEY is not set");
	}
	return new Anthropic({ apiKey });
}

export function isAnthropicConfigured(): boolean {
	return Boolean(process.env.ANTHROPIC_API_KEY);
}
