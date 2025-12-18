/**
 * AI Module - Main Entry Point
 *
 * This module provides AI-powered content generation capabilities including:
 * - Draft generation
 * - Content refinement
 * - Selection refinement
 * - Chat responses
 * - Content repurposing
 * - Image prompt generation
 * - Image generation
 *
 * Architecture:
 * - Services: Business logic with template method pattern
 * - Prompts: XML-structured prompt building with strategy pattern
 * - Context: Repository pattern for data access
 * - Billing: Centralized balance and usage tracking
 * - Execution: AI SDK wrapper for provider abstraction
 */

// =============================================================================
// Server Functions (Public API)
// =============================================================================

export {
	// Text generation operations
	generateDraft,
	refineContent,
	refineSelection,
	generateChatResponse,
	repurposeContent,
	generateImagePrompt,
	// Image generation
	generateImage,
	// Context assembly
	assembleGenerationContext,
} from "./server-functions";

// =============================================================================
// Types (Public API)
// =============================================================================

export type {
	// Input types
	GenerateDraftInput,
	RefineContentInput,
	RefineSelectionInput,
	GenerateChatResponseInput,
	RepurposeContentInput,
	GenerateImagePromptInput,
	// Context types
	GenerationContext,
	AssembleContextParams,
	// Message types
	ChatMessage,
	// Other types
	QuickAction,
	TokenUsage,
	OperationType,
} from "./core/types";

// Re-export image generation types
export type {
	GenerateImageInput,
	GenerateImagesResult,
	GenerateImageResult,
	ImageAspectRatio,
} from "../image-generation/types";

// =============================================================================
// Utilities (for advanced usage)
// =============================================================================

// Prompt builder for custom prompts
export { PromptBuilder, createPromptBuilder } from "./prompts";

// Token estimation
export { estimateTokenCount } from "@/lib/ai/models";
export { countPromptTokens } from "./utils/token-count";

// Quick action helper
export { applyQuickAction } from "./utils/quick-actions";

// Chat context helper
export {
	assembleChatContext,
	type AssembleChatContextInput,
	type ChatContext,
} from "./utils/chat-context";

// =============================================================================
// Services (for testing/extension)
// =============================================================================

export {
	DraftGenerationService,
	RefineContentService,
	RefineSelectionService,
	ChatService,
	RepurposeService,
	ImagePromptService,
} from "./services";

// =============================================================================
// Errors
// =============================================================================

export {
	AIError,
	InsufficientBalanceError,
	AuthenticationError,
	ResourceNotFoundError,
	AIConfigurationError,
	AIProviderError,
	ContentPolicyError,
	RateLimitError,
	formatErrorForUser,
} from "./core/errors";
