/**
 * AI Server Functions for Content Generation
 *
 * Server functions for AI-powered draft generation, chat responses,
 * image generation, and context assembly. These run on Cloudflare Workers
 * and integrate with Convex for data access and AI SDK for LLM interactions.
 */

import { createServerFn } from "@tanstack/react-start";
import { auth } from "@clerk/tanstack-react-start/server";
import { ConvexHttpClient } from "convex/browser";
import { streamText, generateText } from "ai";
import OpenAI from "openai";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import {
	createAIProvider,
	resolveAIConfig,
	type AIEnvironment,
} from "@/lib/ai/providers";
import { estimateTokenCount, TOKEN_LIMITS } from "@/lib/ai/models";
import { uploadFile } from "@/lib/r2-client";
import { getR2Bucket } from "@/lib/env";
import { generateR2Key, sanitizeFilename } from "@/lib/file-validation";

/**
 * Context assembled from various sources for AI generation
 */
export interface GenerationContext {
	formatGuidelines?: string;
	personaDescription?: string;
	brandVoiceDescription?: string;
	knowledgeBase: Array<{
		title: string;
		content: string;
	}>;
	examples: Array<{
		title: string;
		content: string;
	}>;
}

/**
 * Token usage tracking for billing and analytics
 */
export interface TokenUsage {
	promptTokens: number;
	completionTokens: number;
	totalTokens: number;
}

/**
 * Input parameters for draft generation
 */
export interface GenerateDraftInput {
	contentPieceId: Id<"contentPieces">;
	categoryId: Id<"categories">;
	personaId?: Id<"personas">;
	brandVoiceId?: Id<"brandVoices">;
	title: string;
	topic: string;
	draftContent?: string;
}

/**
 * Input parameters for context assembly
 */
export interface AssembleContextInput {
	categoryId: Id<"categories">;
	personaId?: Id<"personas">;
	brandVoiceId?: Id<"brandVoices">;
	projectId: Id<"projects">;
}

/**
 * Chat message structure
 */
export interface ChatMessage {
	role: "user" | "assistant";
	content: string;
}

/**
 * Chat context assembled from history and current content
 */
export interface ChatContext {
	chatHistory: ChatMessage[];
	currentContent: string;
}

/**
 * Input parameters for chat context assembly
 */
export interface AssembleChatContextInput {
	chatHistory: ChatMessage[];
	currentContent: string;
	maxHistoryMessages?: number;
}

/**
 * Input parameters for chat response generation
 */
export interface GenerateChatResponseInput {
	contentPieceId: Id<"contentPieces">;
	message: string;
	currentContent: string;
}

/**
 * Quick action types
 */
export type QuickAction = "improve" | "shorten" | "changeTone";

/**
 * Input parameters for content refinement
 */
export interface RefineContentInput {
	contentPieceId: Id<"contentPieces">;
	currentContent: string;
	instructions: string;
}

/**
 * Input parameters for image prompt generation
 */
export interface GenerateImagePromptInput {
	imageType: "infographic" | "illustration" | "photo" | "diagram";
	subject: string;
	style?: string;
	mood?: string;
	composition?: string;
	colors?: string;
}

/**
 * Input parameters for image generation
 */
export interface GenerateImageInput {
	prompt: string;
	size?: "1024x1024" | "1792x1024" | "1024x1792";
	workspaceId: Id<"workspaces">;
	projectId: Id<"projects">;
}

/**
 * Result from image generation
 */
export interface GenerateImageResult {
	fileId: Id<"files">;
	r2Key: string;
	previewUrl: string;
}

/**
 * Rate limit tracking per user
 */
interface RateLimitEntry {
	timestamps: number[];
}

// In-memory rate limit store (use KV or Durable Objects in production)
const rateLimitStore = new Map<string, RateLimitEntry>();

/**
 * Rate limit constants for image generation
 */
const IMAGE_GENERATION_RATE_LIMIT = {
	MAX_REQUESTS: 5,
	WINDOW_MS: 60000, // 1 minute
};

/**
 * Get Convex client with authentication
 */
