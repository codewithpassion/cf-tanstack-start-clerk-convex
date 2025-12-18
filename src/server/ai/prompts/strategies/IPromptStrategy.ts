/**
 * IPromptStrategy - Strategy Interface for Prompt Building
 *
 * Defines the contract for prompt building strategies.
 * Each AI operation type implements its own strategy.
 */

import type { GenerationContext, PromptPair } from "../../core/types";

/**
 * Strategy interface for building prompts
 *
 * @template TInput - Type of operation-specific input
 * @template TData - Type of operation-specific data
 */
export interface IPromptStrategy<TInput, TData = unknown> {
	/**
	 * Build system prompt from generation context
	 */
	buildSystemPrompt(context: GenerationContext, data?: TData): string;

	/**
	 * Build user prompt from input and context
	 */
	buildUserPrompt(input: TInput, context: GenerationContext, data?: TData): string;

	/**
	 * Build both prompts at once (convenience method)
	 */
	buildPrompts(input: TInput, context: GenerationContext, data?: TData): PromptPair;
}

/**
 * Base implementation with default buildPrompts
 */
export abstract class BasePromptStrategy<TInput, TData = unknown>
	implements IPromptStrategy<TInput, TData>
{
	abstract buildSystemPrompt(context: GenerationContext, data?: TData): string;
	abstract buildUserPrompt(input: TInput, context: GenerationContext, data?: TData): string;

	buildPrompts(input: TInput, context: GenerationContext, data?: TData): PromptPair {
		return {
			system: this.buildSystemPrompt(context, data),
			user: this.buildUserPrompt(input, context, data),
		};
	}
}
