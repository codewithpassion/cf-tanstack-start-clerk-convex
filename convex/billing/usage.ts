import { ConvexError, v } from "convex/values";
import { mutation, query, type MutationCtx, type QueryCtx } from "../_generated/server";
import type { Id } from "../_generated/dataModel";
import { internal } from "../_generated/api";

/**
 * Record AI usage and deduct tokens from user's account.
 *
 * CRITICAL SECURITY: This mutation requires BILLING_SECRET to prevent client-side manipulation.
 * Only server-side code should call this function with the secret from environment variables.
 *
 * This function:
 * 1. Validates the billing secret
 * 2. Records the usage in tokenUsage table
 * 3. Deducts tokens from the user's account (if successful operation)
 *
 * @param secret - BILLING_SECRET from server environment (REQUIRED for security)
 * @param userId - The user's ID
 * @param workspaceId - The user's workspace ID
 * @param projectId - The project ID (optional)
 * @param contentPieceId - The content piece ID (optional)
 * @param operationType - Type of AI operation performed
 * @param provider - AI provider used
 * @param model - AI model used
 * @param inputTokens - Number of input tokens (optional, for LLM)
 * @param outputTokens - Number of output tokens (optional, for LLM)
 * @param totalTokens - Total tokens (optional, for LLM)
 * @param imageCount - Number of images generated (optional, for image generation)
 * @param imageSize - Size of images (optional, for image generation)
 * @param billableTokens - Tokens to charge (after markup/fixed cost)
 * @param chargeType - Whether using multiplier or fixed cost
 * @param multiplier - Token multiplier applied (optional, for multiplier charge type)
 * @param fixedCost - Fixed token cost (optional, for fixed charge type)
 * @param requestMetadata - Additional metadata (optional)
 * @param success - Whether the operation succeeded
 * @param errorMessage - Error message if failed (optional)
 * @returns The usage record ID
 *
 * @throws {ConvexError} If billing secret is invalid
 *
 * @example
 * ```ts
 * // Server-side only!
 * const usageId = await ctx.runMutation(api.billing.usage.recordUsage, {
 *   secret: process.env.BILLING_SECRET!,
 *   userId,
 *   workspaceId,
 *   projectId,
 *   operationType: "content_generation",
 *   provider: "openai",
 *   model: "gpt-4",
 *   inputTokens: 1000,
 *   outputTokens: 500,
 *   totalTokens: 1500,
 *   billableTokens: 2250, // 1500 * 1.5 multiplier
 *   chargeType: "multiplier",
 *   multiplier: 1.5,
 *   success: true
 * });
 * ```
 */
export const recordUsage = mutation({
	args: {
		// Security
		secret: v.string(),

		// User/Project Context
		userId: v.id("users"),
		workspaceId: v.id("workspaces"),
		projectId: v.optional(v.id("projects")),
		contentPieceId: v.optional(v.id("contentPieces")),

		// Operation Details
		operationType: v.union(
			v.literal("content_generation"),
			v.literal("content_refinement"),
			v.literal("content_repurpose"),
			v.literal("chat_response"),
			v.literal("image_generation"),
			v.literal("image_prompt_generation")
		),

		// AI Service Details
		provider: v.union(
			v.literal("openai"),
			v.literal("anthropic"),
			v.literal("google")
		),
		model: v.string(),

		// LLM Token Usage (optional for image operations)
		inputTokens: v.optional(v.number()),
		outputTokens: v.optional(v.number()),
		totalTokens: v.optional(v.number()),

		// Image Details (optional for LLM operations)
		imageCount: v.optional(v.number()),
		imageSize: v.optional(v.string()),

		// Billing Details
		billableTokens: v.number(),
		chargeType: v.union(v.literal("multiplier"), v.literal("fixed")),
		multiplier: v.optional(v.number()),
		fixedCost: v.optional(v.number()),

		// Additional Metadata
		requestMetadata: v.optional(v.string()),
		success: v.boolean(),
		errorMessage: v.optional(v.string()),
	},
	handler: async (
		ctx: MutationCtx,
		{
			secret,
			userId,
			workspaceId,
			projectId,
			contentPieceId,
			operationType,
			provider,
			model,
			inputTokens,
			outputTokens,
			totalTokens,
			imageCount,
			imageSize,
			billableTokens,
			chargeType,
			multiplier,
			fixedCost,
			requestMetadata,
			success,
			errorMessage,
		}
	): Promise<Id<"tokenUsage">> => {
		// CRITICAL SECURITY: Validate billing secret
		if (secret !== process.env.BILLING_SECRET) {
			throw new ConvexError("Unauthorized: Invalid billing secret");
		}

		const now = Date.now();

		// Insert usage record
		const usageId = await ctx.db.insert("tokenUsage", {
			userId,
			workspaceId,
			projectId,
			contentPieceId,
			operationType,
			provider,
			model,
			inputTokens,
			outputTokens,
			totalTokens,
			imageCount,
			imageSize,
			billableTokens,
			chargeType,
			multiplier,
			fixedCost,
			requestMetadata,
			success,
			errorMessage,
			createdAt: now,
		});

		// Deduct tokens if the operation succeeded and has billable tokens
		if (success && billableTokens > 0) {
			// Calculate actual tokens used (the real cost before markup)
			const actualTokens = chargeType === "multiplier" && multiplier
				? Math.round(billableTokens / multiplier)
				: billableTokens;

			// Call internal mutation to deduct tokens
			await ctx.runMutation(internal.billing.accounts.deductTokens, {
				userId,
				workspaceId,
				tokenUsageId: usageId,
				billableTokens,
				actualTokens,
			});
		}

		return usageId;
	},
});

/**
 * Get usage history for a user.
 *
 * Returns detailed usage logs for the user, optionally filtered by operation type.
 * Results are ordered by most recent first.
 *
 * @param userId - The user's ID
 * @param limit - Maximum number of records to return (default: 50)
 * @param operationType - Filter by specific operation type (optional)
 * @returns Array of usage records
 *
 * @example
 * ```ts
 * // Get all recent usage
 * const usage = await ctx.runQuery(api.billing.usage.getUserUsage, {
 *   userId,
 *   limit: 100
 * });
 *
 * // Get only image generation usage
 * const imageUsage = await ctx.runQuery(api.billing.usage.getUserUsage, {
 *   userId,
 *   limit: 50,
 *   operationType: "image_generation"
 * });
 * ```
 */
export const getUserUsage = query({
	args: {
		userId: v.id("users"),
		limit: v.optional(v.number()),
		operationType: v.optional(
			v.union(
				v.literal("content_generation"),
				v.literal("content_refinement"),
				v.literal("content_repurpose"),
				v.literal("chat_response"),
				v.literal("image_generation"),
				v.literal("image_prompt_generation")
			)
		),
	},
	handler: async (
		ctx: QueryCtx,
		{ userId, limit = 50, operationType }
	) => {
		// Start with userId index query
		let usageQuery = ctx.db
			.query("tokenUsage")
			.withIndex("by_userId_createdAt", (q) => q.eq("userId", userId))
			.order("desc");

		// Fetch records
		const allRecords = await usageQuery.take(limit * 2); // Fetch extra in case we need to filter

		// Filter by operation type if provided
		const filteredRecords = operationType
			? allRecords.filter((record) => record.operationType === operationType)
			: allRecords;

		// Apply limit after filtering
		return filteredRecords.slice(0, limit);
	},
});
