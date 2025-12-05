# Token-Based Billing System - Implementation Plan

**Created:** 2025-12-03
**Status:** Planning Phase - DO NOT IMPLEMENT YET
**Project:** Postmate Content Management System

---

## Executive Summary

This document outlines a comprehensive plan to implement a token-based billing system for tracking and monetizing LLM (Large Language Model) usage in the Postmate application. The system will track all AI-generated content and images, enable users to purchase tokens via Stripe, and provide detailed administrative oversight.

**Key Pricing Model:** Users are charged based on **actual token consumption** (input + output tokens) from the AI SDK, multiplied by a **configurable markup multiplier**. This provides transparent, usage-based billing that directly reflects actual AI costs.

### How Token Billing Works

1. **User generates content** → AI SDK returns actual token usage (e.g., 10,000 tokens)
2. **System applies multiplier** → 10,000 × 1.5 = 15,000 billable tokens
3. **User's balance is deducted** → 15,000 tokens removed from account
4. **Transparent billing** → Users see exactly how many tokens were consumed

**Example:**
```
Blog post generation with GPT-4o:
- Actual tokens consumed: 12,000 (10k input + 2k output)
- Markup multiplier: 1.5 (50% profit margin)
- Billable tokens: 12,000 × 1.5 = 18,000 tokens
- User's balance: 50,000 → 32,000 tokens
```

**Advantages:**
- ✅ Simple and transparent (users understand token math)
- ✅ Fair (pay-per-use, no wasted credits)
- ✅ Flexible (change multiplier anytime: 1.2x, 1.5x, 2.0x)
- ✅ Profitable (built-in margin without complex pricing)
- ✅ Model-agnostic (same multiplier works for all AI models)

### Current State Analysis

**AI Services Currently Used:**
- **Text Generation:** OpenAI (gpt-4o, gpt-4o-mini, gpt-4-turbo, gpt-3.5-turbo) and Anthropic (claude-3-5-sonnet, claude-3-5-haiku, claude-3-opus)
- **Image Generation:** OpenAI DALL-E 3 (primary), Google Nano Banana Pro (fallback)

**Current Token Tracking:**
- Token usage is **captured** from AI SDK responses (`usage.inputTokens`, `usage.outputTokens`)
- Token usage is **logged to console only** (4 TODO comments in `src/server/ai.ts`)
- **NO database persistence** - no billing or historical tracking exists
- Rough token estimation used before generation (1 token ≈ 4 characters)

**Generation Entry Points:**
1. `generateDraft()` - Initial content creation (streaming)
2. `generateChatResponse()` - AI chat assistance
3. `refineContent()` - Full-content refinement
4. `refineSelection()` - Selection-based refinement
5. `repurposeContent()` - Format transformation (blog → social media)
6. `generateImagePrompt()` - LLM-generated DALL-E prompts
7. `generateImage()` - Image generation (OpenAI/Google)

---

## 1. Token Tracking System Architecture

### 1.1 Database Schema Changes

#### New Table: `tokenUsage`
Tracks every AI generation with detailed metadata for billing and analytics.

```typescript
tokenUsage: defineTable({
  // User & Context
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
  model: v.string(), // e.g., "gpt-4o", "claude-3-5-sonnet", "dall-e-3"

  // Token Counts (actual from AI SDK)
  inputTokens: v.number(),
  outputTokens: v.number(),
  totalTokens: v.number(),

  // Billable Tokens (with markup multiplier applied)
  billableTokens: v.number(), // totalTokens * multiplier

  // Cost Calculation (in USD, stored as cents for precision - for analytics only)
  actualCostCents: v.number(), // Actual AI provider cost
  multiplier: v.number(), // Markup multiplier applied (e.g., 1.5 = 50% markup)

  // Metadata
  requestMetadata: v.optional(v.string()), // JSON: { prompt_length, category, persona, etc. }
  success: v.boolean(), // false if generation failed
  errorMessage: v.optional(v.string()),

  // Timestamps
  createdAt: v.number(),
})
  .index("by_userId", ["userId"])
  .index("by_userId_createdAt", ["userId", "createdAt"])
  .index("by_workspaceId", ["workspaceId"])
  .index("by_projectId", ["projectId"])
  .index("by_contentPieceId", ["contentPieceId"])
  .index("by_createdAt", ["createdAt"])
  .index("by_provider_model", ["provider", "model"]);
```

#### New Table: `tokenAccounts`
Stores each user's token balance and transaction history.

**Important:** Token balance represents **user-facing token credits**. When users generate content:
1. AI SDK returns actual tokens consumed (e.g., 1,000 tokens)
2. System applies markup multiplier (e.g., 1.5x)
3. Billable tokens = 1,000 × 1.5 = 1,500 tokens deducted from balance

```typescript
tokenAccounts: defineTable({
  // User Reference
  userId: v.id("users"),
  workspaceId: v.id("workspaces"),

  // Balance (in billable tokens - these are "user credits")
  balance: v.number(), // Current available tokens
  lifetimeTokensPurchased: v.number(), // Total tokens ever purchased
  lifetimeTokensUsed: v.number(), // Total billable tokens ever consumed (with multiplier)
  lifetimeActualTokensUsed: v.number(), // Total actual AI tokens consumed (without multiplier)
  lifetimeSpentCents: v.number(), // Total USD spent (in cents)

  // Auto-Recharge Settings
  autoRechargeEnabled: v.boolean(),
  autoRechargeThreshold: v.optional(v.number()), // Trigger at this balance
  autoRechargeAmount: v.optional(v.number()), // Number of tokens to purchase

  // Stripe Integration
  stripeCustomerId: v.optional(v.string()),
  defaultPaymentMethodId: v.optional(v.string()),

  // Status
  status: v.union(
    v.literal("active"),
    v.literal("suspended"), // Negative balance
    v.literal("blocked") // Admin action
  ),

  // Timestamps
  lastPurchaseAt: v.optional(v.number()),
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_userId", ["userId"])
  .index("by_workspaceId", ["workspaceId"])
  .index("by_status", ["status"]);
```

#### New Table: `tokenTransactions`
Ledger of all token purchases, grants, and deductions.

```typescript
tokenTransactions: defineTable({
  // User Reference
  userId: v.id("users"),
  workspaceId: v.id("workspaces"),

  // Transaction Details
  transactionType: v.union(
    v.literal("purchase"), // User bought tokens via Stripe
    v.literal("usage"), // Tokens consumed by AI generation
    v.literal("admin_grant"), // Admin awarded tokens
    v.literal("admin_deduction"), // Admin removed tokens
    v.literal("refund"), // Stripe refund
    v.literal("bonus") // Promotional tokens
  ),

  // Amount
  tokenAmount: v.number(), // Positive for credits, negative for debits
  balanceBefore: v.number(),
  balanceAfter: v.number(),

  // Cost (for purchases only, in cents)
  amountCents: v.optional(v.number()),

  // References
  tokenUsageId: v.optional(v.id("tokenUsage")), // Link to usage record
  stripePaymentIntentId: v.optional(v.string()),
  stripeInvoiceId: v.optional(v.string()),
  adminUserId: v.optional(v.id("users")), // Admin who granted/deducted

  // Metadata
  description: v.string(), // Human-readable description
  metadata: v.optional(v.string()), // JSON for additional data

  // Timestamps
  createdAt: v.number(),
})
  .index("by_userId", ["userId"])
  .index("by_userId_createdAt", ["userId", "createdAt"])
  .index("by_workspaceId", ["workspaceId"])
  .index("by_transactionType", ["transactionType"])
  .index("by_stripePaymentIntentId", ["stripePaymentIntentId"])
  .index("by_createdAt", ["createdAt"]);
```

#### New Table: `tokenPricing`
Configurable pricing tiers for token packages.

```typescript
tokenPricing: defineTable({
  // Package Details
  packageName: v.string(), // e.g., "Starter", "Pro", "Enterprise"
  tokenAmount: v.number(), // Number of tokens in package
  priceCents: v.number(), // Price in USD cents

  // Display
  description: v.optional(v.string()),
  isPopular: v.boolean(), // Highlight in UI
  sortOrder: v.number(),

  // Stripe Integration
  stripePriceId: v.string(), // Stripe Price ID for checkout

  // Status
  active: v.boolean(),

  // Timestamps
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_active", ["active"])
  .index("by_sortOrder", ["sortOrder"]);
```

#### Updates to Existing `users` Table
Add token-related metadata to users table:

```typescript
users: defineTable({
  // Existing fields...
  email: v.string(),
  name: v.optional(v.string()),
  clerkId: v.string(),
  imageUrl: v.optional(v.string()),
  roles: v.optional(v.array(v.string())),

  // NEW: Token-related fields
  onboardingTokensGranted: v.optional(v.boolean()), // Prevent duplicate welcome tokens
  billingEmail: v.optional(v.string()), // Separate email for invoices

  createdAt: v.number(),
  updatedAt: v.number(),
})
```

### 1.2 Token Multiplier Configuration

**Core Pricing Model:** Users are charged based on **actual token consumption** with a configurable markup multiplier.

**File:** `src/lib/ai/pricing.ts`

