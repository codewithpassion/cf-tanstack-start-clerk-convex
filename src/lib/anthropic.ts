import Anthropic from "@anthropic-ai/sdk";
import { env } from "cloudflare:workers";

export const DRAFT_MODEL = "claude-sonnet-4-6";
export const PROFILE_MODEL = "claude-opus-4-7";

let cached: Anthropic | null = null;

export function getAnthropicClient(): Anthropic {
	if (cached) return cached;
	const apiKey = (env as { ANTHROPIC_API_KEY?: string }).ANTHROPIC_API_KEY;
	if (!apiKey) {
		throw new Error("ANTHROPIC_API_KEY is not set");
	}
	cached = new Anthropic({ apiKey });
	return cached;
}
