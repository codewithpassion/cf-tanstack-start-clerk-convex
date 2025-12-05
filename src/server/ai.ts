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
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import {
	createAIProvider,
	resolveAIConfig,
} from "@/lib/ai/providers";
import { estimateTokenCount, TOKEN_LIMITS } from "@/lib/ai/models";
import { calculateLLMBillableTokens } from "@/lib/billing/pricing";

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
 * Input parameters for selection refinement
 */
export interface RefineSelectionInput {
	contentPieceId: Id<"contentPieces">;
	selectedText: string;
	instructions: string;
}

/**
 * Input parameters for image prompt generation
 */
export interface GenerateImagePromptInput {
	imageType: string;
	subject: string;
	style?: string;
	mood?: string;
	composition?: string;
	colors?: string;
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

			// Get current user and workspace
			const user = await convex.query(api.users.getMe);
			if (!user) {
				throw new Error("User not found");
			}

			const workspace = await convex.query(api.workspaces.getMyWorkspace);
			if (!workspace) {
				throw new Error("Workspace not found");
			}

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

			// Estimate token count and required tokens for balance check
			const estimatedPromptTokens = countPromptTokens(
				systemPrompt,
				userPrompt,
			);
			console.log("Estimated prompt tokens:", estimatedPromptTokens);

			// Pre-flight balance check
			// Estimate: (prompt tokens) * 1.5 for output * 2 for safety margin
			const estimatedTokens = Math.ceil(estimatedPromptTokens * 1.5 * 2);

			const balanceCheck = await convex.query(api.billing.accounts.checkBalance, {
				userId: user._id,
				requiredTokens: estimatedTokens,
			});

			if (!balanceCheck.sufficient) {
				throw new Error(
					`Insufficient token balance. You have ${balanceCheck.balance} tokens but need approximately ${estimatedTokens} tokens for this generation.`,
				);
			}

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
						const billing = calculateLLMBillableTokens(
							usage.inputTokens || 0,
							usage.outputTokens || 0,
						);

