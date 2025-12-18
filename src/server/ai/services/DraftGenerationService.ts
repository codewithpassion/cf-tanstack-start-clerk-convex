/**
 * DraftGenerationService - AI Draft Generation
 *
 * Service for generating content drafts using AI.
 * Implements the template method pattern via BaseAIService.
 */

import type { Id } from "@/convex/dataModel";
import {
	BaseAIService,
	type AuthContext,
	type BaseOperationData,
	type ServiceDependencies,
} from "./BaseAIService";
import { DraftPromptStrategy } from "../prompts/strategies/DraftPromptStrategy";
import type { AIExecutor } from "../execution/AIExecutor";
import type {
	GenerateDraftInput,
	GenerationContext,
	PromptPair,
	TokenUsage,
	OperationType,
} from "../core/types";

/**
 * Operation data specific to draft generation
 */
interface DraftOperationData extends BaseOperationData {
	contentPieceId: Id<"contentPieces">;
	categoryId: Id<"categories">;
	title: string;
	topic: string;
}

/**
 * Result type for streaming operations
 */
interface StreamingOperationResult {
	output: Response;
	usage: Promise<TokenUsage | undefined>;
}

/**
 * Service for generating content drafts
 */
export class DraftGenerationService extends BaseAIService<
	GenerateDraftInput,
	Response,
	DraftOperationData
> {
	protected readonly operationType: OperationType = "content_generation";
	private readonly promptStrategy = new DraftPromptStrategy();

	constructor(deps: ServiceDependencies) {
		super(deps);
	}

	protected getOperationName(): string {
		return "generate draft";
	}

	protected async fetchOperationData(
		input: GenerateDraftInput,
		_auth: AuthContext,
	): Promise<DraftOperationData> {
		const contentPiece = await this.contextRepository.getContentPieceOrThrow(
			input.contentPieceId,
		);
		const project = await this.contextRepository.getProjectOrThrow(
			contentPiece.projectId,
		);

		return {
			contentPieceId: input.contentPieceId,
			categoryId: input.categoryId,
			title: input.title,
			topic: input.topic,
			projectId: contentPiece.projectId,
			projectSettings: {
				defaultAiProvider: project.defaultAiProvider,
				defaultAiModel: project.defaultAiModel,
			},
		};
	}

	protected async assembleContext(
		input: GenerateDraftInput,
		data: DraftOperationData,
		_auth: AuthContext,
	): Promise<GenerationContext> {
		return this.contextRepository.assembleContext({
			categoryId: input.categoryId,
			personaId: input.personaId,
			brandVoiceId: input.brandVoiceId,
			projectId: data.projectId,
			selectedKnowledgeBaseIds: input.selectedKnowledgeBaseIds,
			uploadedFileIds: input.uploadedFileIds,
		});
	}

	protected buildPrompts(
		input: GenerateDraftInput,
		context: GenerationContext,
		_data: DraftOperationData,
	): PromptPair {
		return this.promptStrategy.buildPrompts(input, context);
	}

	protected async beforeExecute(
		_input: GenerateDraftInput,
		prompts: PromptPair,
		data: DraftOperationData,
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
		_data: DraftOperationData,
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
		_data: DraftOperationData,
	): Response {
		return result.output;
	}

	protected getUsageMetadata(data: DraftOperationData): Record<string, unknown> {
		return {
			category: data.categoryId,
			title: data.title,
			topic: data.topic,
		};
	}
}
