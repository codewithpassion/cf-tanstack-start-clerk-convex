/**
 * RefineContentService - AI Content Refinement
 *
 * Service for refining entire content pieces using AI.
 * Implements the template method pattern via BaseAIService.
 */

import type { Id } from "@/convex/dataModel";
import {
	BaseAIService,
	type AuthContext,
	type BaseOperationData,
	type ServiceDependencies,
} from "./BaseAIService";
import { RefinePromptStrategy } from "../prompts/strategies/RefinePromptStrategy";
import type { AIExecutor } from "../execution/AIExecutor";
import type {
	RefineContentInput,
	GenerationContext,
	PromptPair,
	TokenUsage,
	OperationType,
} from "../core/types";

/**
 * Operation data specific to content refinement
 */
interface RefineOperationData extends BaseOperationData {
	contentPieceId: Id<"contentPieces">;
	categoryId: Id<"categories">;
	personaId?: Id<"personas">;
	brandVoiceId?: Id<"brandVoices">;
	selectedKnowledgeBaseIds?: Id<"knowledgeBaseItems">[];
	contentLength: number;
}

/**
 * Result type for streaming operations
 */
interface StreamingOperationResult {
	output: Response;
	usage: Promise<TokenUsage | undefined>;
}

/**
 * Service for refining content
 */
export class RefineContentService extends BaseAIService<
	RefineContentInput,
	Response,
	RefineOperationData
> {
	protected readonly operationType: OperationType = "content_refinement";
	private readonly promptStrategy = new RefinePromptStrategy();

	constructor(deps: ServiceDependencies) {
		super(deps);
	}

	protected getOperationName(): string {
		return "refine content";
	}

	protected async fetchOperationData(
		input: RefineContentInput,
		_auth: AuthContext,
	): Promise<RefineOperationData> {
		const contentPiece = await this.contextRepository.getContentPieceOrThrow(
			input.contentPieceId,
		);
		const project = await this.contextRepository.getProjectOrThrow(
			contentPiece.projectId,
		);

		return {
			contentPieceId: input.contentPieceId,
			categoryId: contentPiece.categoryId,
			personaId: contentPiece.personaId,
			brandVoiceId: contentPiece.brandVoiceId,
			selectedKnowledgeBaseIds: contentPiece.selectedKnowledgeBaseIds,
			contentLength: input.currentContent.length,
			projectId: contentPiece.projectId,
			projectSettings: {
				defaultAiProvider: project.defaultAiProvider,
				defaultAiModel: project.defaultAiModel,
			},
		};
	}

	protected async assembleContext(
		_input: RefineContentInput,
		data: RefineOperationData,
		_auth: AuthContext,
	): Promise<GenerationContext> {
		return this.contextRepository.assembleContext({
			categoryId: data.categoryId,
			personaId: data.personaId,
			brandVoiceId: data.brandVoiceId,
			projectId: data.projectId,
			selectedKnowledgeBaseIds: data.selectedKnowledgeBaseIds,
		});
	}

	protected buildPrompts(
		input: RefineContentInput,
		context: GenerationContext,
		_data: RefineOperationData,
	): PromptPair {
		return this.promptStrategy.buildPrompts(input, context);
	}

	protected async beforeExecute(
		_input: RefineContentInput,
		prompts: PromptPair,
		data: RefineOperationData,
		_auth: AuthContext,
	): Promise<void> {
		// Save the full prompt to the content piece
		const fullPrompt = `${prompts.system}\n\n--- USER PROMPT ---\n\n${prompts.user}`;
		await this.contextRepository.saveGeneratedPrompt(
			data.contentPieceId,
			fullPrompt,
		);
	}

	protected executeAI(
		executor: AIExecutor,
		prompts: PromptPair,
		_data: RefineOperationData,
	): StreamingOperationResult {
		const result = executor.stream({
			system: prompts.system,
			prompt: prompts.user,
		});

		return {
			output: result.toTextStreamResponse(),
			usage: result.usage,
		};
	}

	protected formatOutput(
		result: StreamingOperationResult,
		_data: RefineOperationData,
	): Response {
		return result.output;
	}

	protected getUsageMetadata(data: RefineOperationData): Record<string, unknown> {
		return {
			contentLength: data.contentLength,
		};
	}
}
