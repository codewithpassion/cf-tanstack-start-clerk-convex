/**
 * ChatService - AI Chat Response Generation
 *
 * Service for generating chat responses in the context of content editing.
 * Uses a slightly different pattern than other services due to chat history.
 */

import type { Id } from "@/convex/dataModel";
import { ContextRepository } from "../context/ContextRepository";
import { BillingService } from "../billing/BillingService";
import { AIExecutor } from "../execution/AIExecutor";
import { ChatPromptStrategy } from "../prompts/strategies/ChatPromptStrategy";
import type {
	GenerateChatResponseInput,
	ChatMessage,
	TokenUsage,
	AIEnvironment,
} from "../core/types";
import { TOKEN_LIMITS } from "../core/constants";
import { formatErrorForUser } from "../core/errors";

/**
 * Authentication context
 */
interface AuthContext {
	userId: Id<"users">;
	workspaceId: Id<"workspaces">;
}

/**
 * Dependencies for the chat service
 */
interface ChatServiceDeps {
	convex: import("convex/browser").ConvexHttpClient;
	billingSecret: string;
	env: AIEnvironment;
}

/**
 * Service for generating chat responses
 */
export class ChatService {
	private readonly contextRepository: ContextRepository;
	private readonly billingService: BillingService;
	private readonly promptStrategy = new ChatPromptStrategy();
	private readonly env: AIEnvironment;

	constructor(deps: ChatServiceDeps) {
		this.env = deps.env;
		this.contextRepository = new ContextRepository(deps.convex);
		this.billingService = new BillingService(deps.convex, deps.billingSecret);
	}

	/**
	 * Generate a chat response
	 */
	async execute(
		input: GenerateChatResponseInput,
		auth: AuthContext,
	): Promise<Response> {
		try {
			const { contentPieceId, message, currentContent } = input;

			// Get content piece and project
			const contentPiece = await this.contextRepository.getContentPieceOrThrow(
				contentPieceId,
			);
			const project = await this.contextRepository.getProjectOrThrow(
				contentPiece.projectId,
			);

			// Get chat history
			const chatMessages = await this.contextRepository.getChatMessages(
				contentPieceId,
			);
			const chatHistory: ChatMessage[] = chatMessages
				.slice(-TOKEN_LIMITS.MAX_CHAT_HISTORY)
				.map((msg) => ({
					role: msg.role,
					content: msg.content,
				}));

			// Build prompts
			const systemPrompt = this.promptStrategy.buildSystemPrompt(currentContent);
			const messages = this.promptStrategy.buildMessages(chatHistory, message);

			// Estimate tokens and check balance
			const estimatedTokens = this.billingService.estimateRequiredTokens(
				this.billingService.estimateTokens(
					systemPrompt + JSON.stringify(messages),
				),
			);
			await this.billingService.checkBalance(auth.userId, estimatedTokens);

			// Create executor and stream response
			const executor = new AIExecutor(this.env, {
				defaultAiProvider: project.defaultAiProvider,
				defaultAiModel: project.defaultAiModel,
			});

			const result = executor.streamChat({
				system: systemPrompt,
				messages,
				maxOutputTokens: TOKEN_LIMITS.CHAT_MAX_OUTPUT_TOKENS,
			});

			// Save assistant message and track usage asynchronously
			this.handlePostExecution(
				result.text,
				result.usage,
				contentPieceId,
				auth,
				contentPiece.projectId,
				executor,
				chatHistory.length,
				message,
			);

			return result.toTextStreamResponse();
		} catch (error) {
			const message = formatErrorForUser(error, "generate chat response");
			throw new Error(message);
		}
	}

	/**
	 * Handle post-execution tasks asynchronously
	 */
	private handlePostExecution(
		textPromise: Promise<string>,
		usagePromise: Promise<TokenUsage | undefined>,
		contentPieceId: Id<"contentPieces">,
		auth: AuthContext,
		projectId: Id<"projects">,
		executor: AIExecutor,
		historyLength: number,
		userMessage: string,
	): void {
		// Save assistant message
		textPromise
			.then((text) => {
				return this.contextRepository.addChatMessage(
					contentPieceId,
					"assistant",
					text,
				);
			})
			.catch((error) => {
				console.error("Failed to save chat message:", error);
			});

		// Track usage
		usagePromise
			.then((usage) => {
				if (usage) {
					return this.billingService.recordUsage({
						userId: auth.userId,
						workspaceId: auth.workspaceId,
						projectId,
						contentPieceId,
						operationType: "chat_response",
						provider: executor.getProvider(),
						model: executor.getModel(),
						inputTokens: usage.inputTokens,
						outputTokens: usage.outputTokens,
						metadata: {
							message: userMessage,
							historyLength,
						},
					});
				}
			})
			.catch((error) => {
				console.error("Failed to record usage:", error);
			});
	}
}
