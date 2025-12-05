/**
 * Token billing and pricing calculations for LLM operations and image generation.
 *
 * This module provides utilities for calculating billable tokens based on:
 * - LLM usage (input/output tokens with multiplier)
 * - Image generation (fixed cost per model and size)
 */

/**
 * Default multiplier applied to LLM token usage to calculate billable tokens.
 * This accounts for the margin between actual API costs and what we charge users.
 */
export const DEFAULT_TOKEN_MULTIPLIER = 1.5;

/**
 * Fixed token costs for image generation by model and size.
 * Format: { model: { "widthxheight": tokenCost } }
 */
export const IMAGE_COSTS = {
	"dall-e-3": {
		"1024x1024": 6000,
		"1024x1792": 8000,
		"1792x1024": 8000,
	},
	"dall-e-2": {
		"512x512": 2000,
		"1024x1024": 3000,
	},
	google: {
		"1024x1024": 4500,
	},
} as const;

/**
 * Type for image generation models supported in billing.
 */
export type ImageModel = keyof typeof IMAGE_COSTS;

/**
 * Type for valid image sizes per model.
 */
export type ImageSize<T extends ImageModel> = keyof (typeof IMAGE_COSTS)[T];

/**
 * Result of LLM billable token calculation.
 */
export interface LLMBillingResult {
	/** Total actual tokens used (input + output) */
	actualTokens: number;
	/** Tokens charged to the user after applying multiplier */
	billableTokens: number;
	/** Indicates this charge uses a multiplier-based calculation */
	chargeType: "multiplier";
	/** The multiplier applied to calculate billable tokens */
	multiplier: number;
}

/**
 * Result of image generation billable token calculation.
 */
export interface ImageBillingResult {
	/** Always 0 for image generation (no token consumption) */
	actualTokens: 0;
	/** Fixed token cost for this image generation */
	billableTokens: number;
	/** Indicates this charge uses a fixed cost */
	chargeType: "fixed";
	/** The fixed cost applied */
	fixedCost: number;
}

/**
 * Calculate billable tokens for LLM operations.
 *
 * Applies a multiplier to the sum of input and output tokens to determine
 * the billable amount. The multiplier accounts for margins and overhead.
 *
 * @param inputTokens - Number of tokens in the prompt/input
 * @param outputTokens - Number of tokens in the completion/output
 * @param multiplier - Optional custom multiplier (defaults to DEFAULT_TOKEN_MULTIPLIER)
 * @returns Billing calculation result with actual and billable token counts
 *
 * @example
 * ```ts
 * const result = calculateLLMBillableTokens(100, 200);
 * // result.actualTokens = 300
 * // result.billableTokens = 450 (300 * 1.5, rounded up)
 * ```
 */
export function calculateLLMBillableTokens(
	inputTokens: number,
	outputTokens: number,
	multiplier: number = DEFAULT_TOKEN_MULTIPLIER,
): LLMBillingResult {
	const actualTokens = inputTokens + outputTokens;
	const billableTokens = Math.ceil(actualTokens * multiplier);

	return {
		actualTokens,
		billableTokens,
		chargeType: "multiplier",
		multiplier,
	};
}

/**
 * Calculate billable tokens for image generation.
 *
 * Uses a fixed cost lookup table based on the model and image size.
 * Falls back to DALL-E 3 1024x1024 cost if the exact model/size is not found.
 *
 * @param model - Image generation model (dall-e-3, dall-e-2, google)
 * @param size - Image dimensions as "widthxheight" (e.g., "1024x1024")
 * @param count - Number of images generated (defaults to 1)
 * @returns Billing calculation result with fixed cost
 *
 * @example
 * ```ts
 * const result = calculateImageBillableTokens("dall-e-3", "1024x1024", 2);
 * // result.billableTokens = 12000 (6000 * 2 images)
 * ```
 */
export function calculateImageBillableTokens(
	model: string,
	size: string,
	count = 1,
): ImageBillingResult {
	// Default fallback cost (DALL-E 3 1024x1024)
	const DEFAULT_COST = 6000;

	let fixedCost: number = DEFAULT_COST;

	// Type-safe lookup with fallback
	if (model in IMAGE_COSTS) {
		const modelCosts = IMAGE_COSTS[model as ImageModel];
		if (size in modelCosts) {
			fixedCost = modelCosts[size as keyof typeof modelCosts];
		}
	}

	const billableTokens = fixedCost * count;

	return {
		actualTokens: 0,
		billableTokens,
		chargeType: "fixed",
		fixedCost,
	};
}