						await convex.mutation(api.billing.usage.recordUsage, {
							secret: process.env.BILLING_SECRET!,
							userId: user._id,
							workspaceId: workspace._id,
							projectId: contentPiece.projectId,
							contentPieceId: data.contentPieceId,
							operationType: "content_generation",
							provider: aiConfig.provider,
							model: aiConfig.model,
							inputTokens: usage.inputTokens || 0,
							outputTokens: usage.outputTokens || 0,
							totalTokens: billing.actualTokens,
							billableTokens: billing.billableTokens,
							chargeType: "multiplier",
							multiplier: billing.multiplier,
							requestMetadata: JSON.stringify({
								category: data.categoryId,
								title: data.title,
								topic: data.topic,
							}),
							success: true,
						});
					}
				} catch (error) {
					console.error("Failed to record token usage:", error);
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

			// Get current user and workspace
			const user = await convex.query(api.users.getMe);
			if (!user) {
				throw new Error("User not found");
			}

			const workspace = await convex.query(api.workspaces.getMyWorkspace);
			if (!workspace) {
				throw new Error("Workspace not found");
			}

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

			// Estimate token count for balance check
			const estimatedPromptTokens = estimateTokenCount(
				systemPrompt + JSON.stringify(messages),
			);
			console.log("Chat estimated prompt tokens:", estimatedPromptTokens);

			// Pre-flight balance check
			// Estimate: (prompt tokens) * 1.5 for output * 2 for safety margin
			const estimatedTokens = Math.ceil(estimatedPromptTokens * 1.5 * 2);

			const balanceCheck = await convex.query(api.billing.accounts.checkBalance, {
				userId: user._id,
				requiredTokens: estimatedTokens,
			});

			if (!balanceCheck.sufficient) {
				throw new Error(
					`Insufficient token balance. You have ${balanceCheck.balance} tokens but need approximately ${estimatedTokens} tokens for this chat response.`,
				);
			}

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
						const billing = calculateLLMBillableTokens(
							usage.inputTokens || 0,
							usage.outputTokens || 0,
						);

						await convex.mutation(api.billing.usage.recordUsage, {
							secret: process.env.BILLING_SECRET!,
							userId: user._id,
							workspaceId: workspace._id,
							projectId: contentPiece.projectId,
							contentPieceId,
							operationType: "chat_response",
							provider: aiConfig.provider,
							model: aiConfig.model,
							inputTokens: usage.inputTokens || 0,
							outputTokens: usage.outputTokens || 0,
							totalTokens: billing.actualTokens,
							billableTokens: billing.billableTokens,
							chargeType: "multiplier",
							multiplier: billing.multiplier,
							requestMetadata: JSON.stringify({
								message,
								historyLength: chatHistory.length,
							}),
							success: true,
						});
					}
				} catch (error) {
					console.error("Error saving chat message or recording usage:", error);
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

			// Get current user and workspace
			const user = await convex.query(api.users.getMe);
			if (!user) {
				throw new Error("User not found");
			}

			const workspace = await convex.query(api.workspaces.getMyWorkspace);
			if (!workspace) {
				throw new Error("Workspace not found");
			}

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

			// Pre-flight balance check
			// Estimate: (prompt tokens) * 1.5 for output * 2 for safety margin
			const estimatedTokens = Math.ceil(estimatedPromptTokens * 1.5 * 2);

			const balanceCheck = await convex.query(api.billing.accounts.checkBalance, {
				userId: user._id,
				requiredTokens: estimatedTokens,
			});

			if (!balanceCheck.sufficient) {
				throw new Error(
					`Insufficient token balance. You have ${balanceCheck.balance} tokens but need approximately ${estimatedTokens} tokens for this content refinement.`,
				);
			}

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
						const billing = calculateLLMBillableTokens(
							usage.inputTokens || 0,
							usage.outputTokens || 0,
						);

						await convex.mutation(api.billing.usage.recordUsage, {
							secret: process.env.BILLING_SECRET!,
							userId: user._id,
							workspaceId: workspace._id,
							projectId: contentPiece.projectId,
							contentPieceId,
							operationType: "content_refinement",
							provider: aiConfig.provider,
							model: aiConfig.model,
							inputTokens: usage.inputTokens || 0,
							outputTokens: usage.outputTokens || 0,
							totalTokens: billing.actualTokens,
							billableTokens: billing.billableTokens,
							chargeType: "multiplier",
							multiplier: billing.multiplier,
							requestMetadata: JSON.stringify({
								instructions,
								contentLength: currentContent.length,
							}),
							success: true,
						});
					}
				} catch (error) {
					console.error("Failed to record token usage:", error);
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
 * Construct system prompt for selection refinement
 * CRITICAL: Emphasizes refining ONLY the selected text
 */
function constructRefineSelectionSystemPrompt(
	context: GenerationContext
): string {
	const parts = [
		"You are an expert content editor. Refine the selected text based on user instructions.",
		"",
		"CRITICAL INSTRUCTIONS:",
		"- The input is in MARKDOWN format",
		"- PRESERVE the markdown structure EXACTLY (headings, paragraphs, lists, formatting)",
		"- If input has '## Heading', keep it as '## Heading' in the output (don't change to paragraph)",
		"- If input has a paragraph, keep it as a paragraph (don't add heading markers)",
		"- If input has '**bold**' or '*italic*', preserve those marks in the refined text",
		"- Only refine the TEXT CONTENT, not the STRUCTURE or FORMATTING",
		"- Return the refined content in the SAME markdown format as the input",
		"- You are refining ONLY the selected portion - do NOT add any content before or after",
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
 * Construct user prompt for selection refinement
 */
function constructRefineSelectionUserPrompt(
	selectedText: string,
	instructions: string
): string {
	return `SELECTED CONTENT (in markdown format):
${selectedText}

REFINEMENT REQUEST:
${instructions}

IMPORTANT:
- Preserve the exact markdown structure (headings stay headings, paragraphs stay paragraphs)
- Only refine the text content, not the structure
- Return the result in markdown format with the same structure as the input
- Example: If input is "## Title\n\nSome text", output should be "## [Refined Title]\n\n[Refined text]"`;
}

/**
 * Refine selected text based on user instructions
 *
 * Server function that takes selected text and user refinement instructions,
 * assembles context (persona, brand voice, etc.), and streams back refined content.
 * CRITICAL: Instructs the LLM to modify ONLY the selected text.
 */
export const refineSelection = createServerFn({ method: "POST" })
	.inputValidator((input: RefineSelectionInput) => input)
	.handler(async ({ data }) => {
		try {
			const convex = await getAuthenticatedConvexClient();
			const { contentPieceId, selectedText, instructions } = data;

			// Get current user and workspace
			const user = await convex.query(api.users.getMe);
			if (!user) {
				throw new Error("User not found");
			}

			const workspace = await convex.query(api.workspaces.getMyWorkspace);
			if (!workspace) {
				throw new Error("Workspace not found");
			}

			// Get content piece to retrieve project context
			const contentPiece = await convex.query(
				api.contentPieces.getContentPiece,
				{
					contentPieceId,
				}
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

			// Construct selection-specific prompts
			const systemPrompt = constructRefineSelectionSystemPrompt(context);
			const userPrompt = constructRefineSelectionUserPrompt(
				selectedText,
				instructions
			);

			// Estimate token count for logging
			const estimatedPromptTokens = countPromptTokens(
				systemPrompt,
				userPrompt
			);
			console.log(
				"Refine selection estimated prompt tokens:",
				estimatedPromptTokens
			);

			// Pre-flight balance check
			// Estimate: (prompt tokens) * 1.5 for output * 2 for safety margin
			const estimatedTokens = Math.ceil(estimatedPromptTokens * 1.5 * 2);

			const balanceCheck = await convex.query(api.billing.accounts.checkBalance, {
				userId: user._id,
				requiredTokens: estimatedTokens,
			});

			if (!balanceCheck.sufficient) {
				throw new Error(
					`Insufficient token balance. You have ${balanceCheck.balance} tokens but need approximately ${estimatedTokens} tokens for this selection refinement.`,
				);
			}

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
						const billing = calculateLLMBillableTokens(
							usage.inputTokens || 0,
							usage.outputTokens || 0,
						);

						await convex.mutation(api.billing.usage.recordUsage, {
							secret: process.env.BILLING_SECRET!,
							userId: user._id,
							workspaceId: workspace._id,
							projectId: contentPiece.projectId,
							contentPieceId,
							operationType: "content_refinement",
							provider: aiConfig.provider,
							model: aiConfig.model,
							inputTokens: usage.inputTokens || 0,
							outputTokens: usage.outputTokens || 0,
							totalTokens: billing.actualTokens,
							billableTokens: billing.billableTokens,
							chargeType: "multiplier",
							multiplier: billing.multiplier,
							requestMetadata: JSON.stringify({
								instructions,
								selectionLength: selectedText.length,
							}),
							success: true,
						});
					}
				} catch (error) {
					console.error("Failed to record token usage:", error);
				}
			})();

			// Return streaming response
			return result.toTextStreamResponse();
		} catch (error) {
			console.error("Selection refinement error:", error);

			// Return detailed error message
			const errorMessage =
				error instanceof Error ? error.message : "Unknown error occurred";

			throw new Error(
				`Failed to refine selection: ${errorMessage}. Please check your AI provider configuration and try again.`
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
			const convex = await getAuthenticatedConvexClient();

			// Get current user and workspace
			const user = await convex.query(api.users.getMe);
			if (!user) {
				throw new Error("User not found");
			}

			const workspace = await convex.query(api.workspaces.getMyWorkspace);
			if (!workspace) {
				throw new Error("Workspace not found");
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

			// Estimate token count for balance check
			const estimatedPromptTokens = countPromptTokens(systemPrompt, userPrompt);
			console.log("Image prompt estimated tokens:", estimatedPromptTokens);

			// Pre-flight balance check
			// Estimate: (prompt tokens) * 1.5 for output * 2 for safety margin
			const estimatedTokens = Math.ceil(estimatedPromptTokens * 1.5 * 2);

			const balanceCheck = await convex.query(api.billing.accounts.checkBalance, {
				userId: user._id,
				requiredTokens: estimatedTokens,
			});

			if (!balanceCheck.sufficient) {
				throw new Error(
					`Insufficient token balance. You have ${balanceCheck.balance} tokens but need approximately ${estimatedTokens} tokens for this image prompt generation.`,
				);
			}

			// Generate prompt using LLM
			const result = await generateText({
				model,
				system: systemPrompt,
				prompt: userPrompt,
				temperature: 0.8, // Higher temperature for creative prompts
				maxOutputTokens: 500,
			});

			// Record usage (synchronously for generateText)
			(async () => {
				try {
					if (result.usage) {
						const billing = calculateLLMBillableTokens(
							result.usage.inputTokens || 0,
							result.usage.outputTokens || 0,
						);

						await convex.mutation(api.billing.usage.recordUsage, {
							secret: process.env.BILLING_SECRET!,
							userId: user._id,
							workspaceId: workspace._id,
							operationType: "image_prompt_generation",
							provider: aiConfig.provider,
							model: aiConfig.model,
							inputTokens: result.usage.inputTokens || 0,
							outputTokens: result.usage.outputTokens || 0,
							totalTokens: billing.actualTokens,
							billableTokens: billing.billableTokens,
							chargeType: "multiplier",
							multiplier: billing.multiplier,
							requestMetadata: JSON.stringify({
								imageType: data.imageType,
								subject: data.subject,
							}),
							success: true,
						});
					}
				} catch (error) {
					console.error("Failed to record token usage:", error);
				}
			})();

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
 * Image Generation Strategy Interface
 */
import type {
	GenerateImageInput,
	GenerateImageResult,
	ImageAspectRatio,
} from "./image-generation/types";

export type {
	GenerateImageInput,
	GenerateImageResult,
	ImageAspectRatio,
};

import { ImageGenerationFactory } from "./image-generation/factory";
import { getAuthenticatedConvexClient, getAIEnvironment } from "./utils";

/**
 * Generate image using configured strategy
 *
 * Server function that generates an image using the selected strategy (OpenAI or Google),
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

			// Get environment variables
			// In Cloudflare Workers, process.env might not be fully populated with all vars if not explicitly passed
			// But here we are in a server function which should have access to process.env
			const env = process.env;

			// Create strategy
			const strategy = ImageGenerationFactory.createStrategy(env);

			// Execute generation
			return await strategy.generate(data, userId);

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


/**
 * Input parameters for content repurposing
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
 * Construct system prompt for content repurposing
 */
function constructRepurposeSystemPrompt(
	_sourceContext: GenerationContext,
	targetContext: GenerationContext,
	sourceCategoryName: string,
	targetCategoryName: string
): string {
	const parts = [
		"You are an expert content writer specializing in repurposing content across different formats.",
		"",
		"YOUR TASK:",
		`Transform content from "${sourceCategoryName}" format into "${targetCategoryName}" format.`,
		"Preserve the core message, key points, and valuable information while adapting the structure and style.",
		"",
		"IMPORTANT GUIDELINES:",
		"- Maintain accuracy of all facts and information from the source",
		"- Adapt the tone and structure for the new format",
		"- Keep the content engaging and appropriate for the target format",
		"- Output only the repurposed content, no explanations or meta-commentary",
	];

	// Add target format guidelines
	if (targetContext.formatGuidelines) {
		parts.push(`\nTARGET FORMAT GUIDELINES:\n${targetContext.formatGuidelines}`);
	}

	// Add target brand voice
	if (targetContext.brandVoiceDescription) {
		parts.push(`\nTARGET BRAND VOICE:\n${targetContext.brandVoiceDescription}`);
	}

	// Add target persona
	if (targetContext.personaDescription) {
		parts.push(`\nTARGET PERSONA:\nWrite as if you are: ${targetContext.personaDescription}`);
	}

	// Add target examples if available
	if (targetContext.examples.length > 0) {
		parts.push("\nEXAMPLE OUTPUT CONTENT:");
		for (const example of targetContext.examples) {
			parts.push(`\n${example.title}:\n${example.content}`);
		}
	}

	return parts.join("\n");
}

/**
 * Construct user prompt for content repurposing
 */
function constructRepurposeUserPrompt(
	sourceContent: string,
	title: string,
	additionalInstructions?: string
): string {
	const parts = [
		`Please repurpose the following content into the new format.`,
		``,
		`NEW TITLE: "${title}"`,
		``,
		`SOURCE CONTENT:`,
		sourceContent,
	];

	if (additionalInstructions) {
		parts.push(``, `ADDITIONAL INSTRUCTIONS:`, additionalInstructions);
	}

	parts.push(``, `Please provide the repurposed content:`);

	return parts.join("\n");
}

/**
 * Repurpose content from one format to another
 *
 * Server function that takes existing content and transforms it into a new format
 * (category) while preserving the core message. Supports streaming response.
 */
export const repurposeContent = createServerFn({ method: "POST" })
	.inputValidator((input: RepurposeContentInput) => input)
	.handler(async ({ data }) => {
		try {
			const convex = await getAuthenticatedConvexClient();
			const {
				sourceContentPieceId,
				targetCategoryId,
				targetPersonaId,
				targetBrandVoiceId,
				title,
				additionalInstructions,
			} = data;

			// Get current user and workspace
			const user = await convex.query(api.users.getMe);
			if (!user) {
				throw new Error("User not found");
			}

			const workspace = await convex.query(api.workspaces.getMyWorkspace);
			if (!workspace) {
				throw new Error("Workspace not found");
			}

			// Get source content piece
			const sourceContentPiece = await convex.query(
				api.contentPieces.getContentPiece,
				{
					contentPieceId: sourceContentPieceId,
				}
			);

			// Get source category for display name
			const sourceCategory = await convex.query(api.categories.getCategory, {
				categoryId: sourceContentPiece.categoryId,
			});

			// Get target category for display name
			const targetCategory = await convex.query(api.categories.getCategory, {
				categoryId: targetCategoryId,
			});

			if (!targetCategory) {
				throw new Error("Target category not found");
			}

			// Get project for AI configuration
			const project = await convex.query(api.projects.getProject, {
				projectId: sourceContentPiece.projectId,
			});

			// Assemble source context (for reference)
			const sourceContext = await assembleGenerationContext({
				data: {
					categoryId: sourceContentPiece.categoryId,
					personaId: sourceContentPiece.personaId,
					brandVoiceId: sourceContentPiece.brandVoiceId,
					projectId: sourceContentPiece.projectId,
				},
			});

			// Assemble target context (persona, brand voice, category guidelines)
			const targetContext = await assembleGenerationContext({
				data: {
					categoryId: targetCategoryId,
					personaId: targetPersonaId ?? sourceContentPiece.personaId,
					brandVoiceId: targetBrandVoiceId ?? sourceContentPiece.brandVoiceId,
					projectId: sourceContentPiece.projectId,
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

			// Construct prompts
			const systemPrompt = constructRepurposeSystemPrompt(
				sourceContext,
				targetContext,
				sourceCategory?.name ?? "Unknown",
				targetCategory.name
			);
			const userPrompt = constructRepurposeUserPrompt(
				sourceContentPiece.content,
				title,
				additionalInstructions
			);

			// Estimate token count for logging
			const estimatedPromptTokens = countPromptTokens(systemPrompt, userPrompt);
			console.log("Repurpose estimated prompt tokens:", estimatedPromptTokens);

			// Pre-flight balance check
			// Estimate: (prompt tokens) * 1.5 for output * 2 for safety margin
			const estimatedTokens = Math.ceil(estimatedPromptTokens * 1.5 * 2);

			const balanceCheck = await convex.query(api.billing.accounts.checkBalance, {
				userId: user._id,
				requiredTokens: estimatedTokens,
			});

			if (!balanceCheck.sufficient) {
				throw new Error(
					`Insufficient token balance. You have ${balanceCheck.balance} tokens but need approximately ${estimatedTokens} tokens for this content repurpose.`,
				);
			}

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
						const billing = calculateLLMBillableTokens(
							usage.inputTokens || 0,
							usage.outputTokens || 0,
						);

						await convex.mutation(api.billing.usage.recordUsage, {
							secret: process.env.BILLING_SECRET!,
							userId: user._id,
							workspaceId: workspace._id,
							projectId: sourceContentPiece.projectId,
							contentPieceId: sourceContentPieceId,
							operationType: "content_repurpose",
							provider: aiConfig.provider,
							model: aiConfig.model,
							inputTokens: usage.inputTokens || 0,
							outputTokens: usage.outputTokens || 0,
							totalTokens: billing.actualTokens,
							billableTokens: billing.billableTokens,
							chargeType: "multiplier",
							multiplier: billing.multiplier,
							requestMetadata: JSON.stringify({
								sourceCategory: sourceCategory?.name,
								targetCategory: targetCategory.name,
								title,
							}),
							success: true,
						});
					}
				} catch (error) {
					console.error("Failed to record token usage:", error);
				}
			})();

			// Return streaming response
			return result.toTextStreamResponse();
		} catch (error) {
			console.error("Content repurposing error:", error);

			const errorMessage =
				error instanceof Error ? error.message : "Unknown error occurred";

			throw new Error(
				`Failed to repurpose content: ${errorMessage}. Please check your AI provider configuration and try again.`,
			);
		}
	});