```typescript
/**
 * CONFIGURABLE MARKUP MULTIPLIER
 *
 * This multiplier is applied to actual token consumption from the AI SDK.
 * Examples:
 *   - 1.0 = No markup (pass-through pricing, not sustainable)
 *   - 1.5 = 50% markup (recommended for profitability)
 *   - 2.0 = 100% markup (double the actual cost)
 *   - 3.0 = 200% markup (triple the actual cost)
 *
 * How it works:
 *   - AI SDK reports: 1,000 input tokens + 500 output tokens = 1,500 total
 *   - With multiplier 1.5: User is charged 1,500 × 1.5 = 2,250 tokens
 *   - User's balance is deducted by 2,250 tokens
 */
export const TOKEN_MARKUP_MULTIPLIER = 1.5;

/**
 * Model pricing data (for cost analytics only)
 * This is used to calculate actual costs for reporting/analytics,
 * but does NOT affect user billing directly.
 */
export interface ModelPricing {
  provider: "openai" | "anthropic" | "google";
  model: string;
  inputPricePer1kTokens: number; // in USD
  outputPricePer1kTokens: number; // in USD
  imagePricePerGeneration?: number; // for image models
}

export const MODEL_PRICING: Record<string, ModelPricing> = {
  // OpenAI Text Models
  "gpt-4o": {
    provider: "openai",
    model: "gpt-4o",
    inputPricePer1kTokens: 0.0025,
    outputPricePer1kTokens: 0.01,
  },
  "gpt-4o-mini": {
    provider: "openai",
    model: "gpt-4o-mini",
    inputPricePer1kTokens: 0.00015,
    outputPricePer1kTokens: 0.0006,
  },
  "gpt-4-turbo": {
    provider: "openai",
    model: "gpt-4-turbo",
    inputPricePer1kTokens: 0.01,
    outputPricePer1kTokens: 0.03,
  },
  "gpt-3.5-turbo": {
    provider: "openai",
    model: "gpt-3.5-turbo",
    inputPricePer1kTokens: 0.0005,
    outputPricePer1kTokens: 0.0015,
  },

  // Anthropic Models
  "claude-3-5-sonnet": {
    provider: "anthropic",
    model: "claude-3-5-sonnet",
    inputPricePer1kTokens: 0.003,
    outputPricePer1kTokens: 0.015,
  },
  "claude-3-5-haiku": {
    provider: "anthropic",
    model: "claude-3-5-haiku",
    inputPricePer1kTokens: 0.0008,
    outputPricePer1kTokens: 0.004,
  },
  "claude-3-opus": {
    provider: "anthropic",
    model: "claude-3-opus",
    inputPricePer1kTokens: 0.015,
    outputPricePer1kTokens: 0.075,
  },

  // Image Generation Models
  "dall-e-3": {
    provider: "openai",
    model: "dall-e-3",
    inputPricePer1kTokens: 0,
    outputPricePer1kTokens: 0,
    imagePricePerGeneration: 0.04, // $0.04 per 1024x1024 image
  },
  "google-nano-banana": {
    provider: "google",
    model: "nano-banana-pro-preview",
    inputPricePer1kTokens: 0,
    outputPricePer1kTokens: 0,
    imagePricePerGeneration: 0.03, // Estimated
  },
};

/**
 * Calculate billable tokens from actual token usage
 * This is the PRIMARY billing function - it applies the markup multiplier
 */
export function calculateBillableTokens(
  inputTokens: number,
  outputTokens: number,
  multiplier: number = TOKEN_MARKUP_MULTIPLIER
): number {
  const actualTokens = inputTokens + outputTokens;
  return Math.ceil(actualTokens * multiplier);
}

/**
 * Calculate actual cost in cents (for analytics only)
 * This shows what we're actually paying to AI providers
 */
export function calculateActualCost(
  model: string,
  inputTokens: number,
  outputTokens: number,
  isImageGeneration = false
): number {
  const pricing = MODEL_PRICING[model];

  if (!pricing) {
    console.error(`No pricing found for model: ${model}`);
    return 0;
  }

  if (isImageGeneration && pricing.imagePricePerGeneration) {
    return Math.round(pricing.imagePricePerGeneration * 100);
  }

  const inputCostCents = Math.round(
    (inputTokens / 1000) * pricing.inputPricePer1kTokens * 100
  );
  const outputCostCents = Math.round(
    (outputTokens / 1000) * pricing.outputPricePer1kTokens * 100
  );

  return inputCostCents + outputCostCents;
}

/**
 * For image generation: convert image count to equivalent "tokens"
 * This allows treating images consistently with text generation
 */
export function imageGenerationToTokens(
  imageCount: number = 1,
  pricePerImage: number = 0.04, // DALL-E 3 default
  multiplier: number = TOKEN_MARKUP_MULTIPLIER
): number {
  // Convert image cost to cents, then to "tokens" (1 token = 1 actual token consumed)
  // For images, we use a fixed conversion: $0.04 = 4000 "equivalent tokens"
  const equivalentTokens = (pricePerImage * 100 * 1000); // $0.04 → 4000 tokens
  return Math.ceil(equivalentTokens * multiplier * imageCount);
}
```

### 1.3 Token Tracking Implementation

Update all generation functions in `src/server/ai.ts` to persist token usage.

**Key Changes:**

1. **Create Convex function for token tracking:**

**File:** `convex/tokenUsage.ts`

```typescript
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { api } from "./_generated/api";

/**
 * Record token usage for billing
 * Uses actual token counts with configurable multiplier
 */
export const recordUsage = mutation({
  args: {
    userId: v.id("users"),
    workspaceId: v.id("workspaces"),
    projectId: v.optional(v.id("projects")),
    contentPieceId: v.optional(v.id("contentPieces")),
    operationType: v.union(
      v.literal("content_generation"),
      v.literal("content_refinement"),
      v.literal("content_repurpose"),
      v.literal("chat_response"),
      v.literal("image_generation"),
      v.literal("image_prompt_generation")
    ),
    provider: v.union(
      v.literal("openai"),
      v.literal("anthropic"),
      v.literal("google")
    ),
    model: v.string(),
    inputTokens: v.number(), // Actual tokens from AI SDK
    outputTokens: v.number(), // Actual tokens from AI SDK
    totalTokens: v.number(), // Actual tokens from AI SDK
    billableTokens: v.number(), // Tokens with multiplier applied
    actualCostCents: v.number(), // Actual cost to us (for analytics)
    multiplier: v.number(), // Multiplier used (for audit trail)
    requestMetadata: v.optional(v.string()),
    success: v.boolean(),
    errorMessage: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Insert usage record
    const usageId = await ctx.db.insert("tokenUsage", {
      ...args,
      createdAt: Date.now(),
    });

    // Deduct billable tokens from user's account
    if (args.success && args.billableTokens > 0) {
      await ctx.runMutation(api.tokenAccounts.deductTokens, {
        userId: args.userId,
        workspaceId: args.workspaceId,
        tokenUsageId: usageId,
        billableTokens: args.billableTokens,
        actualTokens: args.totalTokens,
      });
    }

    return usageId;
  },
});

/**
 * Get user's total usage statistics
 */
export const getUserUsageStats = query({
  args: {
    userId: v.id("users"),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let usageRecords = await ctx.db
      .query("tokenUsage")
      .withIndex("by_userId_createdAt", (q) =>
        q.eq("userId", args.userId)
      )
      .collect();

    // Filter by date range if provided
    if (args.startDate) {
      usageRecords = usageRecords.filter((r) => r.createdAt >= args.startDate!);
    }
    if (args.endDate) {
      usageRecords = usageRecords.filter((r) => r.createdAt <= args.endDate!);
    }

    const stats = {
      totalInputTokens: 0,
      totalOutputTokens: 0,
      totalTokens: 0,
      totalCostCents: 0,
      operationCounts: {} as Record<string, number>,
      modelCounts: {} as Record<string, number>,
    };

    for (const record of usageRecords) {
      stats.totalInputTokens += record.inputTokens;
      stats.totalOutputTokens += record.outputTokens;
      stats.totalTokens += record.totalTokens;
      stats.totalCostCents += record.totalCostCents;

      stats.operationCounts[record.operationType] =
        (stats.operationCounts[record.operationType] || 0) + 1;
      stats.modelCounts[record.model] =
        (stats.modelCounts[record.model] || 0) + 1;
    }

    return stats;
  },
});

/**
 * Get detailed usage history for a user
 */
export const getUserUsageHistory = query({
  args: {
    userId: v.id("users"),
    limit: v.optional(v.number()),
    cursor: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 50;

    let query = ctx.db
      .query("tokenUsage")
      .withIndex("by_userId_createdAt", (q) =>
        q.eq("userId", args.userId)
      )
      .order("desc");

    if (args.cursor) {
      query = query.filter((q) => q.lt(q.field("createdAt"), args.cursor!));
    }

    const records = await query.take(limit);

    return {
      records,
      hasMore: records.length === limit,
      nextCursor: records.length > 0 ? records[records.length - 1].createdAt : null,
    };
  },
});
```

2. **Update server function wrapper:**

In `src/server/ai.ts`, after each successful generation:

```typescript
// Example from generateDraft() function (line ~424)

import {
  calculateBillableTokens,
  calculateActualCost,
  TOKEN_MARKUP_MULTIPLIER
} from "@/lib/ai/pricing";

// After receiving usage from AI SDK:
const usage = result.usage;

// Calculate billable tokens (actual tokens × multiplier)
const billableTokens = calculateBillableTokens(
  usage.inputTokens,
  usage.outputTokens,
  TOKEN_MARKUP_MULTIPLIER
);

// Calculate actual cost for analytics
const actualCostCents = calculateActualCost(
  resolvedModel,
  usage.inputTokens,
  usage.outputTokens
);

// Persist to database
await convex.mutation(api.tokenUsage.recordUsage, {
  userId: user._id,
  workspaceId: workspace._id,
  projectId: projectId,
  contentPieceId: contentId,
  operationType: "content_generation",
  provider: resolvedProvider,
  model: resolvedModel,
  inputTokens: usage.inputTokens, // Actual from AI SDK
  outputTokens: usage.outputTokens, // Actual from AI SDK
  totalTokens: usage.totalTokens, // Actual from AI SDK
  billableTokens, // With multiplier applied
  actualCostCents, // For analytics
  multiplier: TOKEN_MARKUP_MULTIPLIER, // Audit trail
  requestMetadata: JSON.stringify({
    categoryId,
    personaId,
    brandVoiceId,
    promptLength: context.length,
  }),
  success: true,
  errorMessage: undefined,
});
```

**Apply this pattern to all 6 generation endpoints:**
- `generateDraft()` (line 424)
- `refineContent()` (line 772)
- `refineSelection()` (line 936)
- `repurposeContent()` (line 1320)
- `generateChatResponse()` (similar pattern)
- `generateImagePrompt()` (similar pattern)
- `generateImage()` (in image-generation strategies)

### 1.4 Pre-Generation Balance Check

Add middleware to check token balance before expensive operations.

**File:** `convex/tokenAccounts.ts`

```typescript
/**
 * Check if user has sufficient balance for estimated token usage
 * Returns { allowed: boolean, balance: number, estimatedTokens: number }
 */
export const checkBalance = query({
  args: {
    userId: v.id("users"),
    estimatedBillableTokens: v.number(), // Estimated tokens with multiplier
  },
  handler: async (ctx, args) => {
    const account = await ctx.db
      .query("tokenAccounts")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .first();

    if (!account) {
      return {
        allowed: false,
        balance: 0,
        estimatedTokens: args.estimatedBillableTokens,
        message: "Token account not found",
      };
    }

    return {
      allowed: account.balance >= args.estimatedBillableTokens && account.status === "active",
      balance: account.balance,
      estimatedTokens: args.estimatedBillableTokens,
      status: account.status,
      message:
        account.status !== "active"
          ? `Account is ${account.status}`
          : account.balance < args.estimatedBillableTokens
          ? "Insufficient tokens"
          : "OK",
    };
  },
});
```

Call this before each generation in `src/server/ai.ts`:

```typescript
// Before calling streamText() or generateText():
import { calculateBillableTokens, TOKEN_MARKUP_MULTIPLIER } from "@/lib/ai/pricing";

// Estimate billable tokens (rough estimate × multiplier)
const estimatedActualTokens = estimatedPromptTokens + estimatedOutputTokens;
const estimatedBillableTokens = calculateBillableTokens(
  estimatedPromptTokens,
  estimatedOutputTokens,
  TOKEN_MARKUP_MULTIPLIER
);

const balanceCheck = await convex.query(api.tokenAccounts.checkBalance, {
  userId: user._id,
  estimatedBillableTokens,
});

if (!balanceCheck.allowed) {
  throw new Error(
    `Insufficient tokens. This generation will cost approximately ${estimatedBillableTokens} tokens, but you have ${balanceCheck.balance} tokens. ${balanceCheck.message}`
  );
}
```