async function getAuthenticatedConvexClient(): Promise<ConvexHttpClient> {
	const convexUrl = process.env.VITE_CONVEX_URL;
	if (!convexUrl) {
		throw new Error("VITE_CONVEX_URL environment variable is not set");
	}
	const { userId, getToken } = await auth();
	const token = await getToken({ template: "convex" });
	if (!userId) {
		throw new Error("Authentication required to create Convex client");
	}
	if (!token) {
		throw new Error("Authentication token is required to create Convex client");
	} else {
		const client = new ConvexHttpClient(convexUrl);
		console.log("Setting Convex auth for user:", userId, token);
		client.setAuth(token);
		return client;
	}
}

/**
 * Get AI environment configuration
 */
function getAIEnvironment(): AIEnvironment {
	return {
		OPENAI_API_KEY: process.env.OPENAI_API_KEY,
		ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
		DEFAULT_AI_PROVIDER: process.env.DEFAULT_AI_PROVIDER,
		DEFAULT_AI_MODEL: process.env.DEFAULT_AI_MODEL,
	};
}

/**
 * Check and enforce rate limit for image generation
 *
 * @param userId - User ID to check rate limit for
 * @throws Error if rate limit is exceeded
 */
function checkImageGenerationRateLimit(userId: string): void {
	const now = Date.now();
	const windowStart = now - IMAGE_GENERATION_RATE_LIMIT.WINDOW_MS;

	// Get or create rate limit entry
	let entry = rateLimitStore.get(userId);
	if (!entry) {
		entry = { timestamps: [] };
		rateLimitStore.set(userId, entry);
	}

	// Filter out old timestamps outside the window
	entry.timestamps = entry.timestamps.filter(
		(timestamp) => timestamp > windowStart,
	);

	// Check if limit exceeded
	if (entry.timestamps.length >= IMAGE_GENERATION_RATE_LIMIT.MAX_REQUESTS) {
		throw new Error(
			`Image generation rate limit exceeded. Maximum ${IMAGE_GENERATION_RATE_LIMIT.MAX_REQUESTS} requests per minute. Please try again later.`,
		);
	}

	// Add current timestamp
	entry.timestamps.push(now);
}

/**
 * Fetch category format guidelines
 */
async function fetchCategoryContext(
	convex: ConvexHttpClient,
	categoryId: Id<"categories">,
): Promise<string | undefined> {
	const category = await convex.query(api.categories.getCategory, {
		categoryId,
	});
	return category?.formatGuidelines;
}

/**
 * Fetch persona description
 */
async function fetchPersonaContext(
	convex: ConvexHttpClient,
	personaId: Id<"personas">,
): Promise<string | undefined> {
	const persona = await convex.query(api.personas.getPersona, { personaId });
	return persona?.description;
}

/**
 * Fetch brand voice description
 */
async function fetchBrandVoiceContext(
	convex: ConvexHttpClient,
	brandVoiceId: Id<"brandVoices">,
): Promise<string | undefined> {
	const brandVoice = await convex.query(api.brandVoices.getBrandVoice, {
		brandVoiceId,
	});
	return brandVoice?.description;
}

/**
 * Fetch relevant knowledge base items (max 10)
 */
async function fetchRelevantKnowledge(
	convex: ConvexHttpClient,
	categoryId: Id<"categories">,
): Promise<Array<{ title: string; content: string }>> {
	const items = await convex.query(api.knowledgeBase.listKnowledgeBaseItems, {
		categoryId,
	});

	// Limit to max allowed items
	const limitedItems = items.slice(0, TOKEN_LIMITS.MAX_KNOWLEDGE_BASE_ITEMS);

	// Transform to simple objects with title and content
	return limitedItems.map((item) => ({
		title: item.title,
		content: item.content || "",
	}));
}

/**
 * Fetch relevant examples (max 5)
 */
async function fetchRelevantExamples(
	convex: ConvexHttpClient,
	categoryId: Id<"categories">,
): Promise<Array<{ title: string; content: string }>> {
	const examples = await convex.query(api.examples.listExamples, {
		categoryId,
	});

	// Limit to max allowed examples
	const limitedExamples = examples.slice(0, TOKEN_LIMITS.MAX_EXAMPLES);

	// Transform to simple objects with title and content
	return limitedExamples.map((example) => ({
		title: example.title,
		content: example.content || "",
	}));
}

/**
 * Assemble generation context from all relevant sources
 *
 * Server function that fetches and assembles context data from Convex
 * including category guidelines, persona, brand voice, knowledge base,
 * and examples. This context is used to inform AI generation.
 */
