/**
 * AIExecutor - AI SDK Wrapper
 *
 * Wraps the Vercel AI SDK to provide a consistent interface for AI operations.
 * Handles provider configuration, streaming, and non-streaming execution.
 */

import { streamText, generateText } from "ai";
import type { LanguageModelV2 } from "@ai-sdk/provider";
import {
	createAIProvider,
	resolveAIConfig,
	type AIProvider,
} from "@/lib/ai/providers";
import type { AIEnvironment, ProjectAISettings, TokenUsage } from "../core/types";
import { AI_DEFAULTS, TOKEN_LIMITS } from "../core/constants";
import { AIConfigurationError, AIProviderError } from "../core/errors";

/**
 * Options for text generation
 */
export interface GenerateOptions {
	system: string;
	prompt: string;
	temperature?: number;
	maxOutputTokens?: number;
}

/**
 * Options for streaming text generation
 */
export interface StreamOptions extends GenerateOptions {
	onChunk?: (chunk: string) => void;
}

/**
 * Result from streaming generation
 */
export interface StreamResult {
	textStream: AsyncIterable<string>;
	usage: Promise<TokenUsage | undefined>;
	text: Promise<string>;
	toTextStreamResponse: () => Response;
}

/**
 * Result from non-streaming generation
 */
export interface GenerateResult {
	text: string;
	usage?: TokenUsage;
}

/**
 * Executor for AI operations
 */
export class AIExecutor {
	private model: LanguageModelV2;
	private provider: AIProvider;
	private modelName: string;

	constructor(
		env: AIEnvironment,
		projectSettings?: ProjectAISettings,
	) {
		const config = resolveAIConfig(env, projectSettings);
		this.provider = config.provider;
		this.modelName = config.model;

		try {
			this.model = createAIProvider(config, env);
		} catch (error) {
			throw new AIConfigurationError(
				error instanceof Error ? error.message : "Failed to create AI provider",
			);
		}
	}

	/**
	 * Get the current provider name
	 */
	getProvider(): AIProvider {
		return this.provider;
	}

	/**
	 * Get the current model name
	 */
	getModel(): string {
		return this.modelName;
	}

	/**
	 * Stream text generation
	 */
	stream(options: StreamOptions): StreamResult {
		try {
			const result = streamText({
				model: this.model,
				system: options.system,
				prompt: options.prompt,
				temperature: options.temperature ?? AI_DEFAULTS.TEMPERATURE,
				maxOutputTokens: options.maxOutputTokens ?? TOKEN_LIMITS.DRAFT_MAX_OUTPUT_TOKENS,
			});

			return {
				textStream: result.textStream,
				usage: result.usage.then((u) =>
					u
						? {
								inputTokens: u.inputTokens || 0,
								outputTokens: u.outputTokens || 0,
								totalTokens: (u.inputTokens || 0) + (u.outputTokens || 0),
							}
						: undefined,
				),
				text: result.text,
				toTextStreamResponse: () => result.toTextStreamResponse(),
			};
		} catch (error) {
			throw new AIProviderError(
				error instanceof Error ? error.message : "Streaming failed",
				this.provider,
				error instanceof Error ? error : undefined,
			);
		}
	}

	/**
	 * Stream text generation with chat messages
	 */
	streamChat(options: {
		system: string;
		messages: Array<{ role: "user" | "assistant"; content: string }>;
		temperature?: number;
		maxOutputTokens?: number;
	}): StreamResult {
		try {
			const result = streamText({
				model: this.model,
				system: options.system,
				messages: options.messages,
				temperature: options.temperature ?? AI_DEFAULTS.TEMPERATURE,
				maxOutputTokens: options.maxOutputTokens ?? TOKEN_LIMITS.CHAT_MAX_OUTPUT_TOKENS,
			});

			return {
				textStream: result.textStream,
				usage: result.usage.then((u) =>
					u
						? {
								inputTokens: u.inputTokens || 0,
								outputTokens: u.outputTokens || 0,
								totalTokens: (u.inputTokens || 0) + (u.outputTokens || 0),
							}
						: undefined,
				),
				text: result.text,
				toTextStreamResponse: () => result.toTextStreamResponse(),
			};
		} catch (error) {
			throw new AIProviderError(
				error instanceof Error ? error.message : "Chat streaming failed",
				this.provider,
				error instanceof Error ? error : undefined,
			);
		}
	}

	/**
	 * Generate text (non-streaming)
	 */
	async generate(options: GenerateOptions): Promise<GenerateResult> {
		try {
			const result = await generateText({
				model: this.model,
				system: options.system,
				prompt: options.prompt,
				temperature: options.temperature ?? AI_DEFAULTS.TEMPERATURE,
				maxOutputTokens: options.maxOutputTokens ?? TOKEN_LIMITS.DRAFT_MAX_OUTPUT_TOKENS,
			});

			return {
				text: result.text,
				usage: result.usage
					? {
							inputTokens: result.usage.inputTokens || 0,
							outputTokens: result.usage.outputTokens || 0,
							totalTokens:
								(result.usage.inputTokens || 0) + (result.usage.outputTokens || 0),
						}
					: undefined,
			};
		} catch (error) {
			throw new AIProviderError(
				error instanceof Error ? error.message : "Generation failed",
				this.provider,
				error instanceof Error ? error : undefined,
			);
		}
	}
}

/**
 * Create an AIExecutor with the given configuration
 */
export function createAIExecutor(
	env: AIEnvironment,
	projectSettings?: ProjectAISettings,
): AIExecutor {
	return new AIExecutor(env, projectSettings);
}
