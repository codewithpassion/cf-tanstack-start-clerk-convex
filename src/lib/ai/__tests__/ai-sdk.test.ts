/**
 * AI SDK Integration Tests
 *
 * Tests for provider configuration, model selection, and streaming utilities.
 */

import { describe, it, expect } from "vitest";
import {
	createOpenAIProvider,
	createAnthropicProvider,
	createAIProvider,
	resolveAIConfig,
	getDefaultAIConfig,
	type AIProvider,
	type AIEnvironment,
} from "../providers";
import {
	selectModel,
	getModelById,
	isValidModel,
	estimateTokenCount,
	fitsInContextWindow,
	getRecommendedModel,
	TOKEN_LIMITS,
} from "../models";
import { formatStreamError, StreamError } from "../streaming";

// Mock environment for testing
const mockEnv: AIEnvironment = {
	OPENAI_API_KEY: "test-openai-key",
	ANTHROPIC_API_KEY: "test-anthropic-key",
	DEFAULT_AI_PROVIDER: "openai",
	DEFAULT_AI_MODEL: "gpt-4o",
};

describe("AI SDK Integration", () => {
	describe("Provider Configuration - OpenAI", () => {
		it("should configure OpenAI provider with API key", () => {
			const provider = createOpenAIProvider("test-key", "gpt-4o");
			expect(provider).toBeDefined();
			expect(typeof provider).toBe("object");
		});

		it("should throw error when API key is missing for OpenAI", () => {
			expect(() => createOpenAIProvider("", "gpt-4o")).toThrow(
				"OPENAI_API_KEY is required",
			);
		});

		it("should create AI provider with OpenAI configuration", () => {
			const config = {
				provider: "openai" as AIProvider,
				model: "gpt-4o",
			};

			const provider = createAIProvider(config, mockEnv);
			expect(provider).toBeDefined();
		});
	});

	describe("Provider Configuration - Anthropic", () => {
		it("should configure Anthropic provider with API key", () => {
			const provider = createAnthropicProvider(
				"test-key",
				"claude-3-5-sonnet-20241022",
			);
			expect(provider).toBeDefined();
			expect(typeof provider).toBe("object");
		});

		it("should throw error when API key is missing for Anthropic", () => {
			expect(() =>
				createAnthropicProvider("", "claude-3-5-sonnet-20241022"),
			).toThrow("ANTHROPIC_API_KEY is required");
		});

		it("should create AI provider with Anthropic configuration", () => {
			const config = {
				provider: "anthropic" as AIProvider,
				model: "claude-3-5-sonnet-20241022",
			};

			const provider = createAIProvider(config, mockEnv);
			expect(provider).toBeDefined();
		});
	});

	describe("Model Selection by Project Settings", () => {
		it("should resolve AI config with project settings priority", () => {
			const projectConfig = {
				defaultAiProvider: "anthropic" as AIProvider,
				defaultAiModel: "claude-3-5-sonnet-20241022",
			};

			const workspaceConfig = {
				defaultAiProvider: "openai" as AIProvider,
				defaultAiModel: "gpt-3.5-turbo",
			};

			const resolved = resolveAIConfig(mockEnv, projectConfig, workspaceConfig);

			expect(resolved.provider).toBe("anthropic");
			expect(resolved.model).toBe("claude-3-5-sonnet-20241022");
		});

		it("should fallback to workspace config when project config is missing", () => {
			const workspaceConfig = {
				defaultAiProvider: "openai" as AIProvider,
				defaultAiModel: "gpt-3.5-turbo",
			};

			const resolved = resolveAIConfig(mockEnv, undefined, workspaceConfig);

			expect(resolved.provider).toBe("openai");
			expect(resolved.model).toBe("gpt-3.5-turbo");
		});

		it("should fallback to environment defaults when no config provided", () => {
			const resolved = resolveAIConfig(mockEnv);

			expect(resolved.provider).toBe("openai");
			expect(resolved.model).toBe("gpt-4o");
		});

		it("should get default AI config from environment", () => {
			const config = getDefaultAIConfig(mockEnv);

			expect(config.provider).toBe("openai");
			expect(config.model).toBe("gpt-4o");
		});
	});

	describe("Model Selection and Validation", () => {
		it("should select model based on project settings", () => {
			const selected = selectModel("openai", "gpt-4o-mini");

			expect(selected).toBe("gpt-4o-mini");
		});

		it("should fallback to workspace model if project model invalid", () => {
			const selected = selectModel("openai", "invalid-model", "gpt-3.5-turbo");

			expect(selected).toBe("gpt-3.5-turbo");
		});

		it("should fallback to provider default if no valid model specified", () => {
			const selected = selectModel("openai");

			expect(selected).toBe("gpt-4o");
		});

		it("should not select model from different provider", () => {
			// Try to use Claude model with OpenAI provider
			const selected = selectModel("openai", "claude-3-5-sonnet-20241022");

			// Should fallback to OpenAI default
			expect(selected).toBe("gpt-4o");
		});

		it("should validate model IDs correctly", () => {
			expect(isValidModel("gpt-4o")).toBe(true);
			expect(isValidModel("claude-3-5-sonnet-20241022")).toBe(true);
			expect(isValidModel("invalid-model")).toBe(false);
		});

		it("should get model definition by ID", () => {
			const model = getModelById("gpt-4o");

			expect(model).toBeDefined();
			expect(model?.id).toBe("gpt-4o");
			expect(model?.provider).toBe("openai");
			expect(model?.contextWindow).toBe(128000);
		});

		it("should return undefined for invalid model ID", () => {
			const model = getModelById("invalid-model");
			expect(model).toBeUndefined();
		});

		it("should estimate token count correctly", () => {
			const text = "This is a test"; // 14 characters ≈ 3.5 tokens, rounds up to 4
			const tokens = estimateTokenCount(text);

			expect(tokens).toBe(4);
		});

		it("should check if content fits in context window", () => {
			// GPT-4o has 128k context window
			expect(fitsInContextWindow("gpt-4o", 50000)).toBe(true);
			expect(fitsInContextWindow("gpt-4o", 150000)).toBe(false);
		});

		it("should recommend model based on content size", () => {
			// Small content should recommend a model
			const smallContent = getRecommendedModel("openai", 5000);
			expect(smallContent).toBeDefined();
			expect(isValidModel(smallContent)).toBe(true);

			// Very large content should recommend largest context model
			const largeContent = getRecommendedModel("openai", 100000);
			expect(largeContent).toBeDefined();
			expect(isValidModel(largeContent)).toBe(true);
		});

		it("should respect token limit constants", () => {
			expect(TOKEN_LIMITS.MAX_CONTEXT_LENGTH).toBe(100000);
			expect(TOKEN_LIMITS.MAX_KNOWLEDGE_BASE_ITEMS).toBe(10);
			expect(TOKEN_LIMITS.MAX_EXAMPLES).toBe(5);
			expect(TOKEN_LIMITS.IMAGE_PROMPT_MAX_LENGTH).toBe(4000);
		});
	});

	describe("Streaming Response Handler", () => {
		it("should format stream errors correctly", () => {
			const apiKeyError = new StreamError("API key invalid");
			expect(formatStreamError(apiKeyError)).toContain("configuration error");

			const rateLimitError = new StreamError("rate limit exceeded");
			expect(formatStreamError(rateLimitError)).toContain("rate limit");

			const timeoutError = new StreamError("request timeout");
			expect(formatStreamError(timeoutError)).toContain("timed out");

			const genericError = new Error("Something went wrong");
			expect(formatStreamError(genericError)).toContain("Something went wrong");

			const unknownError = "string error";
			expect(formatStreamError(unknownError)).toContain("unexpected error");
		});

		it("should throw StreamError with proper structure", () => {
			const originalError = new Error("Original error");
			const streamError = new StreamError("Stream failed", originalError);

			expect(streamError.name).toBe("StreamError");
			expect(streamError.message).toBe("Stream failed");
			expect(streamError.cause).toBe(originalError);
		});
	});
});