export const assembleGenerationContext = createServerFn({ method: "POST" })
	.inputValidator((input: AssembleContextInput) => input)
	.handler(async ({ data }): Promise<GenerationContext> => {
		const convex = await getAuthenticatedConvexClient();
		const { categoryId, personaId, brandVoiceId } = data;

		// Fetch all context in parallel
		const [
			formatGuidelines,
			personaDescription,
			brandVoiceDescription,
			knowledgeBase,
			examples,
		] = await Promise.all([
			fetchCategoryContext(convex, categoryId),
			personaId
				? fetchPersonaContext(convex, personaId)
				: Promise.resolve(undefined),
			brandVoiceId
				? fetchBrandVoiceContext(convex, brandVoiceId)
				: Promise.resolve(undefined),
			fetchRelevantKnowledge(convex, categoryId),
			fetchRelevantExamples(convex, categoryId),
		]);

		const context: GenerationContext = {
			formatGuidelines,
			personaDescription,
			brandVoiceDescription,
			knowledgeBase,
			examples,
		};

		return context;
	});

/**
 * Construct AI prompt from context and input
 */
function constructPrompt(
	context: GenerationContext,
	input: GenerateDraftInput,
): {
	system: string;
	prompt: string;
} {
	const systemParts: string[] = [
		"You are an expert content writer helping to create high-quality content.",
	];

	// Add format guidelines if available
	if (context.formatGuidelines) {
		systemParts.push(`\nFORMAT GUIDELINES:\n${context.formatGuidelines}`);
	}

	// Add brand voice if available
	if (context.brandVoiceDescription) {
		systemParts.push(`\nBRAND VOICE:\n${context.brandVoiceDescription}`);
	}

	// Add persona if available
	if (context.personaDescription) {
		systemParts.push(
			`\nPERSONA:\nWrite as if you are: ${context.personaDescription}`,
		);
	}

	// Add knowledge base if available
	if (context.knowledgeBase.length > 0) {
		systemParts.push("\nRELEVANT KNOWLEDGE:");
		for (const item of context.knowledgeBase) {
			systemParts.push(`\n${item.title}:\n${item.content}`);
		}
	}

	// Add examples if available
	if (context.examples.length > 0) {
		systemParts.push("\nEXAMPLE CONTENT:");
		for (const example of context.examples) {
			systemParts.push(`\n${example.title}:\n${example.content}`);
		}
	}

	const systemPrompt = systemParts.join("\n");

	// Construct user prompt
	const promptParts: string[] = [
		`Please write content with the following title: "${input.title}"`,
		`\nTopic: ${input.topic}`,
	];

	if (input.draftContent) {
		promptParts.push(
			`\nStarting draft:\n${input.draftContent}`,
			"\nPlease improve and expand on this draft.",
		);
	} else {
		promptParts.push(
			"\nPlease create complete content following the format guidelines and examples provided.",
		);
	}

	return {
		system: systemPrompt,
		prompt: promptParts.join("\n"),
	};
}

/**
 * Count tokens in prompt for tracking
 */
export function countPromptTokens(
	systemPrompt: string,
	userPrompt: string,
): number {
	return estimateTokenCount(systemPrompt + userPrompt);
}

/**
 * Generate AI draft with streaming response
 *
 * Server function that assembles context, constructs prompts, calls the LLM,
 * and streams the response back to the client. Tracks token usage for billing.
 */
