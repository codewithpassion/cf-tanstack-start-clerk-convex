/**
 * AI Model Definitions and Selection
 *
 * Defines available models for each AI provider and token limits.
 * Implements model selection logic based on project/workspace settings.
 */

import type { AIProvider } from "./providers";

/**
 * Model definition with metadata
 */
export interface ModelDefinition {
	id: string;
	name: string;
	provider: AIProvider;
	contextWindow: number; // Maximum tokens in context
	maxOutputTokens: number; // Maximum tokens in response
	costPer1kInputTokens: number; // For future billing
	costPer1kOutputTokens: number;
}

/**
 * Available OpenAI models
 */
export const OPENAI_MODELS: Record<string, ModelDefinition> = {
	"gpt-4o": {
		id: "gpt-4o",
		name: "GPT-4o",
		provider: "openai",
		contextWindow: 128000,
		maxOutputTokens: 16384,
		costPer1kInputTokens: 0.0025,
		costPer1kOutputTokens: 0.01,
	},
	"gpt-4o-mini": {
		id: "gpt-4o-mini",
		name: "GPT-4o Mini",
		provider: "openai",
		contextWindow: 128000,
		maxOutputTokens: 16384,
		costPer1kInputTokens: 0.00015,
		costPer1kOutputTokens: 0.0006,
	},
	"gpt-4-turbo": {
		id: "gpt-4-turbo",
		name: "GPT-4 Turbo",
		provider: "openai",
		contextWindow: 128000,
		maxOutputTokens: 4096,
		costPer1kInputTokens: 0.01,
		costPer1kOutputTokens: 0.03,
	},
	"gpt-3.5-turbo": {
		id: "gpt-3.5-turbo",
		name: "GPT-3.5 Turbo",
		provider: "openai",
		contextWindow: 16385,
		maxOutputTokens: 4096,
		costPer1kInputTokens: 0.0005,
		costPer1kOutputTokens: 0.0015,
	},
} as const;

/**
 * Available Anthropic models
 */
export const ANTHROPIC_MODELS: Record<string, ModelDefinition> = {
	"claude-3-5-sonnet-20241022": {
		id: "claude-3-5-sonnet-20241022",
		name: "Claude 3.5 Sonnet",
		provider: "anthropic",
		contextWindow: 200000,
		maxOutputTokens: 8192,
		costPer1kInputTokens: 0.003,
		costPer1kOutputTokens: 0.015,
	},
	"claude-3-5-haiku-20241022": {
		id: "claude-3-5-haiku-20241022",
		name: "Claude 3.5 Haiku",
		provider: "anthropic",
		contextWindow: 200000,
		maxOutputTokens: 8192,
		costPer1kInputTokens: 0.0008,
		costPer1kOutputTokens: 0.004,
	},
	"claude-3-opus-20240229": {
		id: "claude-3-opus-20240229",
		name: "Claude 3 Opus",
		provider: "anthropic",
		contextWindow: 200000,
		maxOutputTokens: 4096,
		costPer1kInputTokens: 0.015,
		costPer1kOutputTokens: 0.075,
	},
} as const;

/**
 * All available models across providers
 */
export const ALL_MODELS: Record<string, ModelDefinition> = {
	...OPENAI_MODELS,
	...ANTHROPIC_MODELS,
} as const;

/**
 * Token limit constants for AI generation
 */
export const TOKEN_LIMITS = {
	MAX_CONTEXT_LENGTH: 100000, // Maximum combined context tokens
	MAX_KNOWLEDGE_BASE_ITEMS: 10, // Maximum knowledge base items per generation
	MAX_EXAMPLES: 5, // Maximum examples per generation
	IMAGE_PROMPT_MAX_LENGTH: 4000, // Maximum characters for image prompts
} as const;

/**
 * Get model definition by ID
 *
 * @param modelId - The model identifier
 * @returns Model definition or undefined if not found
 */
export function getModelById(modelId: string): ModelDefinition | undefined {
	return ALL_MODELS[modelId];
}

/**
 * Get all models for a specific provider
 *
 * @param provider - AI provider type
 * @returns Array of model definitions for the provider
 */
export function getModelsByProvider(provider: AIProvider): ModelDefinition[] {
	return Object.values(ALL_MODELS).filter((model) => model.provider === provider);
}

/**
 * Validate if a model ID is supported
 *
 * @param modelId - The model identifier to validate
 * @returns True if the model is supported
 */
export function isValidModel(modelId: string): boolean {
	return modelId in ALL_MODELS;
}

/**
 * Select appropriate model based on project/workspace settings
 *
 * Selection hierarchy:
 * 1. Project-specific model (if valid for project's provider)
 * 2. Workspace default model (if valid for workspace's provider)
 * 3. Provider's default model
 *
 * @param provider - The AI provider to use
 * @param projectModel - Optional project-specific model preference
 * @param workspaceModel - Optional workspace-specific model preference
 * @returns Selected model ID
 */
export function selectModel(
	provider: AIProvider,
	projectModel?: string,
	workspaceModel?: string,
): string {
	// Try project model if specified and valid
	if (projectModel && isValidModel(projectModel)) {
		const model = getModelById(projectModel);
		if (model?.provider === provider) {
			return projectModel;
		}
	}

	// Try workspace model if specified and valid
	if (workspaceModel && isValidModel(workspaceModel)) {
		const model = getModelById(workspaceModel);
		if (model?.provider === provider) {
			return workspaceModel;
		}
	}

	// Fallback to provider defaults
	switch (provider) {
		case "openai":
			return "gpt-4o";
		case "anthropic":
			return "claude-3-5-sonnet-20241022";
		default:
			throw new Error(`Unsupported provider: ${provider}`);
	}
}

/**
 * Calculate estimated token count for text
 * Uses rough approximation: 1 token ≈ 4 characters
 *
 * @param text - Text to estimate token count for
 * @returns Estimated token count
 */
export function estimateTokenCount(text: string): number {
	return Math.ceil(text.length / 4);
}

/**
 * Check if content fits within model's context window
 *
 * @param modelId - The model identifier
 * @param estimatedTokens - Estimated token count of content
 * @returns True if content fits in context window
 */
export function fitsInContextWindow(modelId: string, estimatedTokens: number): boolean {
	const model = getModelById(modelId);
	if (!model) {
		return false;
	}
	return estimatedTokens <= model.contextWindow;
}

/**
 * Get recommended model for content size
 * Returns a model with sufficient context window
 *
 * @param provider - AI provider
 * @param estimatedTokens - Estimated token count needed
 * @returns Recommended model ID
 */
export function getRecommendedModel(provider: AIProvider, estimatedTokens: number): string {
	const models = getModelsByProvider(provider);

	// Find the first model with sufficient context window
	// Models are ordered by capability/cost, so this finds the best fit
	const suitableModel = models.find(
		(model) => model.contextWindow >= estimatedTokens,
	);

	if (!suitableModel) {
		// Fallback to largest context model for provider
		const largestModel = models.reduce((prev, current) =>
			current.contextWindow > prev.contextWindow ? current : prev,
		);
		return largestModel.id;
	}

	return suitableModel.id;
}
