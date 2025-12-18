/**
 * ImagePromptService - AI Image Prompt Generation
 *
 * Service for generating image prompts using AI.
 * Uses non-streaming generation since output is short.
 */

import type { Id } from "@/convex/dataModel";
import { BillingService } from "../billing/BillingService";
import { AIExecutor } from "../execution/AIExecutor";
import { ImagePromptStrategy } from "../prompts/strategies/ImagePromptStrategy";
import type { GenerateImagePromptInput, AIEnvironment } from "../core/types";
import { TOKEN_LIMITS, AI_DEFAULTS } from "../core/constants";
import { formatErrorForUser } from "../core/errors";

/**
 * Authentication context
 */
interface AuthContext {
	userId: Id<"users">;
	workspaceId: Id<"workspaces">;
}

/**
 * Dependencies for the image prompt service
 */
interface ImagePromptServiceDeps {
	convex: import("convex/browser").ConvexHttpClient;
	billingSecret: string;
	env: AIEnvironment;
}

/**
 * Result from image prompt generation
 */
export interface ImagePromptResult {
	prompt: string;
}

/**
 * Service for generating image prompts
 */
export class ImagePromptService {
	private readonly billingService: BillingService;
	private readonly promptStrategy = new ImagePromptStrategy();
	private readonly env: AIEnvironment;

	constructor(deps: ImagePromptServiceDeps) {
		this.env = deps.env;
		this.billingService = new BillingService(deps.convex, deps.billingSecret);
	}

	/**
	 * Generate an image prompt
	 */
	async execute(
		input: GenerateImagePromptInput,
		auth: AuthContext,
	): Promise<ImagePromptResult> {
		try {
			// Build prompts
			const systemPrompt = this.promptStrategy.buildSystemPrompt();
			const userPrompt = this.promptStrategy.buildUserPrompt(input);

			// Estimate tokens and check balance
			const estimatedTokens = this.billingService.estimateRequiredTokens(
				this.billingService.estimateTokens(systemPrompt + userPrompt),
			);
			await this.billingService.checkBalance(auth.userId, estimatedTokens);

			// Use OpenAI with fast model for prompt generation
			const executor = new AIExecutor(this.env, {
				defaultAiProvider: "openai",
				defaultAiModel: "gpt-4o-mini",
			});

			// Generate (non-streaming)
			const result = await executor.generate({
				system: systemPrompt,
				prompt: userPrompt,
				temperature: AI_DEFAULTS.CREATIVE_TEMPERATURE,
				maxOutputTokens: TOKEN_LIMITS.IMAGE_PROMPT_MAX_OUTPUT_TOKENS,
			});

			// Track usage asynchronously
			if (result.usage) {
				this.billingService
					.recordUsage({
						userId: auth.userId,
						workspaceId: auth.workspaceId,
						operationType: "image_prompt_generation",
						provider: executor.getProvider(),
						model: executor.getModel(),
						inputTokens: result.usage.inputTokens,
						outputTokens: result.usage.outputTokens,
						metadata: {
							imageType: input.imageType,
							subject: input.subject,
						},
					})
					.catch((error) => {
						console.error("Failed to record usage:", error);
					});
			}

			// Enforce maximum length and return
			const generatedPrompt = result.text.trim();
			const finalPrompt =
				generatedPrompt.length > TOKEN_LIMITS.IMAGE_PROMPT_MAX_LENGTH
					? generatedPrompt.slice(0, TOKEN_LIMITS.IMAGE_PROMPT_MAX_LENGTH)
					: generatedPrompt;

			return { prompt: finalPrompt };
		} catch (error) {
			const message = formatErrorForUser(error, "generate image prompt");
			throw new Error(message);
		}
	}
}