---

## 2. Token Account Management

### 2.1 Account Initialization

Create token account when user signs up or first uses AI features.

**File:** `convex/tokenAccounts.ts`

```typescript
/**
 * Initialize token account for new user with welcome bonus
 */
export const initializeAccount = mutation({
  args: {
    userId: v.id("users"),
    workspaceId: v.id("workspaces"),
    welcomeBonusTokens: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Check if account already exists
    const existing = await ctx.db
      .query("tokenAccounts")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .first();

    if (existing) {
      return existing._id;
    }

    const welcomeBonus = args.welcomeBonusTokens ?? 10000; // Default: 10,000 tokens (~$10)

    // Create account
    const accountId = await ctx.db.insert("tokenAccounts", {
      userId: args.userId,
      workspaceId: args.workspaceId,
      balance: welcomeBonus,
      lifetimeTokensPurchased: welcomeBonus,
      lifetimeTokensUsed: 0,
      lifetimeSpentCents: 0,
      autoRechargeEnabled: false,
      status: "active",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Record welcome transaction
    await ctx.db.insert("tokenTransactions", {
      userId: args.userId,
      workspaceId: args.workspaceId,
      transactionType: "bonus",
      tokenAmount: welcomeBonus,
      balanceBefore: 0,
      balanceAfter: welcomeBonus,
      description: "Welcome bonus",
      createdAt: Date.now(),
    });

    // Mark user as having received onboarding tokens
    await ctx.db.patch(args.userId, {
      onboardingTokensGranted: true,
    });

    return accountId;
  },
});

/**
 * Deduct tokens from account (called after generation)
 * Uses billable tokens (actual tokens × multiplier)
 */
export const deductTokens = mutation({
  args: {
    userId: v.id("users"),
    workspaceId: v.id("workspaces"),
    tokenUsageId: v.id("tokenUsage"),
    billableTokens: v.number(), // Tokens with multiplier applied
    actualTokens: v.number(), // Actual tokens from AI SDK (for tracking)
  },
  handler: async (ctx, args) => {
    const account = await ctx.db
      .query("tokenAccounts")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .first();

    if (!account) {
      throw new Error("Token account not found");
    }

    const newBalance = account.balance - args.billableTokens;
    const newStatus = newBalance < 0 ? "suspended" : account.status;

    // Update account
    await ctx.db.patch(account._id, {
      balance: newBalance,
      lifetimeTokensUsed: account.lifetimeTokensUsed + args.billableTokens,
      lifetimeActualTokensUsed: account.lifetimeActualTokensUsed + args.actualTokens,
      status: newStatus,
      updatedAt: Date.now(),
    });

    // Record transaction
    await ctx.db.insert("tokenTransactions", {
      userId: args.userId,
      workspaceId: args.workspaceId,
      transactionType: "usage",
      tokenAmount: -args.billableTokens,
      balanceBefore: account.balance,
      balanceAfter: newBalance,
      tokenUsageId: args.tokenUsageId,
      description: "AI generation usage",
      createdAt: Date.now(),
    });

    // Check for auto-recharge trigger
    if (
      account.autoRechargeEnabled &&
      account.autoRechargeThreshold &&
      newBalance <= account.autoRechargeThreshold &&
      account.autoRechargeAmount
    ) {
      // Trigger auto-recharge (implementation in Stripe section)
      await ctx.scheduler.runAfter(0, api.stripe.triggerAutoRecharge, {
        userId: args.userId,
        accountId: account._id,
      });
    }

    return newBalance;
  },
});

/**
 * Add tokens to account (after purchase or admin grant)
 */
export const addTokens = mutation({
  args: {
    userId: v.id("users"),
    workspaceId: v.id("workspaces"),
    tokenAmount: v.number(),
    amountCents: v.optional(v.number()),
    transactionType: v.union(
      v.literal("purchase"),
      v.literal("admin_grant"),
      v.literal("refund"),
      v.literal("bonus")
    ),
    stripePaymentIntentId: v.optional(v.string()),
    stripeInvoiceId: v.optional(v.string()),
    adminUserId: v.optional(v.id("users")),
    description: v.string(),
  },
  handler: async (ctx, args) => {
    const account = await ctx.db
      .query("tokenAccounts")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .first();

    if (!account) {
      throw new Error("Token account not found");
    }

    const newBalance = account.balance + args.tokenAmount;
    const newStatus = newBalance >= 0 ? "active" : account.status;

    // Update account
    await ctx.db.patch(account._id, {
      balance: newBalance,
      lifetimeTokensPurchased:
        args.transactionType === "purchase"
          ? account.lifetimeTokensPurchased + args.tokenAmount
          : account.lifetimeTokensPurchased,
      lifetimeSpentCents:
        args.transactionType === "purchase" && args.amountCents
          ? account.lifetimeSpentCents + args.amountCents
          : account.lifetimeSpentCents,
      status: newStatus,
      lastPurchaseAt: args.transactionType === "purchase" ? Date.now() : account.lastPurchaseAt,
      updatedAt: Date.now(),
    });

    // Record transaction
    await ctx.db.insert("tokenTransactions", {
      userId: args.userId,
      workspaceId: args.workspaceId,
      transactionType: args.transactionType,
      tokenAmount: args.tokenAmount,
      balanceBefore: account.balance,
      balanceAfter: newBalance,
      amountCents: args.amountCents,
      stripePaymentIntentId: args.stripePaymentIntentId,
      stripeInvoiceId: args.stripeInvoiceId,
      adminUserId: args.adminUserId,
      description: args.description,
      createdAt: Date.now(),
    });

    return newBalance;
  },
});

/**
 * Get user's token account
 */
export const getAccount = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("tokenAccounts")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .first();
  },
});

/**
 * Get transaction history
 */
export const getTransactions = query({
  args: {
    userId: v.id("users"),
    limit: v.optional(v.number()),
    transactionType: v.optional(
      v.union(
        v.literal("purchase"),
        v.literal("usage"),
        v.literal("admin_grant"),
        v.literal("admin_deduction"),
        v.literal("refund"),
        v.literal("bonus")
      )
    ),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 50;

    let query = ctx.db
      .query("tokenTransactions")
      .withIndex("by_userId_createdAt", (q) => q.eq("userId", args.userId))
      .order("desc");

    const records = await query.take(limit);

    // Filter by type if specified
    if (args.transactionType) {
      return records.filter((r) => r.transactionType === args.transactionType);
    }

    return records;
  },
});

/**
 * Update auto-recharge settings
 */
export const updateAutoRecharge = mutation({
  args: {
    userId: v.id("users"),
    enabled: v.boolean(),
    threshold: v.optional(v.number()),
    amount: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const account = await ctx.db
      .query("tokenAccounts")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .first();

    if (!account) {
      throw new Error("Token account not found");
    }

    await ctx.db.patch(account._id, {
      autoRechargeEnabled: args.enabled,
      autoRechargeThreshold: args.threshold,
      autoRechargeAmount: args.amount,
      updatedAt: Date.now(),
    });

    return true;
  },
});
```

### 2.2 Account Hooks

Automatically initialize token account when user completes onboarding or first generates content.

**Option 1:** Hook into user sync in `convex/users.ts`:

```typescript
// In syncUser mutation:
export const syncUser = mutation({
  args: { /* existing args */ },
  handler: async (ctx, args) => {
    // ... existing user sync logic ...

    // Initialize token account if not exists
    if (!user.onboardingTokensGranted) {
      const workspace = await ctx.db
        .query("workspaces")
        .withIndex("by_userId", (q) => q.eq("userId", userId))
        .first();

      if (workspace) {
        await ctx.runMutation(api.tokenAccounts.initializeAccount, {
          userId: userId,
          workspaceId: workspace._id,
        });
      }
    }

    return userId;
  },
});
```

**Option 2:** Check in generation functions (lazy initialization):

```typescript
// In src/server/ai.ts, before first generation:
const account = await convex.query(api.tokenAccounts.getAccount, { userId: user._id });
if (!account) {
  await convex.mutation(api.tokenAccounts.initializeAccount, {
    userId: user._id,
    workspaceId: workspace._id,
  });
}
```

---

## 3. Stripe Integration for Token Purchases

### 3.1 Setup Requirements

**Environment Variables:**

Add to `wrangler.jsonc` vars:
```json
"vars": {
  "STRIPE_WEBHOOK_SECRET": "whsec_...",
  "VITE_STRIPE_PUBLISHABLE_KEY": "pk_live_..." // or pk_test_
}
```

Add as secrets:
```bash
wrangler secret put STRIPE_SECRET_KEY
# Value: sk_live_... or sk_test_...
```

**Dependencies:**

```bash
bun add stripe @stripe/stripe-js
```

### 3.2 Stripe Configuration

**File:** `src/lib/stripe.ts`

```typescript
import Stripe from "stripe";
import { env } from "cloudflare:workers";

/**
 * Initialize Stripe client (server-side only)
 */
export function getStripeClient(): Stripe {
  const apiKey = env.STRIPE_SECRET_KEY;
  if (!apiKey) {
    throw new Error("STRIPE_SECRET_KEY is not configured");
  }

  return new Stripe(apiKey, {
    apiVersion: "2024-11-20.acacia", // Use latest API version
    httpClient: Stripe.createFetchHttpClient(), // Use fetch for Workers compatibility
  });
}

/**
 * Get Stripe publishable key for client-side
 */
export function getStripePublishableKey(): string {
  const key = env.VITE_STRIPE_PUBLISHABLE_KEY;
  if (!key) {
    throw new Error("VITE_STRIPE_PUBLISHABLE_KEY is not configured");
  }
  return key;
}
```

### 3.3 Token Package Configuration in Stripe

**Manual Setup in Stripe Dashboard:**

1. Create Products in Stripe Dashboard:
   - Product Name: "Postmate Tokens - Starter"
   - Description: "10,000 tokens for AI content generation"
   - Create Price: $10.00 USD (one-time payment)
   - Copy Price ID: `price_xxxxxxxxxxxxx`

2. Repeat for all packages:
   - **Starter:** 10,000 tokens = $10 (price_starter_xxx)
   - **Pro:** 50,000 tokens = $45 (10% discount, price_pro_xxx)
   - **Business:** 150,000 tokens = $120 (20% discount, price_business_xxx)
   - **Enterprise:** 500,000 tokens = $350 (30% discount, price_enterprise_xxx)

3. Seed pricing in Convex database:

**File:** `convex/seedTokenPricing.ts` (run once)

