/**
 * Constants for AI Module
 *
 * Centralized configuration values and limits.
 */

/**
 * Token limits for various operations
 */
export const TOKEN_LIMITS = {
	/** Maximum knowledge base items to include in context */
	MAX_KNOWLEDGE_BASE_ITEMS: 10,

	/** Maximum examples to include in context */
	MAX_EXAMPLES: 5,

	/** Maximum chat history messages to include */
	MAX_CHAT_HISTORY: 10,

	/** Maximum length for image generation prompts */
	IMAGE_PROMPT_MAX_LENGTH: 4000,

	/** Maximum output tokens for draft generation */
	DRAFT_MAX_OUTPUT_TOKENS: 4096,

	/** Maximum output tokens for chat responses */
	CHAT_MAX_OUTPUT_TOKENS: 2048,

	/** Maximum output tokens for refinement */
	REFINE_MAX_OUTPUT_TOKENS: 4096,

	/** Maximum output tokens for image prompt generation */
	IMAGE_PROMPT_MAX_OUTPUT_TOKENS: 500,
} as const;

/**
 * Default AI settings
 */
export const AI_DEFAULTS = {
	/** Default temperature for generation */
	TEMPERATURE: 0.7,

	/** Higher temperature for creative tasks */
	CREATIVE_TEMPERATURE: 0.8,

	/** Token estimation multiplier for balance checks */
	TOKEN_ESTIMATE_MULTIPLIER: 3,
} as const;

/**
 * Rate limit configuration
 */
export const RATE_LIMITS = {
	/** Maximum image generation requests per minute */
	IMAGE_GENERATION_PER_MINUTE: 5,

	/** Rate limit window in milliseconds */
	WINDOW_MS: 60000,
} as const;