export const generateDraft = createServerFn({ method: "POST" })
	.inputValidator((input: GenerateDraftInput) => input)
	.handler(async ({ data }) => {
		try {

			const convex = await getAuthenticatedConvexClient();

			// Get content piece to retrieve projectId
			const contentPiece = await convex.query(
				api.contentPieces.getContentPiece,
				{
					contentPieceId: data.contentPieceId,
				},
			);

			// Assemble context
			const context = await assembleGenerationContext({
				data: {
					categoryId: data.categoryId,
					personaId: data.personaId,
					brandVoiceId: data.brandVoiceId,
					projectId: contentPiece.projectId,
				},
			});

			// Get project for AI configuration
			const project = await convex.query(api.projects.getProject, {
				projectId: contentPiece.projectId,
			});

			// Resolve AI configuration
			const env = getAIEnvironment();
			const aiConfig = resolveAIConfig(env, {
				defaultAiProvider: project.defaultAiProvider,
				defaultAiModel: project.defaultAiModel,
			});

			// Create AI provider
			const model = createAIProvider(aiConfig, env);

			// Construct prompts
			const { system: systemPrompt, prompt: userPrompt } = constructPrompt(
				context,
				data,
			);

			// Estimate token count for logging
			const estimatedPromptTokens = countPromptTokens(
				systemPrompt,
				userPrompt,
			);
			console.log("Estimated prompt tokens:", estimatedPromptTokens);

			// Stream text generation
			const result = streamText({
				model,
				system: systemPrompt,
				prompt: userPrompt,
				temperature: 0.7,
				maxOutputTokens: 4096,
			});

			// Track token usage when finished (async, does not block response)
			(async () => {
				try {
					const usage = await result.usage;
					if (usage) {
						const tokenUsage: TokenUsage = {
							promptTokens: usage.inputTokens || 0,
							completionTokens: usage.outputTokens || 0,
							totalTokens:
								(usage.inputTokens || 0) + (usage.outputTokens || 0),
						};

						// TODO: Store token usage in database for billing
						console.log("Token usage:", tokenUsage);
					}
				} catch (error) {
					console.error("Error tracking token usage:", error);
				}
			})();

			// Return streaming response
			return result.toTextStreamResponse();
		} catch (error) {
			console.error("Draft generation error:", error);

			// Return detailed error message
			const errorMessage =
				error instanceof Error ? error.message : "Unknown error occurred";

			throw new Error(
				`Failed to generate draft: ${errorMessage}. Please check your AI provider configuration and try again.`,
			);
		}
	});

/**
 * Assemble chat context from history and current content
 *
 * Combines recent chat messages with current editor content to provide
 * context for AI chat responses. Limits history to prevent token overflow.
 */
export function assembleChatContext(
	input: AssembleChatContextInput,
): ChatContext {
	const { chatHistory, currentContent, maxHistoryMessages = 10 } = input;

	// Limit history to recent N messages to fit in token budget
	const recentHistory =
		chatHistory.length > maxHistoryMessages
			? chatHistory.slice(-maxHistoryMessages)
			: chatHistory;

	return {
		chatHistory: recentHistory,
		currentContent,
	};
}

/**
 * Apply quick action to generate prompt template
 *
 * Quick actions provide pre-defined prompt templates for common editing tasks.
 * Each action modifies the user's prompt to achieve a specific outcome.
 */
export function applyQuickAction(
	action: QuickAction,
	selectedText: string,
	tone?: string,
): string {
	switch (action) {
		case "improve":
			return `Please improve this paragraph to make it more clear, engaging, and well-structured while maintaining its core message:\n\n${selectedText}`;

		case "shorten":
			return `Please rewrite this text to be more concise and brief while preserving the key points:\n\n${selectedText}`;

		case "changeTone":
			if (tone) {
				return `Please rewrite this text with a ${tone} tone:\n\n${selectedText}`;
			}
			return `Please rewrite this text with a different tone (suggest an appropriate tone):\n\n${selectedText}`;

		default:
			return selectedText;
	}
}

/**
 * Construct chat system prompt with current content context
 */
function constructChatSystemPrompt(currentContent: string): string {
	return `You are an AI writing assistant helping to edit and improve content. The user is currently working on the following content:

CURRENT CONTENT:
${currentContent}

Your role is to:
- Provide helpful suggestions to improve the content
- Answer questions about the content
- Help with rewriting and editing tasks
- Maintain the user's intended meaning and style unless asked to change it

Be concise and actionable in your responses.`;
}

/**
 * Construct chat messages array including history
 */
function constructChatMessages(
	context: ChatContext,
	userMessage: string,
): Array<{ role: "user" | "assistant"; content: string }> {
	const messages: Array<{ role: "user" | "assistant"; content: string }> = [];

	// Add chat history
	for (const msg of context.chatHistory) {
		messages.push({
			role: msg.role,
			content: msg.content,
		});
	}

	// Add current user message
	messages.push({
		role: "user",
		content: userMessage,
	});

	return messages;
}

/**
 * Generate AI chat response with streaming
 *
 * Server function that generates context-aware chat responses based on
 * current editor content and chat history. Streams the response and
 * saves the assistant's message to the database.
 */