```typescript
import { internalMutation } from "./_generated/server";

export const seedPricing = internalMutation({
  handler: async (ctx) => {
    const packages = [
      {
        packageName: "Starter",
        tokenAmount: 10000,
        priceCents: 1000, // $10.00
        description: "Perfect for getting started",
        isPopular: false,
        sortOrder: 1,
        stripePriceId: "price_starter_xxx", // Replace with actual Stripe Price ID
        active: true,
      },
      {
        packageName: "Pro",
        tokenAmount: 50000,
        priceCents: 4500, // $45.00 (10% discount)
        description: "Great for regular content creators",
        isPopular: true,
        sortOrder: 2,
        stripePriceId: "price_pro_xxx",
        active: true,
      },
      {
        packageName: "Business",
        tokenAmount: 150000,
        priceCents: 12000, // $120.00 (20% discount)
        description: "Ideal for teams and agencies",
        isPopular: false,
        sortOrder: 3,
        stripePriceId: "price_business_xxx",
        active: true,
      },
      {
        packageName: "Enterprise",
        tokenAmount: 500000,
        priceCents: 35000, // $350.00 (30% discount)
        description: "Maximum value for power users",
        isPopular: false,
        sortOrder: 4,
        stripePriceId: "price_enterprise_xxx",
        active: true,
      },
    ];

    for (const pkg of packages) {
      await ctx.db.insert("tokenPricing", {
        ...pkg,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    }

    return { success: true, count: packages.length };
  },
});
```

### 3.4 Checkout Flow

**File:** `convex/stripe.ts`

```typescript
import { v } from "convex/values";
import { mutation, query, action } from "./_generated/server";
import { api, internal } from "./_generated/api";

/**
 * Create Stripe Checkout Session for token purchase
 */
export const createCheckoutSession = action({
  args: {
    userId: v.id("users"),
    packageId: v.id("tokenPricing"),
    successUrl: v.string(),
    cancelUrl: v.string(),
  },
  handler: async (ctx, args) => {
    // Get user and account
    const user = await ctx.runQuery(api.users.getById, { id: args.userId });
    if (!user) throw new Error("User not found");

    const account = await ctx.runQuery(api.tokenAccounts.getAccount, {
      userId: args.userId,
    });
    if (!account) throw new Error("Token account not found");

    // Get pricing package
    const pkg = await ctx.runQuery(internal.tokenPricing.getById, {
      id: args.packageId,
    });
    if (!pkg || !pkg.active) throw new Error("Invalid package");

    // Initialize Stripe
    const stripe = getStripeClient();

    // Create or retrieve Stripe customer
    let customerId = account.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.billingEmail || user.email,
        name: user.name,
        metadata: {
          userId: user._id,
          workspaceId: account.workspaceId,
        },
      });
      customerId = customer.id;

      // Save customer ID
      await ctx.runMutation(api.tokenAccounts.updateStripeCustomer, {
        userId: args.userId,
        stripeCustomerId: customerId,
      });
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "payment",
      line_items: [
        {
          price: pkg.stripePriceId,
          quantity: 1,
        },
      ],
      success_url: args.successUrl,
      cancel_url: args.cancelUrl,
      metadata: {
        userId: args.userId,
        workspaceId: account.workspaceId,
        packageId: args.packageId,
        tokenAmount: pkg.tokenAmount.toString(),
        priceCents: pkg.priceCents.toString(),
      },
      payment_intent_data: {
        metadata: {
          userId: args.userId,
          tokenAmount: pkg.tokenAmount.toString(),
        },
      },
    });

    return {
      sessionId: session.id,
      url: session.url,
    };
  },
});

/**
 * Trigger auto-recharge (scheduled action)
 */
export const triggerAutoRecharge = action({
  args: {
    userId: v.id("users"),
    accountId: v.id("tokenAccounts"),
  },
  handler: async (ctx, args) => {
    const account = await ctx.runQuery(api.tokenAccounts.getAccount, {
      userId: args.userId,
    });

    if (
      !account ||
      !account.autoRechargeEnabled ||
      !account.autoRechargeAmount ||
      !account.stripeCustomerId ||
      !account.defaultPaymentMethodId
    ) {
      return { success: false, reason: "Auto-recharge not configured" };
    }

    // Find matching package
    const packages = await ctx.runQuery(api.tokenPricing.listActive);
    const pkg = packages.find((p) => p.tokenAmount === account.autoRechargeAmount);

    if (!pkg) {
      return { success: false, reason: "No matching package" };
    }

    // Create payment intent
    const stripe = getStripeClient();
    const paymentIntent = await stripe.paymentIntents.create({
      amount: pkg.priceCents,
      currency: "usd",
      customer: account.stripeCustomerId,
      payment_method: account.defaultPaymentMethodId,
      off_session: true,
      confirm: true,
      metadata: {
        userId: args.userId,
        workspaceId: account.workspaceId,
        tokenAmount: pkg.tokenAmount.toString(),
        autoRecharge: "true",
      },
    });

    if (paymentIntent.status === "succeeded") {
      // Add tokens to account
      await ctx.runMutation(api.tokenAccounts.addTokens, {
        userId: args.userId,
        workspaceId: account.workspaceId,
        tokenAmount: pkg.tokenAmount,
        amountCents: pkg.priceCents,
        transactionType: "purchase",
        stripePaymentIntentId: paymentIntent.id,
        description: `Auto-recharge: ${pkg.packageName}`,
      });

      return { success: true, paymentIntentId: paymentIntent.id };
    }

    return { success: false, reason: `Payment failed: ${paymentIntent.status}` };
  },
});
```

**File:** `convex/tokenPricing.ts`

```typescript
import { v } from "convex/values";
import { query, internalQuery } from "./_generated/server";

/**
 * List all active pricing packages
 */
export const listActive = query({
  handler: async (ctx) => {
    return await ctx.db
      .query("tokenPricing")
      .withIndex("by_active", (q) => q.eq("active", true))
      .order("asc")
      .collect();
  },
});

/**
 * Get package by ID (internal only)
 */
export const getById = internalQuery({
  args: { id: v.id("tokenPricing") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});
```

### 3.5 Webhook Handler

**File:** `workers/stripe-webhook.ts`

```typescript
import type { Hono } from "hono";
import Stripe from "stripe";
import { env } from "cloudflare:workers";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/api";

/**
 * Register Stripe webhook route in Hono app
 */
export function registerStripeWebhook(app: Hono) {
  app.post("/api/webhooks/stripe", async (c) => {
    const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
      apiVersion: "2024-11-20.acacia",
      httpClient: Stripe.createFetchHttpClient(),
    });

    const signature = c.req.header("stripe-signature");
    if (!signature) {
      return c.json({ error: "No signature" }, 400);
    }

    const body = await c.req.text();

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(
        body,
        signature,
        env.STRIPE_WEBHOOK_SECRET
      );
    } catch (err) {
      console.error("Webhook signature verification failed:", err);
      return c.json({ error: "Invalid signature" }, 400);
    }

    // Initialize Convex client
    const convex = new ConvexHttpClient(env.VITE_CONVEX_URL);

    // Handle events
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;

        if (session.payment_status === "paid") {
          const metadata = session.metadata;
          if (!metadata?.userId || !metadata?.tokenAmount) {
            console.error("Missing metadata in checkout session");
            break;
          }

          // Add tokens to user account
          await convex.mutation(api.tokenAccounts.addTokens, {
            userId: metadata.userId as any,
            workspaceId: metadata.workspaceId as any,
            tokenAmount: Number.parseInt(metadata.tokenAmount),
            amountCents: Number.parseInt(metadata.priceCents),
            transactionType: "purchase",
            stripePaymentIntentId: session.payment_intent as string,
            description: `Token purchase: ${metadata.packageId}`,
          });
        }
        break;
      }

      case "payment_intent.succeeded": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        const metadata = paymentIntent.metadata;

        // Check if this is an auto-recharge (already handled in triggerAutoRecharge)
        if (metadata?.autoRecharge === "true") {
          console.log("Auto-recharge payment succeeded:", paymentIntent.id);
        }
        break;
      }

      case "customer.subscription.deleted":
      case "invoice.payment_failed": {
        // Handle subscription cancellation or payment failure
        // (Future: if implementing subscription-based pricing)
        console.log("Subscription/payment event:", event.type);
        break;
      }

      default:
        console.log("Unhandled event type:", event.type);
    }

    return c.json({ received: true });
  });
}
```

**Update `workers/app.ts` to register webhook:**

```typescript
import { registerStripeWebhook } from "./stripe-webhook";

// After Clerk middleware, before TanStack Start handler:
registerStripeWebhook(app);
```

**Configure webhook in Stripe Dashboard:**

1. Go to Stripe Dashboard → Developers → Webhooks
2. Add endpoint: `https://your-domain.com/api/webhooks/stripe`
3. Select events to listen for:
   - `checkout.session.completed`
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `customer.subscription.deleted` (if using subscriptions)
4. Copy webhook signing secret → add to `wrangler.jsonc` vars

---

## 4. User-Facing UI Components

### 4.1 Token Balance Display (Header)

**File:** `src/components/TokenBalance.tsx`

```tsx
import { useQuery } from "convex/react";
import { api } from "@/convex/api";
import { useAuth } from "@/contexts/auth-context";
import { Link } from "@tanstack/react-router";
import { Coins } from "lucide-react";

export function TokenBalance() {
  const { user } = useAuth();
  const account = useQuery(
    api.tokenAccounts.getAccount,
    user?._id ? { userId: user._id } : "skip"
  );

  if (!account) return null;

  const isLowBalance = account.balance < 1000; // Warn at <1000 tokens

  return (
    <Link
      to="/settings/tokens"
      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-colors ${
        isLowBalance
          ? "border-orange-500/20 bg-orange-500/10 text-orange-600 hover:bg-orange-500/20"
          : "border-border bg-card hover:bg-accent"
      }`}
    >
      <Coins className="w-4 h-4" />
      <span className="font-mono text-sm">
        {account.balance.toLocaleString()}
      </span>
      {isLowBalance && (
        <span className="text-xs font-medium">Low Balance</span>
      )}
    </Link>
  );
}
```

**Update `src/components/Header.tsx`:**

```tsx
import { TokenBalance } from "./TokenBalance";

// In header component, after user menu:
<TokenBalance />
```

### 4.2 Token Purchase Page

**File:** `src/routes/_authed/settings/tokens.tsx`

```tsx
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/api";
import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, Coins, TrendingUp, Zap } from "lucide-react";
import { loadStripe } from "@stripe/stripe-js";

export const Route = createFileRoute("/_authed/settings/tokens")({
  component: TokensPage,
});

