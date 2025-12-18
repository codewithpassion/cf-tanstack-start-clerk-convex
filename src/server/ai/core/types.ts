/**
 * Core Types for AI Module
 *
 * Centralized type definitions for all AI operations.
 */

import type { Id } from "@/convex/dataModel";
import type { ConvexHttpClient } from "convex/browser";
import type { AIProvider } from "@/lib/ai/providers";

// =============================================================================
// Authentication & Context
// =============================================================================

/**
 * Authenticated user context for AI operations
 */
export interface AuthContext {
	userId: Id<"users">;
	workspaceId: Id<"workspaces">;
	convex: ConvexHttpClient;
}

/**
 * User data from Convex
 */
export interface UserData {
	_id: Id<"users">;
	email: string;
	name?: string;
}

/**
 * Workspace data from Convex
 */
export interface WorkspaceData {
	_id: Id<"workspaces">;
	name: string;
}

// =============================================================================
// Generation Context
// =============================================================================

/**
 * Knowledge base item for context
 */
export interface KnowledgeItem {
	title: string;
	content: string;
}

/**
 * Example content for few-shot learning
 */
export interface ExampleItem {
	title: string;
	content: string;
}

/**
 * Context assembled from various sources for AI generation
 */
export interface GenerationContext {
	formatGuidelines?: string;
	personaDescription?: string;
	brandVoiceDescription?: string;
	knowledgeBase: KnowledgeItem[];
	examples: ExampleItem[];
}

/**
 * Parameters for assembling generation context
 */
export interface AssembleContextParams {
	categoryId: Id<"categories">;
	personaId?: Id<"personas">;
	brandVoiceId?: Id<"brandVoices">;
	projectId: Id<"projects">;
	selectedKnowledgeBaseIds?: Id<"knowledgeBaseItems">[];
}

// =============================================================================
// Prompt Types
// =============================================================================

/**
 * System and user prompt pair
 */
export interface PromptPair {
	system: string;
	user: string;
}

// =============================================================================
// AI Execution Types
// =============================================================================

/**
 * AI provider configuration
 */
export interface AIConfig {
	provider: AIProvider;
	model: string;
}

/**
 * Project AI settings
 */
export interface ProjectAISettings {
	defaultAiProvider?: AIProvider;
	defaultAiModel?: string;
}

/**
 * Token usage from AI response
 */
export interface TokenUsage {
	inputTokens: number;
	outputTokens: number;
	totalTokens: number;
}

// =============================================================================
// Operation Input Types
// =============================================================================

/**
 * Input for draft generation
 */
export interface GenerateDraftInput {
	contentPieceId: Id<"contentPieces">;
	categoryId: Id<"categories">;
	personaId?: Id<"personas">;
	brandVoiceId?: Id<"brandVoices">;
	title: string;
	topic: string;
	draftContent?: string;
	uploadedFileIds?: Id<"files">[];
	selectedKnowledgeBaseIds?: Id<"knowledgeBaseItems">[];
}

/**
 * Input for content refinement
 */
export interface RefineContentInput {
	contentPieceId: Id<"contentPieces">;
	currentContent: string;
	instructions: string;
}

/**
 * Input for selection refinement
 */
export interface RefineSelectionInput {
	contentPieceId: Id<"contentPieces">;
	selectedText: string;
	instructions: string;
}

/**
 * Input for content repurposing
 */
export interface RepurposeContentInput {
	sourceContentPieceId: Id<"contentPieces">;
	targetCategoryId: Id<"categories">;
	targetPersonaId?: Id<"personas">;
	targetBrandVoiceId?: Id<"brandVoices">;
	title: string;
	additionalInstructions?: string;
}

/**
 * Chat message structure
 */
export interface ChatMessage {
	role: "user" | "assistant";
	content: string;
}

/**
 * Input for chat response generation
 */
export interface GenerateChatResponseInput {
	contentPieceId: Id<"contentPieces">;
	message: string;
	currentContent: string;
}

/**
 * Input for image prompt generation
 */
export interface GenerateImagePromptInput {
	imageType: string;
	subject: string;
	style?: string;
	mood?: string;
	composition?: string;
	colors?: string;
}

// =============================================================================
// Quick Actions
// =============================================================================

/**
 * Quick action types for content editing
 */
export type QuickAction = "improve" | "shorten" | "changeTone";

// =============================================================================
// Billing Types
// =============================================================================

/**
 * Operation types for billing tracking
 */
export type OperationType =
	| "content_generation"
	| "content_refinement"
	| "content_repurpose"
	| "chat_response"
	| "image_prompt_generation"
	| "image_generation";

/**
 * Parameters for recording usage
 */
export interface RecordUsageParams {
	userId: Id<"users">;
	workspaceId: Id<"workspaces">;
	projectId?: Id<"projects">;
	contentPieceId?: Id<"contentPieces">;
	operationType: OperationType;
	provider: AIProvider;
	model: string;
	inputTokens: number;
	outputTokens: number;
	metadata?: Record<string, unknown>;
}

/**
 * Balance check result
 */
export interface BalanceCheckResult {
	sufficient: boolean;
	balance: number;
}

// =============================================================================
// Service Dependencies
// =============================================================================

/**
 * AI environment configuration
 */
export interface AIEnvironment {
	OPENAI_API_KEY?: string;
	ANTHROPIC_API_KEY?: string;
	DEFAULT_AI_PROVIDER?: string;
	DEFAULT_AI_MODEL?: string;
}