export const generateChatResponse = createServerFn({ method: "POST" })
	.inputValidator((input: GenerateChatResponseInput) => input)
	.handler(async ({ data }) => {
		try {
			const convex = await getAuthenticatedConvexClient();
			const { contentPieceId, message, currentContent } = data;

			// Get content piece to retrieve project and verify access
			const contentPiece = await convex.query(
				api.contentPieces.getContentPiece,
				{
					contentPieceId,
				},
			);

			// Fetch recent chat history
			const chatMessages = await convex.query(
				api.contentChatMessages.listChatMessages,
				{
					contentPieceId,
				},
			);

			// Convert to chat message format
			const chatHistory: ChatMessage[] = chatMessages.map((msg) => ({
				role: msg.role,
				content: msg.content,
			}));

			// Assemble chat context with truncation
			const context = assembleChatContext({
				chatHistory,
				currentContent,
				maxHistoryMessages: 10, // Limit to 10 recent messages
			});

			// Get project for AI configuration
			const project = await convex.query(api.projects.getProject, {
				projectId: contentPiece.projectId,
			});

			// Resolve AI configuration
			const env = getAIEnvironment();
			const aiConfig = resolveAIConfig(env, {
				defaultAiProvider: project.defaultAiProvider,
				defaultAiModel: project.defaultAiModel,
			});

			// Create AI provider
			const model = createAIProvider(aiConfig, env);

			// Construct system prompt with current content context
			const systemPrompt = constructChatSystemPrompt(currentContent);

			// Construct messages array with history
			const messages = constructChatMessages(context, message);

			// Stream text generation
			const result = streamText({
				model,
				system: systemPrompt,
				messages,
				temperature: 0.7,
				maxOutputTokens: 2048,
			});

			// Save assistant message after generation completes (async)
			(async () => {
				try {
					const fullText = await result.text;

					// Save assistant's response to chat history
					await convex.mutation(api.contentChatMessages.addChatMessage, {
						contentPieceId,
						role: "assistant",
						content: fullText,
					});

					// Track token usage
					const usage = await result.usage;
					if (usage) {
						console.log("Chat token usage:", {
							promptTokens: usage.inputTokens || 0,
							completionTokens: usage.outputTokens || 0,
							totalTokens:
								(usage.inputTokens || 0) + (usage.outputTokens || 0),
						});
					}
				} catch (error) {
					console.error("Error saving chat message:", error);
				}
			})();

			// Return streaming response
			return result.toTextStreamResponse();
		} catch (error) {
			console.error("Chat response generation error:", error);

			// Return detailed error message
			const errorMessage =
				error instanceof Error ? error.message : "Unknown error occurred";

			throw new Error(
				`Failed to generate chat response: ${errorMessage}. Please try again.`,
			);
		}
	});

/**
 * Construct system prompt for content refinement
 */
function constructRefineSystemPrompt(context: GenerationContext): string {
	const parts = [
		"You are an expert content editor. Refine the content based on user instructions.",
		"Maintain the core message unless explicitly asked to change it.",
		"Output only the refined content, no explanations or meta-commentary.",
	];

	if (context.brandVoiceDescription) {
		parts.push(`\nBRAND VOICE:\n${context.brandVoiceDescription}`);
	}

	if (context.personaDescription) {
		parts.push(`\nPERSONA:\n${context.personaDescription}`);
	}

	if (context.formatGuidelines) {
		parts.push(`\nFORMAT GUIDELINES:\n${context.formatGuidelines}`);
	}

	return parts.join("\n");
}

/**
 * Construct user prompt for content refinement
 */
function constructRefineUserPrompt(
	content: string,
	instructions: string,
): string {
	return `ORIGINAL CONTENT:\n${content}\n\nREFINEMENT REQUEST:\n${instructions}\n\nPlease provide the refined content:`;
}

/**
 * Refine existing content based on user instructions
 *
 * Server function that takes existing content and user refinement instructions,
 * assembles context (persona, brand voice, etc.), and streams back refined content.
 * Similar to generateDraft but focused on iterative refinement rather than creation.
 */