function TokensPage() {
  const { user } = useAuth();
  const account = useQuery(
    api.tokenAccounts.getAccount,
    user?._id ? { userId: user._id } : "skip"
  );
  const packages = useQuery(api.tokenPricing.listActive);
  const createCheckout = useMutation(api.stripe.createCheckoutSession);

  const handlePurchase = async (packageId: string) => {
    if (!user) return;

    try {
      const result = await createCheckout({
        userId: user._id,
        packageId,
        successUrl: `${window.location.origin}/settings/tokens?success=true`,
        cancelUrl: `${window.location.origin}/settings/tokens?canceled=true`,
      });

      // Redirect to Stripe Checkout
      if (result.url) {
        window.location.href = result.url;
      }
    } catch (error) {
      console.error("Failed to create checkout session:", error);
      alert("Failed to start checkout. Please try again.");
    }
  };

  return (
    <div className="container max-w-6xl py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Token Balance</h1>
        <p className="text-muted-foreground mt-2">
          Purchase tokens to generate AI content and images
        </p>
      </div>

      {/* Current Balance Card */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Coins className="w-5 h-5" />
            Current Balance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-4xl font-bold font-mono">
            {account?.balance.toLocaleString() ?? "—"}
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            Approximately ${((account?.balance ?? 0) * 0.001).toFixed(2)} USD value
          </p>
        </CardContent>
      </Card>

      {/* Pricing Packages */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
        {packages?.map((pkg) => (
          <Card
            key={pkg._id}
            className={`relative ${
              pkg.isPopular ? "border-primary shadow-lg" : ""
            }`}
          >
            {pkg.isPopular && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-3 py-1 rounded-full text-xs font-semibold">
                Most Popular
              </div>
            )}
            <CardHeader>
              <CardTitle>{pkg.packageName}</CardTitle>
              <CardDescription>{pkg.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="text-3xl font-bold">
                  ${(pkg.priceCents / 100).toFixed(0)}
                </div>
                <div className="text-sm text-muted-foreground">
                  {pkg.tokenAmount.toLocaleString()} tokens
                </div>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-600" />
                  <span>${(pkg.priceCents / pkg.tokenAmount / 100).toFixed(4)} per token</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-600" />
                  <span>One-time payment</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-600" />
                  <span>Never expires</span>
                </div>
              </div>

              <Button
                className="w-full"
                variant={pkg.isPopular ? "default" : "outline"}
                onClick={() => handlePurchase(pkg._id)}
              >
                Purchase
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Usage Stats Preview */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Usage Overview</CardTitle>
          <CardDescription>
            View detailed usage history in the Billing tab
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <TrendingUp className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">
                  {account?.lifetimeTokensUsed.toLocaleString() ?? "—"}
                </div>
                <div className="text-sm text-muted-foreground">Tokens Used</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/10 rounded-lg">
                <Coins className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">
                  {account?.lifetimeTokensPurchased.toLocaleString() ?? "—"}
                </div>
                <div className="text-sm text-muted-foreground">Tokens Purchased</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-500/10 rounded-lg">
                <Zap className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">
                  ${((account?.lifetimeSpentCents ?? 0) / 100).toFixed(2)}
                </div>
                <div className="text-sm text-muted-foreground">Total Spent</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
```

### 4.3 Usage History Page

**File:** `src/routes/_authed/settings/billing.tsx`

```tsx
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { api } from "@/convex/api";
import { useAuth } from "@/contexts/auth-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";

export const Route = createFileRoute("/_authed/settings/billing")({
  component: BillingPage,
});

function BillingPage() {
  const { user } = useAuth();
  const transactions = useQuery(
    api.tokenAccounts.getTransactions,
    user?._id ? { userId: user._id, limit: 100 } : "skip"
  );

  return (
    <div className="container max-w-4xl py-8">
      <h1 className="text-3xl font-bold mb-8">Billing History</h1>

      <Card>
        <CardHeader>
          <CardTitle>Transaction History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {transactions?.map((txn) => (
              <div
                key={txn._id}
                className="flex items-center justify-between py-3 border-b last:border-0"
              >
                <div>
                  <div className="font-medium">{txn.description}</div>
                  <div className="text-sm text-muted-foreground">
                    {format(new Date(txn.createdAt), "MMM d, yyyy h:mm a")}
                  </div>
                </div>
                <div className="text-right">
                  <div
                    className={`font-mono font-semibold ${
                      txn.tokenAmount > 0 ? "text-green-600" : "text-red-600"
                    }`}
                  >
                    {txn.tokenAmount > 0 ? "+" : ""}
                    {txn.tokenAmount.toLocaleString()}
                  </div>
                  {txn.amountCents && (
                    <div className="text-sm text-muted-foreground">
                      ${(txn.amountCents / 100).toFixed(2)}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {transactions?.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No transactions yet
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
```

### 4.4 Low Balance Warning

**File:** `src/components/LowBalanceAlert.tsx`

```tsx
import { useQuery } from "convex/react";
import { api } from "@/convex/api";
import { useAuth } from "@/contexts/auth-context";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";
import { Link } from "@tanstack/react-router";

export function LowBalanceAlert() {
  const { user } = useAuth();
  const account = useQuery(
    api.tokenAccounts.getAccount,
    user?._id ? { userId: user._id } : "skip"
  );

  const LOW_THRESHOLD = 1000;
  const CRITICAL_THRESHOLD = 100;

  if (!account || account.balance >= LOW_THRESHOLD) return null;

  const isCritical = account.balance < CRITICAL_THRESHOLD;

  return (
    <Alert variant={isCritical ? "destructive" : "default"} className="mb-6">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>
        {isCritical ? "Critical: " : ""}Low Token Balance
      </AlertTitle>
      <AlertDescription className="flex items-center justify-between">
        <span>
          You have {account.balance.toLocaleString()} tokens remaining.
          {isCritical && " You may not be able to generate content."}
        </span>
        <Button asChild size="sm" variant={isCritical ? "default" : "outline"}>
          <Link to="/settings/tokens">Purchase Tokens</Link>
        </Button>
      </AlertDescription>
    </Alert>
  );
}
```

**Add to content editor page:**

```tsx
// In src/routes/_authed/projects.$projectId/content.$contentId.tsx
import { LowBalanceAlert } from "@/components/LowBalanceAlert";

// At top of page content:
<LowBalanceAlert />
```

### 4.5 Auto-Recharge Settings

**File:** `src/routes/_authed/settings/auto-recharge.tsx`

```tsx
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/api";
import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { useState } from "react";

export const Route = createFileRoute("/_authed/settings/auto-recharge")({
  component: AutoRechargePage,
});

function AutoRechargePage() {
  const { user } = useAuth();
  const account = useQuery(
    api.tokenAccounts.getAccount,
    user?._id ? { userId: user._id } : "skip"
  );
  const updateSettings = useMutation(api.tokenAccounts.updateAutoRecharge);

  const [enabled, setEnabled] = useState(account?.autoRechargeEnabled ?? false);
  const [threshold, setThreshold] = useState(account?.autoRechargeThreshold ?? 1000);
  const [amount, setAmount] = useState(account?.autoRechargeAmount ?? 10000);

  const handleSave = async () => {
    if (!user) return;

    try {
      await updateSettings({
        userId: user._id,
        enabled,
        threshold: enabled ? threshold : undefined,
        amount: enabled ? amount : undefined,
      });
      alert("Auto-recharge settings saved!");
    } catch (error) {
      console.error("Failed to save settings:", error);
      alert("Failed to save settings. Please try again.");
    }
  };

  return (
    <div className="container max-w-2xl py-8">
      <h1 className="text-3xl font-bold mb-8">Auto-Recharge Settings</h1>

      <Card>
        <CardHeader>
          <CardTitle>Automatic Token Recharge</CardTitle>
          <CardDescription>
            Automatically purchase tokens when your balance falls below a threshold
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <Label htmlFor="auto-recharge">Enable Auto-Recharge</Label>
            <Switch
              id="auto-recharge"
              checked={enabled}
              onCheckedChange={setEnabled}
            />
          </div>

          {enabled && (
            <>
              <div>
                <Label htmlFor="threshold">Recharge When Balance Falls Below</Label>
                <Input
                  id="threshold"
                  type="number"
                  value={threshold}
                  onChange={(e) => setThreshold(Number.parseInt(e.target.value))}
                  className="mt-2"
                />
                <p className="text-sm text-muted-foreground mt-1">
                  Trigger auto-purchase when balance drops below this amount
                </p>
              </div>

              <div>
                <Label htmlFor="amount">Recharge Amount (tokens)</Label>
                <Input
                  id="amount"
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(Number.parseInt(e.target.value))}
                  className="mt-2"
                />
                <p className="text-sm text-muted-foreground mt-1">
                  Number of tokens to purchase automatically
                </p>
              </div>

              {!account?.defaultPaymentMethodId && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    You need to set up a default payment method before enabling auto-recharge.
                    Make a manual purchase first to save your payment method.
                  </AlertDescription>
                </Alert>
              )}
            </>
          )}

          <Button onClick={handleSave} className="w-full">
            Save Settings
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
```

---

## 5. Admin UI for Token Management

### 5.1 Permission Updates

**File:** `src/lib/permissions.ts`

Add new admin permissions:

```typescript
export const PERMISSIONS = {
  // Existing permissions...

  // Token management permissions
  "tokens.view_all": "View all token usage and accounts",
  "tokens.grant": "Grant tokens to users",
  "tokens.deduct": "Deduct tokens from users",
  "tokens.view_stats": "View token usage statistics",
  "tokens.manage_pricing": "Manage token pricing packages",
} as const;

// Update role permissions:
export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  user: [],

  admin: [
    "admin.access",
    "admin.view_stats",
    "users.view",
    "users.create",
    "users.edit",
    "tokens.view_all",
    "tokens.view_stats",
  ],

  superadmin: [
    ...(Object.keys(PERMISSIONS) as Permission[]),
  ],
};
```

### 5.2 Admin Token Overview Dashboard

**File:** `src/routes/_authed/admin/tokens.tsx`

```tsx
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { api } from "@/convex/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TrendingUp, Users, DollarSign, Activity } from "lucide-react";

export const Route = createFileRoute("/_authed/admin/tokens")({
  beforeLoad: ({ context }) => {
    // Check admin permission
    if (!context.user?.roles?.includes("admin")) {
      throw new Error("Unauthorized");
    }
  },
  component: AdminTokensPage,
});

function AdminTokensPage() {
  const stats = useQuery(api.admin.getTokenStats);

  return (
    <div className="container max-w-7xl py-8">
      <h1 className="text-3xl font-bold mb-8">Token Management</h1>

      {/* Overview Stats */}
      <div className="grid md:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Usage</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.totalTokensUsed.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">All-time tokens consumed</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${((stats?.totalRevenueCents ?? 0) / 100).toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">Lifetime token sales</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.activeAccounts.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">Users with active accounts</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Balance</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.averageBalance.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">Tokens per user</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="users">User Accounts</TabsTrigger>
          <TabsTrigger value="models">Model Usage</TabsTrigger>
          <TabsTrigger value="grant">Grant Tokens</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          {/* Implementation in next section */}
        </TabsContent>

        <TabsContent value="users">
          {/* User accounts table */}
        </TabsContent>

        <TabsContent value="models">
          {/* Model usage breakdown */}
        </TabsContent>

        <TabsContent value="grant">
          {/* Token grant form */}
        </TabsContent>
      </Tabs>
    </div>
  );
}
```

### 5.3 Admin Convex Queries

**File:** `convex/admin.ts`

```typescript
import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

/**
 * Get overall token usage statistics (admin only)
 */
export const getTokenStats = query({
  handler: async (ctx) => {
    // TODO: Add permission check in production

    const allAccounts = await ctx.db.query("tokenAccounts").collect();
    const allUsage = await ctx.db.query("tokenUsage").collect();
    const allTransactions = await ctx.db
      .query("tokenTransactions")
      .withIndex("by_transactionType", (q) => q.eq("transactionType", "purchase"))
      .collect();

    const totalTokensUsed = allUsage.reduce((sum, u) => sum + u.totalTokens, 0);
    const totalRevenueCents = allTransactions.reduce(
      (sum, t) => sum + (t.amountCents ?? 0),
      0
    );
    const activeAccounts = allAccounts.filter((a) => a.status === "active").length;
    const averageBalance =
      allAccounts.length > 0
        ? allAccounts.reduce((sum, a) => sum + a.balance, 0) / allAccounts.length
        : 0;

    return {
      totalTokensUsed,
      totalRevenueCents,
      activeAccounts,
      averageBalance: Math.round(averageBalance),
      totalAccounts: allAccounts.length,
    };
  },
});

/**
 * Get usage breakdown by model (admin only)
 */
export const getModelUsageStats = query({
  handler: async (ctx) => {
    const allUsage = await ctx.db.query("tokenUsage").collect();

    const modelStats: Record<
      string,
      { count: number; totalTokens: number; totalCostCents: number }
    > = {};

    for (const usage of allUsage) {
      if (!modelStats[usage.model]) {
        modelStats[usage.model] = { count: 0, totalTokens: 0, totalCostCents: 0 };
      }
      modelStats[usage.model].count++;
      modelStats[usage.model].totalTokens += usage.totalTokens;
      modelStats[usage.model].totalCostCents += usage.totalCostCents;
    }

    return Object.entries(modelStats)
      .map(([model, stats]) => ({ model, ...stats }))
      .sort((a, b) => b.totalCostCents - a.totalCostCents);
  },
});

/**
 * Get user token accounts (admin only, paginated)
 */
export const getUserAccounts = query({
  args: {
    limit: v.optional(v.number()),
    status: v.optional(v.union(
      v.literal("active"),
      v.literal("suspended"),
      v.literal("blocked")
    )),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 50;

    let query = ctx.db.query("tokenAccounts");

    if (args.status) {
      query = query.withIndex("by_status", (q) => q.eq("status", args.status!));
    }

    const accounts = await query.take(limit);

    // Enrich with user data
    const enriched = await Promise.all(
      accounts.map(async (account) => {
        const user = await ctx.db.get(account.userId);
        return { ...account, user };
      })
    );

    return enriched;
  },
});

/**
 * Get user's detailed usage (admin only)
 */
export const getUserDetailedUsage = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const usage = await ctx.db
      .query("tokenUsage")
      .withIndex("by_userId_createdAt", (q) => q.eq("userId", args.userId))
      .order("desc")
      .take(100);

    const transactions = await ctx.db
      .query("tokenTransactions")
      .withIndex("by_userId_createdAt", (q) => q.eq("userId", args.userId))
      .order("desc")
      .take(100);

    return { usage, transactions };
  },
});

/**
 * Admin grant tokens to user
 */
export const grantTokens = mutation({
  args: {
    adminUserId: v.id("users"),
    targetUserId: v.id("users"),
    tokenAmount: v.number(),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    // TODO: Add permission check in production

    const targetAccount = await ctx.db
      .query("tokenAccounts")
      .withIndex("by_userId", (q) => q.eq("userId", args.targetUserId))
      .first();

    if (!targetAccount) {
      throw new Error("Target user token account not found");
    }

    const newBalance = targetAccount.balance + args.tokenAmount;

    await ctx.db.patch(targetAccount._id, {
      balance: newBalance,
      updatedAt: Date.now(),
    });

    await ctx.db.insert("tokenTransactions", {
      userId: args.targetUserId,
      workspaceId: targetAccount.workspaceId,
      transactionType: "admin_grant",
      tokenAmount: args.tokenAmount,
      balanceBefore: targetAccount.balance,
      balanceAfter: newBalance,
      adminUserId: args.adminUserId,
      description: `Admin grant: ${args.reason}`,
      createdAt: Date.now(),
    });

    return { success: true, newBalance };
  },
});

/**
 * Admin deduct tokens from user
 */
export const deductTokens = mutation({
  args: {
    adminUserId: v.id("users"),
    targetUserId: v.id("users"),
    tokenAmount: v.number(),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    // TODO: Add permission check in production

    const targetAccount = await ctx.db
      .query("tokenAccounts")
      .withIndex("by_userId", (q) => q.eq("userId", args.targetUserId))
      .first();

    if (!targetAccount) {
      throw new Error("Target user token account not found");
    }

    const newBalance = targetAccount.balance - args.tokenAmount;

    await ctx.db.patch(targetAccount._id, {
      balance: newBalance,
      status: newBalance < 0 ? "suspended" : targetAccount.status,
      updatedAt: Date.now(),
    });

    await ctx.db.insert("tokenTransactions", {
      userId: args.targetUserId,
      workspaceId: targetAccount.workspaceId,
      transactionType: "admin_deduction",
      tokenAmount: -args.tokenAmount,
      balanceBefore: targetAccount.balance,
      balanceAfter: newBalance,
      adminUserId: args.adminUserId,
      description: `Admin deduction: ${args.reason}`,
      createdAt: Date.now(),
    });

    return { success: true, newBalance };
  },
});
```

### 5.4 Admin Grant Tokens Form

**Component in Admin Tokens Page (`TabsContent value="grant"`):**

```tsx
function GrantTokensForm() {
  const { user: adminUser } = useAuth();
  const [targetEmail, setTargetEmail] = useState("");
  const [tokenAmount, setTokenAmount] = useState(1000);
  const [reason, setReason] = useState("");
  const grantTokens = useMutation(api.admin.grantTokens);

  const handleGrant = async () => {
    if (!adminUser || !targetEmail || !reason) {
      alert("Please fill all fields");
      return;
    }

    try {
      // Find user by email
      const targetUser = await convex.query(api.users.getByEmail, {
        email: targetEmail,
      });

      if (!targetUser) {
        alert("User not found");
        return;
      }

      await grantTokens({
        adminUserId: adminUser._id,
        targetUserId: targetUser._id,
        tokenAmount,
        reason,
      });

      alert(`Successfully granted ${tokenAmount} tokens to ${targetEmail}`);
      setTargetEmail("");
      setTokenAmount(1000);
      setReason("");
    } catch (error) {
      console.error("Failed to grant tokens:", error);
      alert("Failed to grant tokens. Please try again.");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Grant Tokens to User</CardTitle>
        <CardDescription>
          Award tokens to a user (free of charge)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="email">User Email</Label>
          <Input
            id="email"
            type="email"
            value={targetEmail}
            onChange={(e) => setTargetEmail(e.target.value)}
            placeholder="user@example.com"
            className="mt-2"
          />
        </div>

        <div>
          <Label htmlFor="amount">Token Amount</Label>
          <Input
            id="amount"
            type="number"
            value={tokenAmount}
            onChange={(e) => setTokenAmount(Number.parseInt(e.target.value))}
            className="mt-2"
          />
        </div>

        <div>
          <Label htmlFor="reason">Reason</Label>
          <Input
            id="reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g., Customer support compensation"
            className="mt-2"
          />
        </div>

        <Button onClick={handleGrant} className="w-full">
          Grant Tokens
        </Button>
      </CardContent>
    </Card>
  );
}
```

---

## 6. Implementation Phases

### Phase 1: Foundation (Week 1)
**Goal:** Set up database schema and basic token tracking

- [ ] Update Convex schema with new tables (`tokenUsage`, `tokenAccounts`, `tokenTransactions`, `tokenPricing`)
- [ ] Deploy schema changes to Convex
- [ ] Create `src/lib/ai/pricing.ts` with model pricing configuration
- [ ] Update `calculateCost()` function
- [ ] Create `convex/tokenUsage.ts` with `recordUsage` mutation
- [ ] Create `convex/tokenAccounts.ts` with account management functions
- [ ] Test token account initialization

### Phase 2: Token Tracking Integration (Week 2)
**Goal:** Track all LLM usage in database

- [ ] Update `src/server/ai.ts`:
  - [ ] Add `recordUsage` call to `generateDraft()` (replace TODO at line 424)
  - [ ] Add `recordUsage` call to `refineContent()` (replace TODO at line 772)
  - [ ] Add `recordUsage` call to `refineSelection()` (replace TODO at line 936)
  - [ ] Add `recordUsage` call to `repurposeContent()` (replace TODO at line 1320)
  - [ ] Add `recordUsage` call to `generateChatResponse()`
  - [ ] Add `recordUsage` call to `generateImagePrompt()`
- [ ] Update image generation strategies:
  - [ ] Add token tracking to `src/server/image-generation/openai.ts`
  - [ ] Add token tracking to `src/server/image-generation/google.ts`
- [ ] Add pre-generation balance check to all generation functions
- [ ] Test end-to-end: generation → usage recorded → balance deducted

### Phase 3: Stripe Integration (Week 3)
**Goal:** Enable token purchases

- [ ] Install Stripe dependencies (`bun add stripe @stripe/stripe-js`)
- [ ] Create `src/lib/stripe.ts` with Stripe client initialization
- [ ] Configure Stripe products and prices in Stripe Dashboard
- [ ] Seed token pricing in Convex (`convex/seedTokenPricing.ts`)
- [ ] Create `convex/stripe.ts` with checkout session creation
- [ ] Create `convex/tokenPricing.ts` with pricing queries
- [ ] Create webhook handler in `workers/stripe-webhook.ts`
- [ ] Register webhook route in `workers/app.ts`
- [ ] Configure webhook in Stripe Dashboard
- [ ] Add Stripe environment variables to `wrangler.jsonc`
- [ ] Test checkout flow end-to-end: checkout → payment → webhook → tokens added

### Phase 4: User UI (Week 4)
**Goal:** Build user-facing token management interface

- [ ] Create `src/components/TokenBalance.tsx` (header widget)
- [ ] Update `src/components/Header.tsx` to include `<TokenBalance />`
- [ ] Create `src/routes/_authed/settings/tokens.tsx` (purchase page)
- [ ] Create `src/routes/_authed/settings/billing.tsx` (transaction history)
- [ ] Create `src/components/LowBalanceAlert.tsx`
- [ ] Add `<LowBalanceAlert />` to content editor page
- [ ] Create `src/routes/_authed/settings/auto-recharge.tsx`
- [ ] Test user flows:
  - [ ] View balance in header
  - [ ] Purchase tokens
  - [ ] View transaction history
  - [ ] Configure auto-recharge

### Phase 5: Admin UI (Week 5)
**Goal:** Build admin dashboard for token oversight

- [ ] Update `src/lib/permissions.ts` with token management permissions
- [ ] Create `convex/admin.ts` with admin queries/mutations:
  - [ ] `getTokenStats` (overview metrics)
  - [ ] `getModelUsageStats` (usage by model)
  - [ ] `getUserAccounts` (list user accounts)
  - [ ] `getUserDetailedUsage` (per-user deep dive)
  - [ ] `grantTokens` (admin grant)
  - [ ] `deductTokens` (admin deduction)
- [ ] Create `src/routes/_authed/admin/tokens.tsx` (main admin page)
- [ ] Build admin dashboard tabs:
  - [ ] Overview (stats cards)
  - [ ] User Accounts (table with balances)
  - [ ] Model Usage (breakdown chart)
  - [ ] Grant Tokens (form)
- [ ] Test admin flows:
  - [ ] View overall statistics
  - [ ] View user account details
  - [ ] Grant tokens to user
  - [ ] Deduct tokens from user

### Phase 6: Auto-Recharge Implementation (Week 6)
**Goal:** Enable automatic token purchases

- [ ] Implement `triggerAutoRecharge` action in `convex/stripe.ts`
- [ ] Update `deductTokens` mutation to trigger auto-recharge
- [ ] Test auto-recharge flow:
  - [ ] Balance drops below threshold
  - [ ] Automatic payment intent created
  - [ ] Tokens added to account
  - [ ] User notified (optional)

### Phase 7: Testing & Polish (Week 7)
**Goal:** End-to-end testing and bug fixes

- [ ] Test all generation endpoints with token tracking
- [ ] Test insufficient balance scenarios (error handling)
- [ ] Test Stripe webhook edge cases (refunds, failures)
- [ ] Test auto-recharge edge cases
- [ ] Add loading states and error messages to UI
- [ ] Add analytics tracking for key events:
  - Token purchases
  - Low balance warnings
  - Generation failures due to balance
- [ ] Performance testing: ensure token tracking doesn't slow down generations
- [ ] Security audit: ensure no token manipulation exploits

### Phase 8: Launch Preparation (Week 8)
**Goal:** Documentation and deployment

- [ ] Write user documentation:
  - How token pricing works
  - How to purchase tokens
  - How to set up auto-recharge
- [ ] Write admin documentation:
  - How to monitor usage
  - How to grant tokens
  - How to handle user support requests
- [ ] Create migration plan for existing users:
  - Grant welcome bonus to all existing users
  - Email notification about new billing system
  - Grace period (optional)
- [ ] Update Terms of Service and Privacy Policy
- [ ] Deploy to production
- [ ] Monitor for issues in first 48 hours

---

## 7. Key Considerations & Best Practices

### 7.1 Cost Markup Strategy

**Problem:** Direct pass-through of AI costs means zero margin.

**Solution:** Implement markup through token-to-USD conversion:
- Set 1 token = $0.001 (1000 tokens = $1)
- Actual AI costs vary by model (e.g., gpt-4o input = $0.0025 per 1k tokens)
- This creates a healthy margin while remaining competitive

**Example:**
- User generates 10,000 input tokens + 2,000 output tokens with gpt-4o
- Actual cost: (10,000 × $0.0025) + (2,000 × $0.01) = $0.025 + $0.02 = $0.045
- Tokens deducted: 45 tokens (since 1 token = $0.001)
- User paid: $0.045
- **Sustainable pricing with built-in margin for infrastructure costs**

### 7.2 Negative Balance Handling

**Options:**
1. **Hard Stop (Recommended):** Block generations when balance < estimated cost
2. **Soft Stop:** Allow generations but suspend account when balance < 0
3. **Credit System:** Allow limited negative balance (e.g., -1000 tokens) before blocking

**Implementation:** Use "suspended" status in `tokenAccounts` table and check in pre-generation balance validation.

### 7.3 Image Generation Pricing

**Challenge:** Image generation pricing is per-image, not token-based.

**Solution:**
- Store image generation as 0 input tokens, flat cost for output
- DALL-E 3 standard (1024×1024): $0.04 per image
- Convert to tokens: 40 tokens (at $0.001 per token)
- Store in `tokenUsage` table: `inputTokens: 0`, `outputTokens: 40`, `outputCostCents: 4`

### 7.4 Welcome Bonus Strategy

**Recommendation:** Grant 10,000 tokens (~$10 value) to new users

**Rationale:**
- Allows users to test full features before purchasing
- Typical first blog post generation: ~2000-3000 tokens (~$2-3 value)
- Provides 3-5 generations for evaluation
- Creates goodwill and reduces initial friction

**Implementation:** Award tokens in `initializeAccount` mutation, track in `users.onboardingTokensGranted` to prevent duplicates.

### 7.5 Security Considerations

1. **Prevent Token Manipulation:**
   - Never expose token balance mutations to client-side
   - All token adjustments must go through Convex mutations with auth checks
   - Validate all token amounts are positive (except admin deductions)

2. **Webhook Security:**
   - **ALWAYS** verify Stripe webhook signatures
   - Use webhook secrets stored in environment variables
   - Log all webhook events for audit trail

3. **Rate Limiting:**
   - Keep existing image generation rate limit (5/min)
   - Consider adding rate limit to token purchases (prevent credit card testing)
   - Consider adding rate limit to generation requests (prevent abuse)

4. **Fraud Prevention:**
   - Monitor for suspicious patterns (bulk token purchases + immediate use)
   - Implement velocity checks (max tokens per day per user)
   - Add manual review for large purchases (e.g., >500,000 tokens)

### 7.6 Analytics & Monitoring

**Key Metrics to Track:**

1. **Business Metrics:**
   - Daily/weekly/monthly revenue
   - Average revenue per user (ARPU)
   - Token purchase conversion rate
   - Auto-recharge adoption rate
   - Customer lifetime value (LTV)

2. **Usage Metrics:**
   - Total tokens consumed per day
   - Usage by model (gpt-4o vs claude-3-5-sonnet)
   - Usage by operation type (generation vs refinement vs image)
   - Average tokens per generation

3. **Health Metrics:**
   - % of users with positive balance
   - % of users with <1000 tokens (low balance)
   - % of users with suspended accounts
   - Failed generations due to insufficient balance

4. **Support Metrics:**
   - Token refund requests
   - Failed payment rate
   - Auto-recharge failure rate

**Implementation:** Export these metrics in admin dashboard and/or integrate with analytics platform (PostHog, Mixpanel, etc.).

### 7.7 User Communication Strategy

**Critical Touch Points:**

1. **First Generation (if not initialized):**
   - Welcome message: "You've been granted 10,000 free tokens to get started!"
   - Explain token system briefly
   - Link to token pricing page

2. **Low Balance Warning (<1000 tokens):**
   - Show alert at top of editor
   - Suggest purchasing more tokens
   - Offer auto-recharge setup

3. **Insufficient Balance:**
   - Clear error message: "Insufficient tokens. You need ~X tokens for this generation."
   - Direct link to purchase page
   - Show current balance

4. **Successful Purchase:**
   - Success message: "Successfully added X tokens to your account!"
   - Show new balance
   - Suggest enabling auto-recharge

5. **Auto-Recharge Trigger:**
   - Email notification (optional): "Your account was automatically recharged with X tokens"
   - Include receipt and transaction details

### 7.8 Refund Policy

**Recommended Policy:**
- Purchased tokens are non-refundable (standard for digital goods)
- Exception: Technical errors or service failures → manual refund by admin
- Stripe refunds automatically trigger token deduction via webhook

**Implementation:**
- Handle `charge.refunded` webhook event
- Deduct refunded tokens from user balance
- Record as "refund" transaction in `tokenTransactions`

### 7.9 Migration Strategy for Existing Users

**Approach:**

1. **Pre-Launch Phase:**
   - Add `onboardingTokensGranted: false` to all existing users
   - Initialize token accounts with welcome bonus (10,000 tokens)

2. **Launch Announcement:**
   - Email all users explaining new token system
   - Highlight welcome bonus already in their account
   - Provide FAQ and support resources

3. **Grace Period (Optional):**
   - First 30 days: Allow negative balance up to -5000 tokens
   - After grace period: Enforce hard balance checks

4. **Monitoring:**
   - Track conversion rate (free users → paying customers)
   - Monitor support tickets related to billing
   - Adjust pricing/bonuses based on feedback

---

## 8. Cost Estimates & ROI Analysis

### 8.1 Infrastructure Costs

**New Monthly Costs:**
- **Stripe Fees:** 2.9% + $0.30 per transaction
- **Convex Storage:** ~$0.01/GB (minimal - transaction logs)
- **Convex Bandwidth:** ~$0.10/GB (minimal - queries)

**Example:**
- User purchases 50,000 tokens for $45
- Stripe fee: ($45 × 0.029) + $0.30 = $1.31 + $0.30 = $1.61
- Net revenue: $45 - $1.61 = $43.39

### 8.2 Pricing Sensitivity Analysis with Token Multiplier

**Our Pricing Model:** Users are charged **actual tokens consumed × configurable multiplier**

**Example with 1.5x multiplier (50% markup):**

| Scenario | Actual Tokens | Multiplier | Billable Tokens | Actual AI Cost | Effective User Cost | Margin |
|----------|--------------|------------|-----------------|----------------|---------------------|--------|
| GPT-4o generation (10k input + 2k output) | 12,000 | 1.5 | 18,000 | $0.045 | $0.045 × 1.5 = $0.0675 | 50% |
| Claude Sonnet generation (8k input + 1.5k output) | 9,500 | 1.5 | 14,250 | $0.0465 | $0.0465 × 1.5 = $0.0698 | 50% |
| Small chat response (500 input + 200 output) | 700 | 1.5 | 1,050 | ~$0.003 | ~$0.0045 | 50% |

**Key Benefits of Token-Based Pricing:**
1. **Transparent:** Users understand "1 API token = 1.5 billing tokens"
2. **Simple:** No complex cost calculations visible to users
3. **Flexible:** Multiplier can be adjusted (1.2x, 1.5x, 2.0x, etc.)
4. **Fair:** Users only pay for what they use
5. **Sustainable:** Built-in profit margin covers infrastructure and support

**Recommended Token Package Pricing:**

Assume average user needs ~100,000 actual tokens/month (with 1.5x = 150,000 billable tokens):

- **Starter:** 150,000 tokens = **$15** (~$0.0001 per token)
- **Pro:** 750,000 tokens = **$65** (~$0.000087 per token, 13% discount)
- **Business:** 2,250,000 tokens = **$175** (~$0.000078 per token, 22% discount)
- **Enterprise:** 7,500,000 tokens = **$500** (~$0.000067 per token, 33% discount)

**Why this pricing works:**
- Starter package supports ~100k actual tokens worth of generation (typical for 5-10 blog posts with GPT-4o)
- Pro package for regular content creators (25-50 blog posts/month)
- Business for teams/agencies
- Enterprise for high-volume users

**Profit Margin Example:**
- User purchases Starter (150,000 tokens for $15)
- They use all 150,000 tokens (= 100,000 actual AI tokens at 1.5x)
- Actual AI cost: ~$1.50-$5 depending on model mix (gpt-4o-mini vs gpt-4o)
- Gross profit: $10-$13.50 (67-90% margin)
- After Stripe fees ($0.74): Net profit $9.26-$12.76 per package

### 8.3 Break-Even Analysis

**Assumptions:**
- Average user generates 20,000 tokens/month (10k input + 10k output with gpt-4o)
- Actual AI cost: (10 × $0.0025) + (10 × $0.01) = $0.125/month
- With 50% markup: User pays $0.19/month
- Monthly gross margin: $0.065/user

**Break-even calculation:**
- Fixed costs: $50/month (Convex, monitoring, misc)
- Required users: $50 / $0.065 = **770 active users** to break even on token system overhead

**Conclusion:** Token-based billing becomes profitable at moderate scale (1,000+ users).

---

## 9. Alternative Approaches Considered

### 9.1 Subscription-Based Pricing

**Pros:**
- Predictable monthly revenue
- Simpler user mental model
- Lower Stripe fees (% of subscription, not per-transaction)

**Cons:**
- Doesn't align with actual usage (users overpay or underpay)
- Requires usage caps or tier management
- Less flexible for varying usage patterns

**Verdict:** Token-based is better for variable AI workloads.

### 9.2 Monthly Usage Caps

**Pros:**
- Simpler implementation (no token accounting)
- Encourages subscription tiers

**Cons:**
- "Hard wall" at cap frustrates users
- Doesn't reflect actual costs accurately
- Encourages gaming the system (multiple accounts)

**Verdict:** Token-based is more transparent and fair.

### 9.3 Free-with-Ads Model

**Pros:**
- Lower barrier to entry
- Potential for viral growth

**Cons:**
- Ads in content creation tools are highly disruptive
- Ad revenue unlikely to cover AI costs
- Damages brand perception

**Verdict:** Not viable for B2B SaaS content tool.

### 9.4 Freemium with Feature Gates

**Example:** Free tier gets basic models (gpt-3.5-turbo), paid tier gets premium models (gpt-4o).

**Pros:**
- Clear differentiation between tiers
- Encourages upgrades

**Cons:**
- Still requires usage tracking for premium tier
- Doesn't solve core cost problem

**Verdict:** Can combine with token system (free tier = limited tokens, paid = more tokens).

---

## 10. Success Criteria

**The token system implementation will be considered successful if:**

1. **Technical:**
   - [ ] 100% of LLM generations tracked with <1% error rate
   - [ ] Token balance checks complete in <200ms (don't slow down generations)
   - [ ] Webhook processing succeeds >99.5% of the time
   - [ ] Zero incidents of token balance manipulation

2. **Business:**
   - [ ] >60% of active users purchase tokens within 30 days
   - [ ] <5% support tickets related to billing confusion
   - [ ] Average revenue per user (ARPU) increases by >50%
   - [ ] Customer churn rate remains <10%/month

3. **User Experience:**
   - [ ] Token purchase flow completes in <3 clicks
   - [ ] Low balance warnings reduce "insufficient balance" errors by >80%
   - [ ] Auto-recharge adoption >20% of paying users
   - [ ] Net Promoter Score (NPS) remains >40

---

## 11. Appendices

### A. API Reference

**Convex Functions Summary:**

| Function | Type | Purpose |
|----------|------|---------|
| `tokenUsage.recordUsage` | Mutation | Record AI generation usage |
| `tokenAccounts.initializeAccount` | Mutation | Create token account for new user |
| `tokenAccounts.checkBalance` | Query | Pre-generation balance validation |
| `tokenAccounts.deductTokens` | Mutation | Deduct tokens after usage |
| `tokenAccounts.addTokens` | Mutation | Add tokens after purchase |
| `tokenAccounts.getAccount` | Query | Get user's token account |
| `tokenAccounts.getTransactions` | Query | Get transaction history |
| `tokenAccounts.updateAutoRecharge` | Mutation | Configure auto-recharge |
| `tokenPricing.listActive` | Query | List purchasable packages |
| `stripe.createCheckoutSession` | Action | Create Stripe checkout |
| `stripe.triggerAutoRecharge` | Action | Scheduled auto-purchase |
| `admin.getTokenStats` | Query | Overall usage statistics |
| `admin.getModelUsageStats` | Query | Per-model breakdown |
| `admin.getUserAccounts` | Query | List user accounts |
| `admin.grantTokens` | Mutation | Admin award tokens |
| `admin.deductTokens` | Mutation | Admin remove tokens |

### B. Environment Variables Checklist

**Required for Production:**

```bash
# Stripe (add to wrangler secrets)
STRIPE_SECRET_KEY=sk_live_...

# Stripe (add to wrangler.jsonc vars)
STRIPE_WEBHOOK_SECRET=whsec_...
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_...

# Existing (already configured)
VITE_CONVEX_URL=https://...
CLERK_SECRET_KEY=...
VITE_CLERK_PUBLISHABLE_KEY=...
OPENAI_API_KEY=...
ANTHROPIC_API_KEY=...
```

### C. Testing Checklist

**Manual Test Scenarios:**

- [ ] New user signs up → receives 10,000 welcome tokens
- [ ] User generates content → tokens deducted correctly
- [ ] User has insufficient balance → generation blocked with clear error
- [ ] User purchases tokens → Stripe checkout succeeds → tokens added
- [ ] User views transaction history → all transactions visible
- [ ] User enables auto-recharge → balance drops below threshold → auto-purchase triggered
- [ ] Admin views overall stats → accurate numbers displayed
- [ ] Admin grants tokens to user → balance increases → transaction recorded
- [ ] Admin views user's detailed usage → all generations listed
- [ ] Stripe webhook fails (test mode) → retry mechanism works
- [ ] User's balance goes negative → account suspended → generation blocked
- [ ] Refund issued in Stripe → tokens deducted from user

### D. Support Playbook

**Common User Issues:**

1. **"I purchased tokens but they haven't arrived"**
   - Check Stripe webhook logs in Dashboard → Webhooks
   - Verify payment intent succeeded in Stripe
   - Manually trigger token credit if webhook failed
   - Query: `convex.query(api.admin.getUserDetailedUsage, { userId })`

2. **"Why is generation blocked? I have tokens"**
   - Check account status: `convex.query(api.tokenAccounts.getAccount, { userId })`
   - Verify estimated cost vs. balance
   - Check for suspended status (negative balance)

3. **"I want a refund"**
   - Verify purchase in Stripe Dashboard
   - Check if tokens were already used
   - If eligible: Issue refund in Stripe → webhook auto-deducts tokens
   - If tokens already used: Explain no-refund policy

4. **"Auto-recharge didn't work"**
   - Check auto-recharge settings in database
   - Verify Stripe customer has default payment method
   - Check failed payment logs in Stripe
   - Re-enable auto-recharge after fixing payment method

---

## 12. Next Steps

**Before starting implementation:**

1. **Review & Approve This Plan**
   - Stakeholder review of pricing model
   - Legal review of billing terms
   - Engineering review of technical approach

2. **Stripe Account Setup**
   - Activate Stripe account for production
   - Configure tax settings (if applicable)
   - Create products and pricing in Stripe Dashboard

3. **Convex Schema Migration**
   - Test schema changes in dev environment
   - Plan zero-downtime migration for production
   - Backup existing data before migration

4. **Team Alignment**
   - Assign owners for each implementation phase
   - Schedule weekly check-ins during development
   - Establish on-call rotation for billing issues

**Once approved, begin with Phase 1: Foundation (Week 1).**

---

## 13. Quick Reference: Key Configuration Values

**Token Multiplier (Primary Configuration):**
```typescript
// In src/lib/ai/pricing.ts
export const TOKEN_MARKUP_MULTIPLIER = 1.5; // 50% markup

// To adjust profit margin, change this value:
// - 1.2 = 20% markup (lower profit, more competitive)
// - 1.5 = 50% markup (recommended)
// - 2.0 = 100% markup (double the cost)
// - 3.0 = 200% markup (triple the cost)
```

**Welcome Bonus:**
```typescript
// In convex/tokenAccounts.ts
const welcomeBonus = 10000; // Free tokens for new users
```

**Token Packages (Recommended):**
```typescript
// In Stripe Dashboard & convex/tokenPricing
Starter: 150,000 tokens = $15
Pro: 750,000 tokens = $65
Business: 2,250,000 tokens = $175
Enterprise: 7,500,000 tokens = $500
```

**Balance Thresholds:**
```typescript
// In UI components
LOW_THRESHOLD = 1000;  // Show warning
CRITICAL_THRESHOLD = 100;  // Show urgent warning
```

**Image Generation Token Equivalent:**
```typescript
// In src/lib/ai/pricing.ts
// DALL-E 3: $0.04 per image → 4000 equivalent tokens
// With 1.5x multiplier: 6000 billable tokens per image
```

**Database Field Summary:**
```typescript
tokenUsage: {
  inputTokens: number,       // Actual from AI SDK
  outputTokens: number,      // Actual from AI SDK
  totalTokens: number,       // Actual from AI SDK
  billableTokens: number,    // With multiplier applied
  actualCostCents: number,   // For analytics
  multiplier: number         // Audit trail
}

tokenAccounts: {
  balance: number,                    // Billable tokens available
  lifetimeTokensUsed: number,         // Billable tokens consumed
  lifetimeActualTokensUsed: number,   // Actual tokens consumed
  lifetimeSpentCents: number          // USD spent
}
```

---

## Document Metadata

- **Author:** Claude (AI Assistant)
- **Created:** 2025-12-03
- **Last Updated:** 2025-12-03
- **Version:** 2.0 (Updated to use actual token counts with multiplier)
- **Status:** Draft - Awaiting Approval
- **Key Change:** Billing now based on actual AI SDK token consumption with configurable multiplier (was previously cost-to-token conversion)
- **Estimated Implementation Time:** 8 weeks (with 1 developer)
- **Estimated Cost:** $0 (no new infrastructure required, Stripe fees only)
- **Risk Level:** Medium (billing changes are sensitive, require thorough testing)

---

**END OF PLAN**
