/**
 * AI Streaming Response Utilities
 *
 * Handles streaming responses from AI providers with progress tracking
 * and error handling for stream failures.
 */

import { streamText } from "ai";
import type { LanguageModelV2 } from "@ai-sdk/provider";

/**
 * Progress indicator data structure for streaming responses
 */
export interface StreamProgress {
	status: "initializing" | "streaming" | "completed" | "error";
	message: string;
	estimatedTokens?: number;
	completedTokens?: number;
	error?: string;
}

/**
 * Options for text streaming
 */
export interface StreamTextOptions {
	model: LanguageModelV2;
	prompt: string;
	systemPrompt?: string;
	maxOutputTokens?: number;
	temperature?: number;
	onProgress?: (progress: StreamProgress) => void;
}

/**
 * Error class for streaming failures
 */
export class StreamError extends Error {
	constructor(
		message: string,
		public readonly cause?: unknown,
	) {
		super(message);
		this.name = "StreamError";
	}
}

/**
 * Stream text response from AI provider
 *
 * Handles streaming with progress tracking and error handling.
 * Returns a StreamTextResult that can be consumed by the client.
 *
 * @param options - Streaming configuration options
 * @returns StreamTextResult for client consumption
 */
export async function streamAIResponse(options: StreamTextOptions) {
	const {
		model,
		prompt,
		systemPrompt,
		maxOutputTokens = 4096,
		temperature = 0.7,
		onProgress,
	} = options;

	try {
		// Signal initialization
		onProgress?.({
			status: "initializing",
			message: "Connecting to AI provider...",
		});

		// Create streaming request
		const result = streamText({
			model,
			prompt,
			system: systemPrompt,
			maxOutputTokens,
			temperature,
			onChunk: () => {
				// Signal streaming in progress
				onProgress?.({
					status: "streaming",
					message: "Generating response...",
				});
			},
			onFinish: ({ usage }) => {
				// Signal completion with token usage
				onProgress?.({
					status: "completed",
					message: "Generation complete",
					completedTokens: usage?.totalTokens,
				});
			},
		});

		return result;
	} catch (error) {
		// Handle streaming errors
		const errorMessage =
			error instanceof Error ? error.message : "Unknown streaming error";

		onProgress?.({
			status: "error",
			message: "Stream failed",
			error: errorMessage,
		});

		throw new StreamError(`Failed to stream AI response: ${errorMessage}`, error);
	}
}

/**
 * Create a simple text stream handler for server functions
 *
 * This is a lightweight wrapper for creating streaming responses
 * that can be consumed by TanStack Start server functions.
 *
 * @param options - Streaming configuration options
 * @returns ReadableStream of text chunks
 */
export async function createTextStream(
	options: StreamTextOptions,
): Promise<ReadableStream<string>> {
	const result = await streamAIResponse(options);

	// Convert to ReadableStream of text chunks
	return new ReadableStream({
		async start(controller) {
			try {
				for await (const chunk of result.textStream) {
					controller.enqueue(chunk);
				}
				controller.close();
			} catch (error) {
				const errorMessage =
					error instanceof Error ? error.message : "Stream processing error";
				controller.error(new StreamError(errorMessage, error));
			}
		},
	});
}

/**
 * Estimate progress based on token usage
 *
 * Provides a rough progress estimate for UI indicators
 * based on expected vs actual token usage.
 *
 * @param estimatedTotal - Estimated total tokens
 * @param currentTokens - Current token count
 * @returns Progress percentage (0-100)
 */
export function estimateProgress(
	estimatedTotal: number,
	currentTokens: number,
): number {
	if (estimatedTotal <= 0) {
		return 0;
	}
	return Math.min(Math.round((currentTokens / estimatedTotal) * 100), 100);
}

/**
 * Format streaming error for user display
 *
 * Converts technical error messages into user-friendly descriptions
 * with actionable next steps.
 *
 * @param error - Error instance or message
 * @returns User-friendly error description
 */
export function formatStreamError(error: unknown): string {
	if (error instanceof StreamError) {
		// Handle known streaming errors
		if (error.message.includes("API key")) {
			return "AI service configuration error. Please contact support.";
		}
		if (error.message.includes("rate limit")) {
			return "AI service rate limit reached. Please try again in a few moments.";
		}
		if (error.message.includes("timeout")) {
			return "AI service request timed out. Please try again.";
		}
		return `Generation failed: ${error.message}. Please try again.`;
	}

	if (error instanceof Error) {
		return `An error occurred: ${error.message}. Please try again.`;
	}

	return "An unexpected error occurred. Please try again.";
}

/**
 * Retry configuration for stream failures
 */
export interface RetryConfig {
	maxAttempts: number;
	delayMs: number;
	backoffMultiplier: number;
}

/**
 * Default retry configuration
 */
export const DEFAULT_RETRY_CONFIG: RetryConfig = {
	maxAttempts: 3,
	delayMs: 1000,
	backoffMultiplier: 2,
};

/**
 * Retry streaming with exponential backoff
 *
 * Automatically retries failed streams with increasing delays
 * between attempts.
 *
 * @param fn - Function that creates the stream
 * @param config - Retry configuration
 * @returns Stream result or throws after max attempts
 */
export async function retryStream<T>(
	fn: () => Promise<T>,
	config: RetryConfig = DEFAULT_RETRY_CONFIG,
): Promise<T> {
	let lastError: unknown;

	for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
		try {
			return await fn();
		} catch (error) {
			lastError = error;

			// Don't retry on last attempt
			if (attempt === config.maxAttempts) {
				break;
			}

			// Calculate delay with exponential backoff
			const delay = config.delayMs * config.backoffMultiplier ** (attempt - 1);

			// Wait before retrying
			await new Promise((resolve) => setTimeout(resolve, delay));
		}
	}

	// All attempts failed
	throw new StreamError(
		`Stream failed after ${config.maxAttempts} attempts`,
		lastError,
	);
}
