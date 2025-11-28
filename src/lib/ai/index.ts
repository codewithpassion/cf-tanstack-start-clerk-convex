/**
 * AI SDK Module
 *
 * Central export for AI provider configuration, model selection,
 * and streaming utilities.
 */

// Provider configuration
export {
	type AIProvider,
	type AIProviderConfig,
	type AIEnvironment,
	DEFAULT_PROVIDER,
	DEFAULT_MODEL,
	createOpenAIProvider,
	createAnthropicProvider,
	createAIProvider,
	getDefaultAIConfig,
	resolveAIConfig,
} from "./providers";

// Model definitions and selection
export {
	type ModelDefinition,
	OPENAI_MODELS,
	ANTHROPIC_MODELS,
	ALL_MODELS,
	TOKEN_LIMITS,
	getModelById,
	getModelsByProvider,
	isValidModel,
	selectModel,
	estimateTokenCount,
	fitsInContextWindow,
	getRecommendedModel,
} from "./models";

// Streaming utilities
export {
	type StreamProgress,
	type StreamTextOptions,
	type RetryConfig,
	StreamError,
	streamAIResponse,
	createTextStream,
	estimateProgress,
	formatStreamError,
	DEFAULT_RETRY_CONFIG,
	retryStream,
} from "./streaming";
