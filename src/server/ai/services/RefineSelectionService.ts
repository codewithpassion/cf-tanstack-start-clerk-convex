/**
 * RefineSelectionService - AI Selection Refinement
 *
 * Service for refining selected portions of content using AI.
 * Implements the template method pattern via BaseAIService.
 */

import type { Id } from "@/convex/dataModel";
import {
	BaseAIService,
	type AuthContext,
	type BaseOperationData,
	type ServiceDependencies,
} from "./BaseAIService";
import { SelectionRefinePromptStrategy } from "../prompts/strategies/SelectionRefinePromptStrategy";
import type { AIExecutor } from "../execution/AIExecutor";
import type {
	RefineSelectionInput,
	GenerationContext,
	PromptPair,
	TokenUsage,
	OperationType,
} from "../core/types";

/**
 * Operation data specific to selection refinement
 */
interface SelectionRefineOperationData extends BaseOperationData {
	contentPieceId: Id<"contentPieces">;
	categoryId: Id<"categories">;
	personaId?: Id<"personas">;
	brandVoiceId?: Id<"brandVoices">;
	selectedKnowledgeBaseIds?: Id<"knowledgeBaseItems">[];
	selectionLength: number;
}

/**
 * Result type for streaming operations
 */
interface StreamingOperationResult {
	output: Response;
	usage: Promise<TokenUsage | undefined>;
}

/**
 * Service for refining selected content
 */
export class RefineSelectionService extends BaseAIService<
	RefineSelectionInput,
	Response,
	SelectionRefineOperationData
> {
	protected readonly operationType: OperationType = "content_refinement";
	private readonly promptStrategy = new SelectionRefinePromptStrategy();

	constructor(deps: ServiceDependencies) {
		super(deps);
	}

	protected getOperationName(): string {
		return "refine selection";
	}

	protected async fetchOperationData(
		input: RefineSelectionInput,
		_auth: AuthContext,
	): Promise<SelectionRefineOperationData> {
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
			selectionLength: input.selectedText.length,
			projectId: contentPiece.projectId,
			projectSettings: {
				defaultAiProvider: project.defaultAiProvider,
				defaultAiModel: project.defaultAiModel,
			},
		};
	}

	protected async assembleContext(
		_input: RefineSelectionInput,
		data: SelectionRefineOperationData,
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
		input: RefineSelectionInput,
		context: GenerationContext,
		_data: SelectionRefineOperationData,
	): PromptPair {
		return this.promptStrategy.buildPrompts(input, context);
	}

	protected async beforeExecute(
		_input: RefineSelectionInput,
		prompts: PromptPair,
		data: SelectionRefineOperationData,
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
		_data: SelectionRefineOperationData,
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
		_data: SelectionRefineOperationData,
	): Response {
		return result.output;
	}

	protected getUsageMetadata(
		data: SelectionRefineOperationData,
	): Record<string, unknown> {
		return {
			selectionLength: data.selectionLength,
		};
	}
}
