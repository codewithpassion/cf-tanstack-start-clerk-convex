/**
 * BillingService - Token Balance and Usage Tracking
 *
 * Handles all billing-related operations including balance checks,
 * token estimation, and usage recording.
 */

import type { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/api";
import type { Id } from "@/convex/dataModel";
import type { AIProvider } from "@/lib/ai/providers";
import { calculateLLMBillableTokens } from "@/lib/billing/pricing";
import { estimateTokenCount } from "@/lib/ai/models";
import type { OperationType, TokenUsage } from "../core/types";
import { AI_DEFAULTS } from "../core/constants";
import { InsufficientBalanceError } from "../core/errors";

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
 * Service for handling billing operations
 */
export class BillingService {
	constructor(
		private readonly convex: ConvexHttpClient,
		private readonly billingSecret: string,
	) {}

	/**
	 * Estimate token count for a prompt
	 */
	estimateTokens(text: string): number {
		return estimateTokenCount(text);
	}

	/**
	 * Estimate tokens needed for an operation including output buffer
	 *
	 * Uses a multiplier to account for expected output tokens and safety margin.
	 */
	estimateRequiredTokens(
		promptTokens: number,
		multiplier = AI_DEFAULTS.TOKEN_ESTIMATE_MULTIPLIER,
	): number {
		return Math.ceil(promptTokens * multiplier);
	}

	/**
	 * Check if user has sufficient balance for an operation
	 *
	 * @throws InsufficientBalanceError if balance is insufficient
	 */
	async checkBalance(
		userId: Id<"users">,
		requiredTokens: number,
	): Promise<void> {
		const result = await this.convex.query(api.billing.accounts.checkBalance, {
			userId,
			requiredTokens,
		});

		if (!result.sufficient) {
			throw new InsufficientBalanceError(result.balance, requiredTokens);
		}
	}

	/**
	 * Record token usage for an operation
	 *
	 * This is typically called asynchronously after the AI operation completes.
	 */
	async recordUsage(params: RecordUsageParams): Promise<void> {
		const billing = calculateLLMBillableTokens(
			params.inputTokens,
			params.outputTokens,
		);

		await this.convex.mutation(api.billing.usage.recordUsage, {
			secret: this.billingSecret,
			userId: params.userId,
			workspaceId: params.workspaceId,
			projectId: params.projectId,
			contentPieceId: params.contentPieceId,
			operationType: params.operationType,
			provider: params.provider,
			model: params.model,
			inputTokens: params.inputTokens,
			outputTokens: params.outputTokens,
			totalTokens: billing.actualTokens,
			billableTokens: billing.billableTokens,
			chargeType: "multiplier",
			multiplier: billing.multiplier,
			requestMetadata: params.metadata ? JSON.stringify(params.metadata) : undefined,
			success: true,
		});
	}

	/**
	 * Record usage from token usage object (convenience method)
	 */
	async recordUsageFromResult(
		params: Omit<RecordUsageParams, "inputTokens" | "outputTokens">,
		usage: TokenUsage | undefined,
	): Promise<void> {
		if (!usage) return;

		await this.recordUsage({
			...params,
			inputTokens: usage.inputTokens,
			outputTokens: usage.outputTokens,
		});
	}

	/**
	 * Create an async usage tracker that can be awaited later
	 *
	 * Returns a function that tracks usage without blocking the main flow.
	 * The returned promise can be caught to handle errors gracefully.
	 */
	createUsageTracker(
		params: Omit<RecordUsageParams, "inputTokens" | "outputTokens">,
	): (usage: TokenUsage | undefined) => void {
		return (usage: TokenUsage | undefined) => {
			if (!usage) return;

			// Fire and forget - errors are logged but don't affect the main flow
			this.recordUsage({
				...params,
				inputTokens: usage.inputTokens,
				outputTokens: usage.outputTokens,
			}).catch((error) => {
				console.error("Failed to record token usage:", error);
			});
		};
	}
}