export const refineContent = createServerFn({ method: "POST" })
	.inputValidator((input: RefineContentInput) => input)
	.handler(async ({ data }) => {
		try {
			const convex = await getAuthenticatedConvexClient();
			const { contentPieceId, currentContent, instructions } = data;

			// Get content piece to retrieve project context
			const contentPiece = await convex.query(
				api.contentPieces.getContentPiece,
				{
					contentPieceId,
				},
			);

			// Get project for AI configuration
			const project = await convex.query(api.projects.getProject, {
				projectId: contentPiece.projectId,
			});

			// Assemble context (persona, brand voice, category guidelines, etc.)
			const context = await assembleGenerationContext({
				data: {
					categoryId: contentPiece.categoryId,
					personaId: contentPiece.personaId,
					brandVoiceId: contentPiece.brandVoiceId,
					projectId: contentPiece.projectId,
				},
			});

			// Resolve AI configuration
			const env = getAIEnvironment();
			const aiConfig = resolveAIConfig(env, {
				defaultAiProvider: project.defaultAiProvider,
				defaultAiModel: project.defaultAiModel,
			});

			// Create AI provider
			const model = createAIProvider(aiConfig, env);

			// Construct refine-specific prompts
			const systemPrompt = constructRefineSystemPrompt(context);
			const userPrompt = constructRefineUserPrompt(currentContent, instructions);

			// Estimate token count for logging
			const estimatedPromptTokens = countPromptTokens(
				systemPrompt,
				userPrompt,
			);
			console.log("Refine estimated prompt tokens:", estimatedPromptTokens);

			// Stream text generation
			const result = streamText({
				model,
				system: systemPrompt,
				prompt: userPrompt,
				temperature: 0.7,
				maxOutputTokens: 4096,
			});

			// Track token usage when finished (async, does not block response)
			(async () => {
				try {
					const usage = await result.usage;
					if (usage) {
						const tokenUsage: TokenUsage = {
							promptTokens: usage.inputTokens || 0,
							completionTokens: usage.outputTokens || 0,
							totalTokens:
								(usage.inputTokens || 0) + (usage.outputTokens || 0),
						};

						// TODO: Store token usage in database for billing
						console.log("Refine token usage:", tokenUsage);
					}
				} catch (error) {
					console.error("Error tracking refine token usage:", error);
				}
			})();

			// Return streaming response
			return result.toTextStreamResponse();
		} catch (error) {
			console.error("Content refinement error:", error);

			// Return detailed error message
			const errorMessage =
				error instanceof Error ? error.message : "Unknown error occurred";

			throw new Error(
				`Failed to refine content: ${errorMessage}. Please check your AI provider configuration and try again.`,
			);
		}
	});

/**
 * Generate image prompt from wizard inputs
 *
 * Server function that uses an LLM to create a detailed DALL-E prompt
 * from structured wizard inputs (image type, subject, style, mood, etc.).
 */
export const generateImagePrompt = createServerFn({ method: "POST" })
	.inputValidator((input: GenerateImagePromptInput) => input)
	.handler(async ({ data }): Promise<{ prompt: string }> => {
		try {
			// Verify authentication
			const { userId } = await auth();
			if (!userId) {
				throw new Error("Authentication required");
			}

			// Get AI environment and use default OpenAI configuration
			const env = getAIEnvironment();
			const aiConfig = {
				provider: "openai" as const,
				model: "gpt-4o-mini", // Use faster model for prompt generation
			};

			// Create AI provider
			const model = createAIProvider(aiConfig, env);

			// Construct prompt for LLM to generate DALL-E prompt
			const systemPrompt = `You are an expert at creating detailed image generation prompts for DALL-E 3.
Create a detailed, specific prompt that will produce high-quality images.
Include visual details, style elements, composition, lighting, and atmosphere.
Keep the prompt under 400 words and make it clear and specific.`;

			const inputParts: string[] = [
				`Image type: ${data.imageType}`,
				`Subject: ${data.subject}`,
			];

			if (data.style) {
				inputParts.push(`Style: ${data.style}`);
			}
			if (data.mood) {
				inputParts.push(`Mood: ${data.mood}`);
			}
			if (data.composition) {
				inputParts.push(`Composition: ${data.composition}`);
			}
			if (data.colors) {
				inputParts.push(`Colors: ${data.colors}`);
			}

			const userPrompt = `Create a detailed DALL-E 3 image generation prompt based on these specifications:\n\n${inputParts.join("\n")}\n\nGenerate only the prompt text, without any additional explanation or formatting.`;

			// Generate prompt using LLM
			const result = await generateText({
				model,
				system: systemPrompt,
				prompt: userPrompt,
				temperature: 0.8, // Higher temperature for creative prompts
				maxOutputTokens: 500,
			});

			const generatedPrompt = result.text.trim();

			// Enforce maximum length
			const maxLength = TOKEN_LIMITS.IMAGE_PROMPT_MAX_LENGTH;
			const finalPrompt =
				generatedPrompt.length > maxLength
					? generatedPrompt.slice(0, maxLength)
					: generatedPrompt;

			return { prompt: finalPrompt };
		} catch (error) {
			console.error("Image prompt generation error:", error);

			const errorMessage =
				error instanceof Error ? error.message : "Unknown error occurred";

			throw new Error(
				`Failed to generate image prompt: ${errorMessage}. Please try again.`,
			);
		}
	});

