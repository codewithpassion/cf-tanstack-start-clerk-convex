/**
 * AI Provider Configuration
 *
 * Configures OpenAI and Anthropic providers for the AI SDK.
 * Provider selection is based on project settings with fallback to workspace defaults.
 */

import { createAnthropic } from "@ai-sdk/anthropic";
import { createOpenAI } from "@ai-sdk/openai";
import type { LanguageModelV2 } from "@ai-sdk/provider";

export type AIProvider = "openai" | "anthropic";

/**
 * Configuration options for AI provider
 */
export interface AIProviderConfig {
	provider: AIProvider;
	model: string;
}

/**
 * Environment variables interface for AI configuration
 */
export interface AIEnvironment {
	OPENAI_API_KEY?: string;
	ANTHROPIC_API_KEY?: string;
	DEFAULT_AI_PROVIDER?: string;
	DEFAULT_AI_MODEL?: string;
}

/**
 * Default AI provider configuration
 */
export const DEFAULT_PROVIDER: AIProvider = "openai";
export const DEFAULT_MODEL = "gpt-4o";

/**
 * Configure OpenAI provider with API key
 *
 * @param apiKey - OpenAI API key
 * @param model - Model ID to use
 * @returns Configured OpenAI language model
 */
export function createOpenAIProvider(
	apiKey: string,
	model: string,
): LanguageModelV2 {
	if (!apiKey) {
		throw new Error("OPENAI_API_KEY is required");
	}

	const provider = createOpenAI({
		apiKey,
	});

	return provider(model);
}

/**
 * Configure Anthropic provider with API key
 *
 * @param apiKey - Anthropic API key
 * @param model - Model ID to use
 * @returns Configured Anthropic language model
 */
export function createAnthropicProvider(
	apiKey: string,
	model: string,
): LanguageModelV2 {
	if (!apiKey) {
		throw new Error("ANTHROPIC_API_KEY is required");
	}

	const provider = createAnthropic({
		apiKey,
	});

	return provider(model);
}

/**
 * Provider factory that returns the configured provider based on settings
 *
 * Selection hierarchy:
 * 1. Project-specific provider
 * 2. Workspace default provider
 * 3. System default provider (from env vars)
 *
 * @param config - Provider configuration with provider type and model
 * @param env - Environment variables containing API keys
 * @returns Configured language model instance
 */
export function createAIProvider(
	config: AIProviderConfig,
	env: AIEnvironment,
): LanguageModelV2 {
	const { provider, model } = config;

	switch (provider) {
		case "openai": {
			const apiKey = env.OPENAI_API_KEY;
			if (!apiKey) {
				throw new Error("OPENAI_API_KEY environment variable is not set");
			}
			return createOpenAIProvider(apiKey, model);
		}
		case "anthropic": {
			const apiKey = env.ANTHROPIC_API_KEY;
			if (!apiKey) {
				throw new Error("ANTHROPIC_API_KEY environment variable is not set");
			}
			return createAnthropicProvider(apiKey, model);
		}
		default:
			throw new Error(`Unsupported AI provider: ${provider}`);
	}
}

/**
 * Get default AI configuration from environment variables
 *
 * @param env - Environment variables
 * @returns Default AI provider configuration
 */
export function getDefaultAIConfig(env: AIEnvironment): AIProviderConfig {
	const provider = (env.DEFAULT_AI_PROVIDER as AIProvider) || DEFAULT_PROVIDER;
	const model = env.DEFAULT_AI_MODEL || DEFAULT_MODEL;

	return {
		provider,
		model,
	};
}

/**
 * Resolve AI configuration with fallback hierarchy:
 * Project settings -> Workspace settings -> Environment defaults
 *
 * @param env - Environment variables
 * @param projectConfig - Optional project-specific AI configuration
 * @param workspaceConfig - Optional workspace-specific AI configuration
 * @returns Resolved AI provider configuration
 */
export function resolveAIConfig(
	env: AIEnvironment,
	projectConfig?: { defaultAiProvider?: AIProvider; defaultAiModel?: string },
	workspaceConfig?: { defaultAiProvider?: AIProvider; defaultAiModel?: string },
): AIProviderConfig {
	const defaults = getDefaultAIConfig(env);

	// Priority: project > workspace > defaults
	const provider =
		projectConfig?.defaultAiProvider ||
		workspaceConfig?.defaultAiProvider ||
		defaults.provider;

	const model =
		projectConfig?.defaultAiModel ||
		workspaceConfig?.defaultAiModel ||
		defaults.model;

	return {
		provider,
		model,
	};
}
