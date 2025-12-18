/**
 * RepurposeService - AI Content Repurposing
 *
 * Service for transforming content from one format to another.
 * Implements the template method pattern via BaseAIService.
 */

import type { Id } from "@/convex/dataModel";
import {
	BaseAIService,
	type AuthContext,
	type BaseOperationData,
	type ServiceDependencies,
} from "./BaseAIService";
import {
	RepurposePromptStrategy,
	type RepurposePromptData,
} from "../prompts/strategies/RepurposePromptStrategy";
import type { AIExecutor } from "../execution/AIExecutor";
import type {
	RepurposeContentInput,
	GenerationContext,
	PromptPair,
	TokenUsage,
	OperationType,
} from "../core/types";
import { convertTiptapToMarkdown } from "@/lib/markdown";

/**
 * Operation data specific to content repurposing
 */
interface RepurposeOperationData extends BaseOperationData {
	sourceContentPieceId: Id<"contentPieces">;
	sourceContent: string;
	sourceCategoryName: string;
	targetCategoryId: Id<"categories">;
	targetCategoryName: string;
	title: string;
}

/**
 * Result type for streaming operations
 */
interface StreamingOperationResult {
	output: Response;
	usage: Promise<TokenUsage | undefined>;
}

/**
 * Service for repurposing content
 */
export class RepurposeService extends BaseAIService<
	RepurposeContentInput,
	Response,
	RepurposeOperationData
> {
	protected readonly operationType: OperationType = "content_repurpose";
	private readonly promptStrategy = new RepurposePromptStrategy();

	constructor(deps: ServiceDependencies) {
		super(deps);
	}

	protected getOperationName(): string {
		return "repurpose content";
	}

	protected async fetchOperationData(
		input: RepurposeContentInput,
		_auth: AuthContext,
	): Promise<RepurposeOperationData> {
		// Get source content piece
		const sourceContentPiece = await this.contextRepository.getContentPieceOrThrow(
			input.sourceContentPieceId,
		);

		// Get source and target categories
		const [sourceCategory, targetCategory, project] = await Promise.all([
			this.contextRepository.getCategory(sourceContentPiece.categoryId),
			this.contextRepository.getCategoryOrThrow(input.targetCategoryId),
			this.contextRepository.getProjectOrThrow(sourceContentPiece.projectId),
		]);

		// Convert source content to markdown
		const sourceContent = convertTiptapToMarkdown(sourceContentPiece.content);

		return {
			sourceContentPieceId: input.sourceContentPieceId,
			sourceContent,
			sourceCategoryName: sourceCategory?.name ?? "Unknown",
			targetCategoryId: input.targetCategoryId,
			targetCategoryName: targetCategory.name,
			title: input.title,
			projectId: sourceContentPiece.projectId,
			projectSettings: {
				defaultAiProvider: project.defaultAiProvider,
				defaultAiModel: project.defaultAiModel,
			},
		};
	}

	protected async assembleContext(
		input: RepurposeContentInput,
		data: RepurposeOperationData,
		_auth: AuthContext,
	): Promise<GenerationContext> {
		// Get source content piece for persona/brand voice fallback
		const sourceContentPiece = await this.contextRepository.getContentPiece(
			input.sourceContentPieceId,
		);

		// Assemble target context with fallback to source persona/brand voice
		return this.contextRepository.assembleContext({
			categoryId: input.targetCategoryId,
			personaId: input.targetPersonaId ?? sourceContentPiece?.personaId,
			brandVoiceId: input.targetBrandVoiceId ?? sourceContentPiece?.brandVoiceId,
			projectId: data.projectId,
		});
	}

	protected buildPrompts(
		input: RepurposeContentInput,
		context: GenerationContext,
		data: RepurposeOperationData,
	): PromptPair {
		const promptData: RepurposePromptData = {
			sourceContent: data.sourceContent,
			sourceCategoryName: data.sourceCategoryName,
			targetCategoryName: data.targetCategoryName,
		};

		return this.promptStrategy.buildPrompts(input, context, promptData);
	}

	protected executeAI(
		executor: AIExecutor,
		prompts: PromptPair,
		_data: RepurposeOperationData,
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
		_data: RepurposeOperationData,
	): Response {
		return result.output;
	}

	protected getUsageMetadata(
		data: RepurposeOperationData,
	): Record<string, unknown> {
		return {
			sourceCategory: data.sourceCategoryName,
			targetCategory: data.targetCategoryName,
			title: data.title,
		};
	}
}