/**
 * Generate image using DALL-E API
 *
 * Server function that calls DALL-E to generate an image, downloads it,
 * uploads to R2, and creates a file record in Convex.
 */
export const generateImage = createServerFn({ method: "POST" })
	.inputValidator((input: GenerateImageInput) => input)
	.handler(async ({ data }): Promise<GenerateImageResult> => {
		try {
			// Verify authentication
			const { userId } = await auth();
			if (!userId) {
				throw new Error("Authentication required");
			}

			// Check rate limit
			checkImageGenerationRateLimit(userId);

			// Get OpenAI API key
			const apiKey = process.env.OPENAI_API_KEY;
			if (!apiKey) {
				throw new Error("OPENAI_API_KEY environment variable is not set");
			}

			// Initialize OpenAI client
			const openai = new OpenAI({ apiKey });

			// Default size if not specified
			const size = data.size || "1024x1024";

			// Validate size
			const validSizes = ["1024x1024", "1792x1024", "1024x1792"];
			if (!validSizes.includes(size)) {
				throw new Error(
					`Invalid image size. Must be one of: ${validSizes.join(", ")}`,
				);
			}

			console.log("Generating image with DALL-E 3:", {
				promptLength: data.prompt.length,
				size,
			});

			// Generate image with DALL-E 3
			const response = await openai.images.generate({
				model: "dall-e-3",
				prompt: data.prompt,
				size,
				quality: "standard",
				n: 1,
			});

			// Get image URL from response
			if (!response.data || response.data.length === 0) {
				throw new Error("No image data returned from DALL-E");
			}
			const imageUrl = response.data[0]?.url;
			if (!imageUrl) {
				throw new Error("No image URL returned from DALL-E");
			}

			console.log("Image generated, downloading from URL");

			// Download image from URL
			const imageResponse = await fetch(imageUrl);
			if (!imageResponse.ok) {
				throw new Error(
					`Failed to download image: ${imageResponse.statusText}`,
				);
			}

			const imageBuffer = await imageResponse.arrayBuffer();
			const imageSizeBytes = imageBuffer.byteLength;

			console.log("Image downloaded, size:", imageSizeBytes, "bytes");

			// Generate filename and R2 key
			const timestamp = Date.now();
			const filename = sanitizeFilename(`generated-${timestamp}.png`);
			const r2Key = generateR2Key(data.workspaceId, "contentImage", filename);

			// Get R2 bucket
			const bucket = await getR2Bucket();

			// Upload to R2
			await uploadFile(bucket, r2Key, imageBuffer, "image/png");

			console.log("Image uploaded to R2:", r2Key);

			// Create file record in Convex
			const convex = await getAuthenticatedConvexClient();
			const fileId = await convex.mutation(api.files.createFile, {
				filename,
				mimeType: "image/png",
				sizeBytes: imageSizeBytes,
				r2Key,
				// No specific owner yet - will be attached to content via contentImages table
			});

			console.log("File record created:", fileId);

			// Generate preview URL (will be handled by client-side download function)
			const previewUrl = `/api/files/${fileId}/preview`;

			return {
				fileId,
				r2Key,
				previewUrl,
			};
		} catch (error) {
			console.error("Image generation error:", error);

			// Provide specific error messages for common failures
			let errorMessage =
				error instanceof Error ? error.message : "Unknown error occurred";

			if (errorMessage.includes("rate limit")) {
				// Rate limit error - pass through as-is
				throw error;
			}

			if (
				errorMessage.includes("content policy") ||
				errorMessage.includes("safety")
			) {
				errorMessage =
					"Image prompt violates content policy. Please modify your prompt and try again.";
			} else if (
				errorMessage.includes("quota") ||
				errorMessage.includes("billing")
			) {
				errorMessage = "API quota exceeded. Please contact support.";
			} else if (errorMessage.includes("download")) {
				errorMessage = `${errorMessage}. The image was generated but could not be downloaded. Please try again.`;
			}

			throw new Error(`Failed to generate image: ${errorMessage}`);
		}
	});
