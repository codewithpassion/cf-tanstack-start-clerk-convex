/**
 * BaseAIService - Template Method Pattern for AI Operations
 *
 * Abstract base class that defines the skeleton algorithm for AI operations.
 * Subclasses implement specific steps while inheriting common functionality
 * like authentication, billing, and error handling.
 *
 * Template Method Pattern:
 * 1. validateInput() - Hook: Optional input validation
 * 2. fetchOperationData() - Abstract: Get operation-specific data
 * 3. assembleContext() - Hook: Build generation context
 * 4. buildPrompts() - Abstract: Construct system and user prompts
 * 5. checkBalance() - Final: Verify sufficient tokens
 * 6. executeAI() - Abstract: Run the AI operation
 * 7. trackUsage() - Final: Record token usage (async)
 * 8. formatOutput() - Abstract: Format the result
 */

import type { ConvexHttpClient } from "convex/browser";
import type { Id } from "@/convex/dataModel";
import { ContextRepository } from "../context/ContextRepository";
import { BillingService } from "../billing/BillingService";
import { AIExecutor } from "../execution/AIExecutor";
import type {
	GenerationContext,
	PromptPair,
	TokenUsage,
	OperationType,
	AIEnvironment,
	ProjectAISettings,
} from "../core/types";
import { formatErrorForUser } from "../core/errors";

/**
 * Authentication context passed to services
 */
export interface AuthContext {
	userId: Id<"users">;
	workspaceId: Id<"workspaces">;
}

/**
 * Base operation data that all operations need
 */
export interface BaseOperationData {
	projectId: Id<"projects">;
	projectSettings: ProjectAISettings;
}

/**
 * Dependencies injected into services
 */
export interface ServiceDependencies {
	convex: ConvexHttpClient;
	billingSecret: string;
	env: AIEnvironment;
}

/**
 * Abstract base class for AI services
 *
 * @template TInput - Type of input for the operation
 * @template TOutput - Type of output from the operation
 * @template TOperationData - Type of operation-specific data
 */
export abstract class BaseAIService<
	TInput,
	TOutput,
	TOperationData extends BaseOperationData = BaseOperationData,
> {
	protected readonly contextRepository: ContextRepository;
	protected readonly billingService: BillingService;
	protected readonly env: AIEnvironment;
	protected readonly convex: ConvexHttpClient;

	constructor(protected readonly deps: ServiceDependencies) {
		this.convex = deps.convex;
		this.env = deps.env;
		this.contextRepository = new ContextRepository(deps.convex);
		this.billingService = new BillingService(deps.convex, deps.billingSecret);
	}

	/**
	 * The operation type for billing tracking
	 */
	protected abstract readonly operationType: OperationType;

	/**
	 * Execute the AI operation
	 *
	 * This is the template method that defines the algorithm skeleton.
	 */
	async execute(input: TInput, auth: AuthContext): Promise<TOutput> {
		try {
			// Step 1: Validate input (hook - can be overridden)
			this.validateInput(input);

			// Step 2: Fetch operation-specific data
			const operationData = await this.fetchOperationData(input, auth);

			// Step 3: Assemble generation context (hook - can be overridden)
			const context = await this.assembleContext(input, operationData, auth);

			// Step 4: Build prompts
			const prompts = this.buildPrompts(input, context, operationData);

			// Step 5: Estimate tokens and check balance
			const estimatedTokens = this.estimateTokens(prompts);
			await this.billingService.checkBalance(auth.userId, estimatedTokens);

			// Step 6: Optional pre-execute hook
			await this.beforeExecute(input, prompts, operationData, auth);

			// Step 7: Create executor and execute AI operation
			const executor = new AIExecutor(this.env, operationData.projectSettings);
			const result = await this.executeAI(executor, prompts, operationData);

			// Step 8: Track usage asynchronously (doesn't block response)
			this.trackUsage(result.usage, auth, operationData, executor);

			// Step 9: Format and return output
			return this.formatOutput(result, operationData);
		} catch (error) {
			// Format error for user display
			const message = formatErrorForUser(error, this.getOperationName());
			throw new Error(message);
		}
	}

	// ==========================================================================
	// Abstract Methods - Must be implemented by subclasses
	// ==========================================================================

	/**
	 * Fetch data specific to this operation
	 */
	protected abstract fetchOperationData(
		input: TInput,
		auth: AuthContext,
	): Promise<TOperationData>;

	/**
	 * Build the system and user prompts
	 */
	protected abstract buildPrompts(
		input: TInput,
		context: GenerationContext,
		data: TOperationData,
	): PromptPair;

	/**
	 * Execute the AI operation (streaming or non-streaming)
	 */
	protected abstract executeAI(
		executor: AIExecutor,
		prompts: PromptPair,
		data: TOperationData,
	): Promise<{ output: TOutput; usage: Promise<TokenUsage | undefined> }> | { output: TOutput; usage: Promise<TokenUsage | undefined> };

	/**
	 * Format the raw AI output into the expected return type
	 */
	protected abstract formatOutput(
		result: { output: TOutput; usage: Promise<TokenUsage | undefined> },
		data: TOperationData,
	): TOutput;

	/**
	 * Get human-readable operation name for error messages
	 */
	protected abstract getOperationName(): string;

	// ==========================================================================
	// Hook Methods - Can be overridden by subclasses
	// ==========================================================================

	/**
	 * Validate input before processing
	 * Override to add custom validation
	 */
	protected validateInput(_input: TInput): void {
		// Default: no validation
	}

	/**
	 * Assemble generation context
	 * Override to customize context assembly
	 */
	protected async assembleContext(
		_input: TInput,
		_data: TOperationData,
		_auth: AuthContext,
	): Promise<GenerationContext> {
		// Default: empty context (subclasses should override)
		return {
			knowledgeBase: [],
			examples: [],
		};
	}

	/**
	 * Called before AI execution
	 * Override to perform pre-execution tasks (e.g., saving prompts)
	 */
	protected async beforeExecute(
		_input: TInput,
		_prompts: PromptPair,
		_data: TOperationData,
		_auth: AuthContext,
	): Promise<void> {
		// Default: no pre-execution tasks
	}

	/**
	 * Estimate tokens needed for the operation
	 * Override to customize token estimation
	 */
	protected estimateTokens(prompts: PromptPair): number {
		const promptTokens = this.billingService.estimateTokens(
			prompts.system + prompts.user,
		);
		return this.billingService.estimateRequiredTokens(promptTokens);
	}

	// ==========================================================================
	// Final Methods - Cannot be overridden
	// ==========================================================================

	/**
	 * Track usage asynchronously
	 * This runs in the background and doesn't block the response
	 */
	private trackUsage(
		usagePromise: Promise<TokenUsage | undefined>,
		auth: AuthContext,
		data: TOperationData,
		executor: AIExecutor,
	): void {
		// Fire and forget
		usagePromise
			.then((usage) => {
				if (usage) {
					return this.billingService.recordUsage({
						userId: auth.userId,
						workspaceId: auth.workspaceId,
						projectId: data.projectId,
						operationType: this.operationType,
						provider: executor.getProvider(),
						model: executor.getModel(),
						inputTokens: usage.inputTokens,
						outputTokens: usage.outputTokens,
						metadata: this.getUsageMetadata(data),
					});
				}
			})
			.catch((error) => {
				console.error("Failed to record token usage:", error);
			});
	}

	/**
	 * Get metadata for usage tracking
	 * Override to add custom metadata
	 */
	protected getUsageMetadata(_data: TOperationData): Record<string, unknown> {
		return {};
	}
}
