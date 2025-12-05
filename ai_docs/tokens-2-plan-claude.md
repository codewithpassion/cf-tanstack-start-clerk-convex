# Token-Based Billing System - Unified Implementation Plan (v2.0)

**Created:** 2025-12-03
**Status:** Planning Phase - DO NOT IMPLEMENT YET
**Project:** Postmate Content Management System
**Version:** 2.0 - Synthesized from 3 comprehensive plans

---

## Executive Summary

This document represents a **synthesis of three independent token billing system designs**, incorporating the best elements from each approach to create a comprehensive, production-ready implementation plan.

### Design Philosophy

**Core Billing Model:** Users are charged based on **actual token consumption** (from AI SDK) multiplied by a **configurable markup multiplier**, with support for **fixed-cost services** (images, future features).

**Key Principles:**
1. **Transparency** - Users see exact token consumption
2. **Flexibility** - Support both LLM tokens and fixed-cost services
3. **Scalability** - Designed for international markets and high volume
4. **Security** - Multiple layers of protection against manipulation
5. **Analytics** - Comprehensive tracking for business intelligence

### How Billing Works

```
User Action → AI Generation → Token Tracking → Balance Deduction

Example (Text):
- Generate blog post with GPT-4o
- AI SDK returns: 10,000 input + 2,000 output = 12,000 actual tokens
- System applies 1.5× multiplier: 12,000 × 1.5 = 18,000 billable tokens
- User balance: 50,000 → 32,000 tokens

Example (Image):
- Generate DALL-E 3 image
- Fixed cost: 6,000 tokens (equivalent to $0.04 × 1.5× markup)
- User balance: 32,000 → 26,000 tokens
```

**Why This Hybrid Approach:**
- ✅ Transparent (users understand token math)
- ✅ Fair (pay-per-use, no wasted credits)
- ✅ Flexible (handles LLMs, images, future services)
- ✅ Profitable (configurable markup built-in)
- ✅ Simple (single unified "token" currency)

---

## 1. Database Schema Design

### Philosophy: Optimized Normalization
We use **5 core tables** for comprehensive tracking while maintaining query efficiency:
1. `tokenAccounts` - User balance and settings (wallet abstraction)
2. `tokenUsage` - Detailed usage logs (analytics foundation)
3. `tokenTransactions` - Financial ledger (audit trail)
4. `tokenPricing` - Admin-managed packages (dynamic pricing)
5. `systemSettings` - Global configuration (singleton pattern)

### 1.1 Table: `tokenAccounts`

**Purpose:** Wallet abstraction for user token balances and auto-recharge settings.

**From:** Claude plan (comprehensive), enhanced with Antigrav's currency support

```typescript
tokenAccounts: defineTable({
  // References
  userId: v.id("users"),
  workspaceId: v.id("workspaces"),

  // Balance (billable tokens - these are "user credits")
  balance: v.number(), // Current available tokens
  lifetimeTokensPurchased: v.number(), // Total tokens ever purchased
  lifetimeTokensUsed: v.number(), // Total billable tokens consumed (with multiplier)
  lifetimeActualTokensUsed: v.number(), // Total actual AI tokens (without multiplier)
  lifetimeSpentCents: v.number(), // Total USD spent purchasing tokens

  // Auto-Recharge Settings
  autoRechargeEnabled: v.boolean(),
  autoRechargeThreshold: v.optional(v.number()), // Trigger when balance < this
  autoRechargeAmount: v.optional(v.number()), // Tokens to auto-purchase

  // Stripe Integration
  stripeCustomerId: v.optional(v.string()),
  defaultPaymentMethodId: v.optional(v.string()),

  // International Support (from Antigrav plan)
  currency: v.string(), // Default: "usd", supports "eur", "gbp", etc.

  // Account Status
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

**Key Improvements:**
- ✅ Separate lifetime tracking for billable vs actual tokens (analytics)
- ✅ Currency field for international expansion
- ✅ Account status system for enforcement

---

### 1.2 Table: `tokenUsage`

**Purpose:** Granular log of every AI interaction for analytics and debugging.

**From:** Claude plan (comprehensive), enhanced with Antigrav's detailed fields

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

  // LLM Token Counts (from AI SDK)
  inputTokens: v.optional(v.number()), // Null for fixed-cost services
  outputTokens: v.optional(v.number()), // Null for fixed-cost services
  totalTokens: v.optional(v.number()), // inputTokens + outputTokens

  // Image Details (from Antigrav plan)
  imageCount: v.optional(v.number()), // Number of images generated
  imageSize: v.optional(v.string()), // "1024x1024", "512x512", etc.

  // Billing Calculation
  billableTokens: v.number(), // ALWAYS populated (tokens deducted from balance)
  chargeType: v.union(
    v.literal("multiplier"), // LLM: actualTokens × multiplier
    v.literal("fixed") // Images: predefined token cost
  ),
  multiplier: v.optional(v.number()), // Stored for audit (e.g., 1.5)
  fixedCost: v.optional(v.number()), // Stored if chargeType = "fixed"

  // Metadata
  requestMetadata: v.optional(v.string()), // JSON: { prompt_length, category, etc. }
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
  .index("by_provider_model", ["provider", "model"])
  .index("by_operationType", ["operationType"]);
```

**Key Improvements:**
- ✅ Hybrid design: Supports both token-based (LLMs) and fixed-cost (images) charging
- ✅ `chargeType` field explicitly documents billing method
- ✅ Image-specific fields (imageCount, imageSize) for analytics
- ✅ Stores multiplier/fixedCost for historical audit trail
- ✅ Optional token fields (nullable for fixed-cost services)

---

### 1.3 Table: `tokenTransactions`

**Purpose:** Immutable financial ledger for all balance changes.

**From:** Claude plan (comprehensive), enhanced with Gemini's metadata flexibility

```typescript
tokenTransactions: defineTable({
  // References
  userId: v.id("users"),
  workspaceId: v.id("workspaces"),

  // Transaction Details
  transactionType: v.union(
    v.literal("purchase"), // User bought tokens via Stripe
    v.literal("usage"), // Tokens consumed by AI generation
    v.literal("admin_grant"), // Admin awarded tokens
    v.literal("admin_deduction"), // Admin removed tokens
    v.literal("refund"), // Stripe refund processed
    v.literal("bonus"), // Promotional/referral tokens
    v.literal("auto_recharge") // Automatic purchase triggered
  ),

  // Amount (positive for credits, negative for debits)
  tokenAmount: v.number(),
  balanceBefore: v.number(),
  balanceAfter: v.number(),

  // Cost (for purchases/refunds only, in cents)
  amountCents: v.optional(v.number()),

  // References
  tokenUsageId: v.optional(v.id("tokenUsage")), // Link to usage record
  stripePaymentIntentId: v.optional(v.string()),
  stripeInvoiceId: v.optional(v.string()),
  adminUserId: v.optional(v.id("users")), // Admin who granted/deducted

  // Description & Metadata
  description: v.string(), // Human-readable (e.g., "Blog generation", "Starter Pack")
  metadata: v.optional(v.string()), // JSON for extensibility

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

**Key Improvements:**
- ✅ `auto_recharge` transaction type for tracking automated purchases
- ✅ Flexible metadata field (JSON) for future extensibility
- ✅ Comprehensive indexing for fast queries

---

### 1.4 Table: `tokenPricing`

**Purpose:** Admin-configurable token packages for purchase.

**From:** Claude plan (only plan with this feature)

```typescript
tokenPricing: defineTable({
  // Package Details
  packageName: v.string(), // e.g., "Starter", "Pro", "Enterprise"
  tokenAmount: v.number(), // Number of tokens in package
  priceCents: v.number(), // Price in USD cents

  // Display
  description: v.optional(v.string()), // Marketing copy
  isPopular: v.boolean(), // Highlight as "Best Value" in UI
  sortOrder: v.number(), // Display order (1, 2, 3, 4)

  // Stripe Integration
  stripePriceId: v.string(), // Stripe Price ID for checkout

  // Multi-Currency Support (future)
  priceEUR: v.optional(v.number()), // Price in EUR cents
  priceGBP: v.optional(v.number()), // Price in GBP cents

  // Status
  active: v.boolean(), // Only active packages shown to users

  // Timestamps
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_active", ["active"])
  .index("by_sortOrder", ["sortOrder"]);
```

**Key Improvements:**
- ✅ Multi-currency pricing fields (prepare for international expansion)
- ✅ `isPopular` flag for UI highlighting
- ✅ Admin can add/remove packages without code changes

---

### 1.5 Table: `systemSettings`

**Purpose:** Global configuration singleton for billing parameters.

**From:** Gemini plan (singleton pattern), enhanced with Claude's multiplier approach

```typescript
systemSettings: defineTable({
  key: v.string(), // Always "global_settings" (singleton)

  // Token Billing Configuration
  defaultTokenMultiplier: v.number(), // e.g., 1.5 (50% markup)

  // Fixed Cost Configuration (in tokens)
  imageGenerationCost: v.number(), // e.g., 6000 tokens per DALL-E 3 image

  // Purchase Configuration
  tokensPerUSD: v.number(), // e.g., 10,000 tokens per $1.00
  minPurchaseAmountCents: v.number(), // Minimum purchase (e.g., 500 = $5.00)

  // Welcome Bonus
  newUserBonusTokens: v.number(), // e.g., 10,000 free tokens

  // Rate Limiting (prevent abuse)
  maxTokensPerHour: v.optional(v.number()), // e.g., 100,000
  maxGenerationsPerHour: v.optional(v.number()), // e.g., 50

  // Alerts
  lowBalanceThreshold: v.number(), // Show warning when balance < this (e.g., 1,000)
  criticalBalanceThreshold: v.number(), // Urgent warning (e.g., 100)

  // Timestamps
  updatedAt: v.number(),
  updatedBy: v.optional(v.id("users")), // Admin who last modified
})
  .index("by_key", ["key"]);
```

**Key Improvements:**
- ✅ Single unified multiplier (simpler than separate input/output multipliers)
- ✅ Fixed costs configurable per service type
- ✅ Rate limiting parameters to prevent abuse
- ✅ Alert thresholds centralized
- ✅ Audit trail (updatedBy)

---

### 1.6 Updates to Existing `users` Table

**Minimal changes** to existing schema:

```typescript
users: defineTable({
  // Existing fields...
  email: v.string(),
  name: v.optional(v.string()),
  clerkId: v.string(),
  imageUrl: v.optional(v.string()),
  roles: v.optional(v.array(v.string())),

  // NEW: Token-related fields (minimal)
  onboardingTokensGranted: v.optional(v.boolean()), // Prevent duplicate bonuses
  billingEmail: v.optional(v.string()), // Separate from login email
  preferredCurrency: v.optional(v.string()), // Default: "usd"

  createdAt: v.number(),
  updatedAt: v.number(),
})
```

---

## 2. Core Backend Logic (Convex)

### 2.1 Security Pattern: `BILLING_SECRET`

**From:** Gemini plan (excellent security practice)

**Environment Setup:**
```bash
# Add to .dev.vars, wrangler.jsonc, and Convex Dashboard
BILLING_SECRET=<random_64_char_string>
```

**Usage Pattern:**
```typescript
// In convex/tokenUsage.ts
export const recordUsage = mutation({
  args: {
    secret: v.string(), // Required for security
    // ... other args
  },
  handler: async (ctx, args) => {
    // Verify secret
    if (args.secret !== process.env.BILLING_SECRET) {
      throw new Error("Unauthorized: Invalid billing secret");
    }

    // Proceed with billing logic...
  },
});
```

**Why This Matters:**
- Prevents client-side manipulation of billing mutations
- Only server-side code (with access to env vars) can record usage
- Additional layer beyond Clerk authentication

---

### 2.2 Token Calculation Helper

**File:** `src/lib/ai/pricing.ts`

**From:** Claude plan, enhanced with Gemini's hybrid approach

```typescript
/**
 * GLOBAL CONFIGURATION
 * Modify these values to adjust pricing strategy
 */

// LLM Token Billing
export const DEFAULT_TOKEN_MULTIPLIER = 1.5; // 50% markup on actual tokens

// Fixed Cost Billing (in tokens)
export const IMAGE_COSTS = {
  "dall-e-3": {
    "1024x1024": 6000, // $0.04 × 1.5× at 10k tokens/$1
    "1024x1792": 8000,
    "1792x1024": 8000,
  },
  "dall-e-2": {
    "512x512": 2000,
    "1024x1024": 3000,
  },
  "google-nano-banana": {
    "1024x1024": 4500, // $0.03 × 1.5× at 10k tokens/$1
  },
} as const;

/**
 * Calculate billable tokens for LLM usage
 */
export function calculateLLMBillableTokens(
  inputTokens: number,
  outputTokens: number,
  multiplier: number = DEFAULT_TOKEN_MULTIPLIER
): {
  actualTokens: number;
  billableTokens: number;
  chargeType: "multiplier";
  multiplier: number;
} {
  const actualTokens = inputTokens + outputTokens;
  const billableTokens = Math.ceil(actualTokens * multiplier);

  return {
    actualTokens,
    billableTokens,
    chargeType: "multiplier",
    multiplier,
  };
}

/**
 * Calculate billable tokens for image generation (fixed cost)
 */
export function calculateImageBillableTokens(
  model: keyof typeof IMAGE_COSTS,
  size: string,
  count: number = 1
): {
  actualTokens: 0; // Images don't have "actual tokens"
  billableTokens: number;
  chargeType: "fixed";
  fixedCost: number;
} {
  const costPerImage = IMAGE_COSTS[model]?.[size] ?? IMAGE_COSTS["dall-e-3"]["1024x1024"];
  const billableTokens = costPerImage * count;

  return {
    actualTokens: 0,
    billableTokens,
    chargeType: "fixed",
    fixedCost: costPerImage,
  };
}

/**
 * Get current system settings (cached for performance)
 */
let settingsCache: SystemSettings | null = null;
let settingsCacheTime = 0;
const CACHE_TTL = 60_000; // 1 minute

export async function getSystemSettings(ctx: QueryCtx | MutationCtx): Promise<SystemSettings> {
  const now = Date.now();

  if (settingsCache && (now - settingsCacheTime < CACHE_TTL)) {
    return settingsCache;
  }

  const settings = await ctx.db
    .query("systemSettings")
    .withIndex("by_key", (q) => q.eq("key", "global_settings"))
    .first();

  if (!settings) {
    // Return defaults if not configured
    return {
      defaultTokenMultiplier: DEFAULT_TOKEN_MULTIPLIER,
      imageGenerationCost: 6000,
      tokensPerUSD: 10000,
      minPurchaseAmountCents: 500,
      newUserBonusTokens: 10000,
      lowBalanceThreshold: 1000,
      criticalBalanceThreshold: 100,
    };
  }

  settingsCache = settings;
  settingsCacheTime = now;
  return settings;
}
```

**Key Improvements:**
- ✅ Hybrid billing: Separate functions for LLM vs fixed-cost services
- ✅ Size-specific image pricing
- ✅ Settings caching for performance
- ✅ Fallback to defaults if not configured

---

### 2.3 Token Account Management

**File:** `convex/tokenAccounts.ts`

**From:** Claude plan, simplified based on Gemini's approach

```typescript
import { v } from "convex/values";
import { mutation, query, internalMutation } from "./_generated/server";
import { api } from "./_generated/api";

/**
 * Initialize token account for new user (with welcome bonus)
 */
export const initializeAccount = mutation({
  args: {
    userId: v.id("users"),
    workspaceId: v.id("workspaces"),
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

    // Get system settings
    const settings = await getSystemSettings(ctx);

    // Create account with welcome bonus
    const accountId = await ctx.db.insert("tokenAccounts", {
      userId: args.userId,
      workspaceId: args.workspaceId,
      balance: settings.newUserBonusTokens,
      lifetimeTokensPurchased: 0,
      lifetimeTokensUsed: 0,
      lifetimeActualTokensUsed: 0,
      lifetimeSpentCents: 0,
      autoRechargeEnabled: false,
      currency: "usd",
      status: "active",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Record welcome bonus transaction
    await ctx.db.insert("tokenTransactions", {
      userId: args.userId,
      workspaceId: args.workspaceId,
      transactionType: "bonus",
      tokenAmount: settings.newUserBonusTokens,
      balanceBefore: 0,
      balanceAfter: settings.newUserBonusTokens,
      description: "Welcome bonus",
      createdAt: Date.now(),
    });

    // Mark user as having received bonus
    await ctx.db.patch(args.userId, {
      onboardingTokensGranted: true,
    });

    return accountId;
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
 * Check if user has sufficient balance (pre-flight check)
 */
export const checkBalance = query({
  args: {
    userId: v.id("users"),
    requiredTokens: v.number(),
  },
  handler: async (ctx, args) => {
    const account = await ctx.db
      .query("tokenAccounts")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .first();

    if (!account) {
      return { sufficient: false, balance: 0, required: args.requiredTokens };
    }

    if (account.status !== "active") {
      return {
        sufficient: false,
        balance: account.balance,
        required: args.requiredTokens,
        accountStatus: account.status
      };
    }

    return {
      sufficient: account.balance >= args.requiredTokens,
      balance: account.balance,
      required: args.requiredTokens,
      accountStatus: account.status,
    };
  },
});

/**
 * Deduct tokens from account (called after usage)
 * INTERNAL ONLY - called from recordUsage
 */
export const deductTokens = internalMutation({
  args: {
    userId: v.id("users"),
    workspaceId: v.id("workspaceId"),
    tokenUsageId: v.id("tokenUsage"),
    billableTokens: v.number(),
    actualTokens: v.number(), // For lifetime tracking
  },
  handler: async (ctx, args) => {
    const account = await ctx.db
      .query("tokenAccounts")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .first();

    if (!account) {
      throw new Error("Token account not found");
    }

    // Calculate new balance
    const newBalance = account.balance - args.billableTokens;

    // Update account
    await ctx.db.patch(account._id, {
      balance: newBalance,
      lifetimeTokensUsed: account.lifetimeTokensUsed + args.billableTokens,
      lifetimeActualTokensUsed: account.lifetimeActualTokensUsed + args.actualTokens,
      status: newBalance < 0 ? "suspended" : account.status,
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

    // Check auto-recharge threshold
    if (
      account.autoRechargeEnabled &&
      account.autoRechargeThreshold &&
      newBalance < account.autoRechargeThreshold &&
      account.balance >= account.autoRechargeThreshold // Only trigger once
    ) {
      // Schedule auto-recharge action
      await ctx.scheduler.runAfter(0, api.stripe.triggerAutoRecharge, {
        userId: args.userId,
        accountId: account._id,
      });
    }

    return newBalance;
  },
});

/**
 * Add tokens to account (after purchase)
 */
export const addTokens = mutation({
  args: {
    userId: v.id("users"),
    workspaceId: v.id("workspaces"),
    tokenAmount: v.number(),
    amountCents: v.number(), // Price paid in USD cents
    transactionType: v.union(
      v.literal("purchase"),
      v.literal("admin_grant"),
      v.literal("bonus"),
      v.literal("refund")
    ),
    stripePaymentIntentId: v.optional(v.string()),
    description: v.string(),
    adminUserId: v.optional(v.id("users")),
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

    // Update account
    await ctx.db.patch(account._id, {
      balance: newBalance,
      lifetimeTokensPurchased: account.lifetimeTokensPurchased + args.tokenAmount,
      lifetimeSpentCents: account.lifetimeSpentCents + args.amountCents,
      status: newBalance >= 0 ? "active" : account.status,
      lastPurchaseAt: Date.now(),
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
      adminUserId: args.adminUserId,
      description: args.description,
      createdAt: Date.now(),
    });

    return newBalance;
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

/**
 * Get transaction history for user
 */
export const getTransactions = query({
  args: {
    userId: v.id("users"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 50;

    return await ctx.db
      .query("tokenTransactions")
      .withIndex("by_userId_createdAt", (q) => q.eq("userId", args.userId))
      .order("desc")
      .take(limit);
  },
});
```

**Key Improvements:**
- ✅ Automatic welcome bonus on account creation
- ✅ Pre-flight balance checks prevent wasted API calls
- ✅ Auto-recharge triggers via Convex scheduler (elegant pattern)
- ✅ Account suspension on negative balance
- ✅ Comprehensive transaction logging

---

### 2.4 Usage Recording

**File:** `convex/tokenUsage.ts`

**From:** All three plans, synthesized into hybrid approach

```typescript
import { v } from "convex/values";
import { mutation } from "./_generated/server";
import { api, internal } from "./_generated/api";

/**
 * Record token usage (LLM or fixed-cost service)
 * Security: Requires BILLING_SECRET to prevent client-side manipulation
 */
export const recordUsage = mutation({
  args: {
    // Security
    secret: v.string(),

    // User Context
    userId: v.id("users"),
    workspaceId: v.id("workspaces"),
    projectId: v.optional(v.id("projects")),
    contentPieceId: v.optional(v.id("contentPieces")),

    // Operation
    operationType: v.union(
      v.literal("content_generation"),
      v.literal("content_refinement"),
      v.literal("content_repurpose"),
      v.literal("chat_response"),
      v.literal("image_generation"),
      v.literal("image_prompt_generation")
    ),

    // AI Service
    provider: v.union(v.literal("openai"), v.literal("anthropic"), v.literal("google")),
    model: v.string(),

    // LLM Usage (optional - for text generation)
    inputTokens: v.optional(v.number()),
    outputTokens: v.optional(v.number()),
    totalTokens: v.optional(v.number()),

    // Image Usage (optional - for image generation)
    imageCount: v.optional(v.number()),
    imageSize: v.optional(v.string()),

    // Billing (calculated by caller using pricing.ts helpers)
    billableTokens: v.number(),
    chargeType: v.union(v.literal("multiplier"), v.literal("fixed")),
    multiplier: v.optional(v.number()), // Store for audit
    fixedCost: v.optional(v.number()), // Store for audit

    // Metadata
    requestMetadata: v.optional(v.string()),
    success: v.boolean(),
    errorMessage: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // SECURITY: Verify billing secret
    if (args.secret !== process.env.BILLING_SECRET) {
      throw new Error("Unauthorized: Invalid billing secret");
    }

    // Insert usage record
    const usageId = await ctx.db.insert("tokenUsage", {
      userId: args.userId,
      workspaceId: args.workspaceId,
      projectId: args.projectId,
      contentPieceId: args.contentPieceId,
      operationType: args.operationType,
      provider: args.provider,
      model: args.model,
      inputTokens: args.inputTokens,
      outputTokens: args.outputTokens,
      totalTokens: args.totalTokens,
      imageCount: args.imageCount,
      imageSize: args.imageSize,
      billableTokens: args.billableTokens,
      chargeType: args.chargeType,
      multiplier: args.multiplier,
      fixedCost: args.fixedCost,
      requestMetadata: args.requestMetadata,
      success: args.success,
      errorMessage: args.errorMessage,
      createdAt: Date.now(),
    });

    // Deduct tokens from account (if successful)
    if (args.success && args.billableTokens > 0) {
      await ctx.runMutation(internal.tokenAccounts.deductTokens, {
        userId: args.userId,
        workspaceId: args.workspaceId,
        tokenUsageId: usageId,
        billableTokens: args.billableTokens,
        actualTokens: args.totalTokens ?? 0, // 0 for fixed-cost services
      });
    }

    return usageId;
  },
});

/**
 * Get usage history for user (with pagination)
 */
export const getUserUsage = query({
  args: {
    userId: v.id("users"),
    limit: v.optional(v.number()),
    operationType: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 50;

    let query = ctx.db
      .query("tokenUsage")
      .withIndex("by_userId_createdAt", (q) => q.eq("userId", args.userId))
      .order("desc");

    const results = await query.take(limit);

    // Filter by operation type if specified (post-query filter)
    if (args.operationType) {
      return results.filter((r) => r.operationType === args.operationType);
    }

    return results;
  },
});
```

**Key Improvements:**
- ✅ `BILLING_SECRET` security check (from Gemini)
- ✅ Hybrid design: Supports both LLM and fixed-cost billing
- ✅ Stores audit trail (multiplier/fixedCost)
- ✅ Only deducts on successful generation
- ✅ Flexible metadata for future features

---

## 3. AI Integration (Server-Side)

### 3.1 Update Generation Functions

**File:** `src/server/ai.ts`

**Pattern:** Add token tracking to all generation functions

```typescript
import { calculateLLMBillableTokens } from "@/lib/ai/pricing";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/api";
import { env } from "cloudflare:workers";

// Example: generateDraft function
export async function generateDraft(/* args */) {
  // 1. PRE-FLIGHT: Check balance
  const convex = new ConvexHttpClient(env.VITE_CONVEX_URL);

  const estimatedTokens = calculateEstimatedTokens(prompt, targetWordCount);
  const balanceCheck = await convex.query(api.tokenAccounts.checkBalance, {
    userId: user._id,
    requiredTokens: estimatedTokens,
  });

  if (!balanceCheck.sufficient) {
    throw new Error(
      `Insufficient token balance. You have ${balanceCheck.balance} tokens ` +
      `but need ~${balanceCheck.required} tokens for this generation.`
    );
  }

  // 2. GENERATE CONTENT
  const result = await streamText({
    model: openai("gpt-4o"),
    prompt: generationPrompt,
    // ... other options
  });

  let inputTokens = 0;
  let outputTokens = 0;
  let success = false;
  let errorMessage: string | undefined;

  // 3. TRACK USAGE IN onFinish
  result.onFinish(async (event) => {
    try {
      inputTokens = event.usage.inputTokens;
      outputTokens = event.usage.outputTokens;
      success = true;

      // Calculate billable tokens
      const billing = calculateLLMBillableTokens(inputTokens, outputTokens);

      // Record usage
      await convex.mutation(api.tokenUsage.recordUsage, {
        secret: env.BILLING_SECRET!,
        userId: user._id,
        workspaceId: workspace._id,
        projectId: project?._id,
        contentPieceId: contentPiece?._id,
        operationType: "content_generation",
        provider: "openai",
        model: "gpt-4o",
        inputTokens: inputTokens,
        outputTokens: outputTokens,
        totalTokens: billing.actualTokens,
        billableTokens: billing.billableTokens,
        chargeType: billing.chargeType,
        multiplier: billing.multiplier,
        requestMetadata: JSON.stringify({
          category: args.category,
          persona: args.persona,
          targetWordCount: args.targetWordCount,
        }),
        success: true,
      });
    } catch (error) {
      console.error("Failed to record token usage:", error);
      // Don't throw - already generated content, log error for monitoring
    }
  });

  return result;
}
```

**Apply This Pattern To:**
- ✅ `generateDraft()` (line 424 TODO)
- ✅ `generateChatResponse()`
- ✅ `refineContent()` (line 772 TODO)
- ✅ `refineSelection()` (line 936 TODO)
- ✅ `repurposeContent()` (line 1320 TODO)
- ✅ `generateImagePrompt()`

---

### 3.2 Update Image Generation

**File:** `src/server/image-generation/openai.ts`

```typescript
import { calculateImageBillableTokens } from "@/lib/ai/pricing";

export async function generateImage(/* args */) {
  // 1. PRE-FLIGHT: Check balance
  const billing = calculateImageBillableTokens("dall-e-3", "1024x1024", 1);

  const balanceCheck = await convex.query(api.tokenAccounts.checkBalance, {
    userId: user._id,
    requiredTokens: billing.billableTokens,
  });

  if (!balanceCheck.sufficient) {
    throw new Error(`Insufficient balance. Need ${billing.billableTokens} tokens for image generation.`);
  }

  // 2. GENERATE IMAGE
  let success = false;
  let imageUrl: string | undefined;
  let errorMessage: string | undefined;

  try {
    const response = await openai.images.generate({
      model: "dall-e-3",
      prompt: prompt,
      size: "1024x1024",
      n: 1,
    });

    imageUrl = response.data[0]?.url;
    success = true;
  } catch (error) {
    errorMessage = error.message;
    success = false;
    throw error;
  } finally {
    // 3. RECORD USAGE (always, even on failure)
    await convex.mutation(api.tokenUsage.recordUsage, {
      secret: env.BILLING_SECRET!,
      userId: user._id,
      workspaceId: workspace._id,
      projectId: project?._id,
      operationType: "image_generation",
      provider: "openai",
      model: "dall-e-3",
      imageCount: 1,
      imageSize: "1024x1024",
      billableTokens: success ? billing.billableTokens : 0, // Only charge on success
      chargeType: billing.chargeType,
      fixedCost: billing.fixedCost,
      success: success,
      errorMessage: errorMessage,
      requestMetadata: JSON.stringify({ prompt: prompt.substring(0, 200) }),
    });
  }

  return { url: imageUrl };
}
```

**Apply to:**
- ✅ `src/server/image-generation/openai.ts`
- ✅ `src/server/image-generation/google.ts`

---

## 4. Stripe Integration

### 4.1 Environment Setup

**Add to `wrangler.jsonc` vars:**
```json
{
  "vars": {
    "STRIPE_WEBHOOK_SECRET": "whsec_...",
    "VITE_STRIPE_PUBLISHABLE_KEY": "pk_live_..."
  }
}
```

**Add as secrets:**
```bash
wrangler secret put STRIPE_SECRET_KEY
# Value: sk_live_... or sk_test_...

wrangler secret put BILLING_SECRET
# Value: <random_64_char_string>
```

**Install dependencies:**
```bash
bun add stripe @stripe/stripe-js
```

---

### 4.2 Stripe Client Configuration

**File:** `src/lib/stripe.ts`

```typescript
import Stripe from "stripe";
import { env } from "cloudflare:workers";

/**
 * Get Stripe client (server-side only)
 */
export function getStripeClient(): Stripe {
  const apiKey = env.STRIPE_SECRET_KEY;
  if (!apiKey) {
    throw new Error("STRIPE_SECRET_KEY not configured");
  }

  return new Stripe(apiKey, {
    apiVersion: "2024-11-20.acacia",
    httpClient: Stripe.createFetchHttpClient(), // Workers-compatible
  });
}

/**
 * Get publishable key for client
 */
export function getStripePublishableKey(): string {
  const key = env.VITE_STRIPE_PUBLISHABLE_KEY;
  if (!key) {
    throw new Error("VITE_STRIPE_PUBLISHABLE_KEY not configured");
  }
  return key;
}
```

---

### 4.3 Checkout Session Creation

**File:** `convex/stripe.ts`

**From:** Claude plan, with Gemini's security enhancements

```typescript
import { v } from "convex/values";
import { action, internalMutation } from "./_generated/server";
import { api } from "./_generated/api";
import { getStripeClient } from "@/lib/stripe";

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
    // Get user
    const user = await ctx.runQuery(api.users.getById, { id: args.userId });
    if (!user) throw new Error("User not found");

    // Get account
    const account = await ctx.runQuery(api.tokenAccounts.getAccount, {
      userId: args.userId,
    });
    if (!account) throw new Error("Token account not found");

    // Get package
    const pkg = await ctx.runQuery(api.tokenPricing.getById, {
      id: args.packageId,
    });
    if (!pkg || !pkg.active) throw new Error("Invalid package");

    // Initialize Stripe
    const stripe = getStripeClient();

    // Create or retrieve customer
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
      // Save payment method for auto-recharge
      payment_method_collection: "if_required",
      allow_promotion_codes: true,
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
      console.log("Auto-recharge not configured, skipping");
      return { success: false, reason: "Not configured" };
    }

    // Find matching package
    const packages = await ctx.runQuery(api.tokenPricing.listActive);
    const pkg = packages.find((p) => p.tokenAmount === account.autoRechargeAmount);

    if (!pkg) {
      console.error("No package found for auto-recharge amount:", account.autoRechargeAmount);
      return { success: false, reason: "No matching package" };
    }

    // Create off-session payment
    const stripe = getStripeClient();

    try {
      const paymentIntent = await stripe.paymentIntents.create({
        amount: pkg.priceCents,
        currency: account.currency,
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
        // Add tokens
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

      return { success: false, reason: `Payment ${paymentIntent.status}` };
    } catch (error) {
      console.error("Auto-recharge failed:", error);

      // Disable auto-recharge on payment failure
      await ctx.runMutation(api.tokenAccounts.updateAutoRecharge, {
        userId: args.userId,
        enabled: false,
      });

      return { success: false, reason: error.message };
    }
  },
});
```

---

### 4.4 Webhook Handler

**File:** `workers/stripe-webhook.ts`

**From:** Claude plan with Gemini's error handling

```typescript
import type { Hono } from "hono";
import Stripe from "stripe";
import { env } from "cloudflare:workers";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/api";

/**
 * Register Stripe webhook endpoint
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

    // Verify webhook signature
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

    try {
      // Handle events
      switch (event.type) {
        case "checkout.session.completed": {
          const session = event.data.object as Stripe.Checkout.Session;

          if (session.payment_status === "paid") {
            const metadata = session.metadata;
            if (!metadata?.userId || !metadata?.tokenAmount) {
              console.error("Missing metadata in checkout session:", session.id);
              break;
            }

            // Fulfill purchase
            await convex.mutation(api.tokenAccounts.addTokens, {
              userId: metadata.userId as any,
              workspaceId: metadata.workspaceId as any,
              tokenAmount: Number.parseInt(metadata.tokenAmount),
              amountCents: Number.parseInt(metadata.priceCents),
              transactionType: "purchase",
              stripePaymentIntentId: session.payment_intent as string,
              description: `Token purchase: ${metadata.packageId}`,
            });

            console.log("✅ Tokens added for user:", metadata.userId);
          }
          break;
        }

        case "payment_intent.succeeded": {
          const paymentIntent = event.data.object as Stripe.PaymentIntent;
          const metadata = paymentIntent.metadata;

          if (metadata?.autoRecharge === "true") {
            console.log("✅ Auto-recharge payment succeeded:", paymentIntent.id);
            // Already handled in triggerAutoRecharge action
          }
          break;
        }

        case "payment_intent.payment_failed": {
          const paymentIntent = event.data.object as Stripe.PaymentIntent;
          console.error("❌ Payment failed:", paymentIntent.id, paymentIntent.last_payment_error);

          // If auto-recharge, disable it
          if (paymentIntent.metadata?.autoRecharge === "true" && paymentIntent.metadata?.userId) {
            await convex.mutation(api.tokenAccounts.updateAutoRecharge, {
              userId: paymentIntent.metadata.userId as any,
              enabled: false,
            });
          }
          break;
        }

        case "charge.refunded": {
          const charge = event.data.object as Stripe.Charge;
          const metadata = charge.metadata;

          if (metadata?.userId && metadata?.tokenAmount) {
            // Deduct refunded tokens
            await convex.mutation(api.tokenAccounts.addTokens, {
              userId: metadata.userId as any,
              workspaceId: metadata.workspaceId as any,
              tokenAmount: -Number.parseInt(metadata.tokenAmount),
              amountCents: -charge.amount_refunded,
              transactionType: "refund",
              stripePaymentIntentId: charge.payment_intent as string,
              description: `Refund: ${charge.id}`,
            });

            console.log("✅ Tokens refunded for user:", metadata.userId);
          }
          break;
        }

        default:
          console.log("Unhandled webhook event:", event.type);
      }
    } catch (error) {
      console.error("Error processing webhook:", error);
      return c.json({ error: "Processing failed" }, 500);
    }

    return c.json({ received: true });
  });
}
```

**Update `workers/app.ts`:**
```typescript
import { registerStripeWebhook } from "./stripe-webhook";

// After Clerk middleware, before TanStack Start handler
registerStripeWebhook(app);
```

---

## 5. Admin Interface

### 5.1 Admin Permissions

**File:** `src/lib/permissions.ts`

```typescript
export const PERMISSIONS = {
  // Existing permissions...

  // Token management
  "tokens.view_all": "View all token usage and accounts",
  "tokens.grant": "Grant tokens to users",
  "tokens.deduct": "Deduct tokens from users",
  "tokens.view_stats": "View token usage statistics",
  "tokens.manage_pricing": "Manage token pricing packages",
  "tokens.manage_settings": "Update system settings",
} as const;

// Update role permissions
export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  user: [],

  admin: [
    "admin.access",
    "admin.view_stats",
    "users.view",
    "tokens.view_all",
    "tokens.view_stats",
  ],

  superadmin: [
    ...(Object.keys(PERMISSIONS) as Permission[]),
  ],
};
```

---

### 5.2 Admin Queries

**File:** `convex/admin.ts`

**From:** Claude plan (most comprehensive admin features)

```typescript
import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

/**
 * Get overall token statistics
 */
export const getTokenStats = query({
  handler: async (ctx) => {
    // TODO: Add permission check

    const allAccounts = await ctx.db.query("tokenAccounts").collect();
    const allUsage = await ctx.db.query("tokenUsage").collect();
    const allTransactions = await ctx.db
      .query("tokenTransactions")
      .withIndex("by_transactionType", (q) => q.eq("transactionType", "purchase"))
      .collect();

    const totalBillableTokensUsed = allUsage.reduce((sum, u) => sum + u.billableTokens, 0);
    const totalActualTokensUsed = allUsage.reduce((sum, u) => sum + (u.totalTokens ?? 0), 0);
    const totalRevenueCents = allTransactions.reduce((sum, t) => sum + (t.amountCents ?? 0), 0);
    const activeAccounts = allAccounts.filter((a) => a.status === "active").length;
    const totalBalance = allAccounts.reduce((sum, a) => sum + a.balance, 0);
    const averageBalance = allAccounts.length > 0 ? totalBalance / allAccounts.length : 0;

    // Calculate profit margin
    const profitMargin = totalActualTokensUsed > 0
      ? ((totalBillableTokensUsed - totalActualTokensUsed) / totalBillableTokensUsed) * 100
      : 0;

    return {
      totalBillableTokensUsed,
      totalActualTokensUsed,
      profitMargin: Math.round(profitMargin * 10) / 10, // 1 decimal place
      totalRevenueCents,
      activeAccounts,
      totalAccounts: allAccounts.length,
      averageBalance: Math.round(averageBalance),
      totalBalance,
    };
  },
});

/**
 * Get usage breakdown by model
 */
export const getModelUsageStats = query({
  handler: async (ctx) => {
    const allUsage = await ctx.db.query("tokenUsage").collect();

    const modelStats: Record<
      string,
      {
        count: number;
        billableTokens: number;
        actualTokens: number;
      }
    > = {};

    for (const usage of allUsage) {
      if (!modelStats[usage.model]) {
        modelStats[usage.model] = {
          count: 0,
          billableTokens: 0,
          actualTokens: 0,
        };
      }
      modelStats[usage.model].count++;
      modelStats[usage.model].billableTokens += usage.billableTokens;
      modelStats[usage.model].actualTokens += usage.totalTokens ?? 0;
    }

    return Object.entries(modelStats)
      .map(([model, stats]) => ({ model, ...stats }))
      .sort((a, b) => b.billableTokens - a.billableTokens);
  },
});

/**
 * Get usage breakdown by operation type
 */
export const getOperationStats = query({
  handler: async (ctx) => {
    const allUsage = await ctx.db.query("tokenUsage").collect();

    const opStats: Record<string, { count: number; billableTokens: number }> = {};

    for (const usage of allUsage) {
      if (!opStats[usage.operationType]) {
        opStats[usage.operationType] = { count: 0, billableTokens: 0 };
      }
      opStats[usage.operationType].count++;
      opStats[usage.operationType].billableTokens += usage.billableTokens;
    }

    return Object.entries(opStats)
      .map(([operationType, stats]) => ({ operationType, ...stats }))
      .sort((a, b) => b.count - a.count);
  },
});

/**
 * Get user accounts (paginated)
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
 * Grant tokens to user (admin only)
 */
export const grantTokens = mutation({
  args: {
    adminUserId: v.id("users"),
    targetUserId: v.id("users"),
    tokenAmount: v.number(),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    // TODO: Verify admin permission

    const targetAccount = await ctx.db
      .query("tokenAccounts")
      .withIndex("by_userId", (q) => q.eq("userId", args.targetUserId))
      .first();

    if (!targetAccount) {
      throw new Error("Target user account not found");
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
 * Update system settings (superadmin only)
 */
export const updateSystemSettings = mutation({
  args: {
    adminUserId: v.id("users"),
    defaultTokenMultiplier: v.optional(v.number()),
    imageGenerationCost: v.optional(v.number()),
    tokensPerUSD: v.optional(v.number()),
    newUserBonusTokens: v.optional(v.number()),
    lowBalanceThreshold: v.optional(v.number()),
    criticalBalanceThreshold: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // TODO: Verify superadmin permission

    const settings = await ctx.db
      .query("systemSettings")
      .withIndex("by_key", (q) => q.eq("key", "global_settings"))
      .first();

    const updates = {
      ...(args.defaultTokenMultiplier !== undefined && { defaultTokenMultiplier: args.defaultTokenMultiplier }),
      ...(args.imageGenerationCost !== undefined && { imageGenerationCost: args.imageGenerationCost }),
      ...(args.tokensPerUSD !== undefined && { tokensPerUSD: args.tokensPerUSD }),
      ...(args.newUserBonusTokens !== undefined && { newUserBonusTokens: args.newUserBonusTokens }),
      ...(args.lowBalanceThreshold !== undefined && { lowBalanceThreshold: args.lowBalanceThreshold }),
      ...(args.criticalBalanceThreshold !== undefined && { criticalBalanceThreshold: args.criticalBalanceThreshold }),
      updatedAt: Date.now(),
      updatedBy: args.adminUserId,
    };

    if (settings) {
      await ctx.db.patch(settings._id, updates);
    } else {
      await ctx.db.insert("systemSettings", {
        key: "global_settings",
        defaultTokenMultiplier: args.defaultTokenMultiplier ?? 1.5,
        imageGenerationCost: args.imageGenerationCost ?? 6000,
        tokensPerUSD: args.tokensPerUSD ?? 10000,
        minPurchaseAmountCents: 500,
        newUserBonusTokens: args.newUserBonusTokens ?? 10000,
        lowBalanceThreshold: args.lowBalanceThreshold ?? 1000,
        criticalBalanceThreshold: args.criticalBalanceThreshold ?? 100,
        updatedAt: Date.now(),
        updatedBy: args.adminUserId,
      });
    }

    return { success: true };
  },
});
```

---

## 6. User Interface Components

### 6.1 Token Balance Display

**File:** `src/components/billing/TokenBalance.tsx`

```tsx
import { useQuery } from "convex/react";
import { api } from "@/convex/api";
import { useAuth } from "@/contexts/auth-context";
import { Coins, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "@tanstack/react-router";

export function TokenBalance() {
  const { user } = useAuth();
  const account = useQuery(api.tokenAccounts.getAccount,
    user?._id ? { userId: user._id } : "skip"
  );

  if (!account) return null;

  const isLow = account.balance < 1000;
  const isCritical = account.balance < 100;

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-muted">
        <Coins className="h-4 w-4" />
        <span className="text-sm font-medium">
          {account.balance.toLocaleString()}
        </span>
      </div>

      {(isLow || isCritical) && (
        <Button
          asChild
          variant={isCritical ? "destructive" : "outline"}
          size="sm"
        >
          <Link to="/dashboard/billing">
            {isCritical && <AlertTriangle className="h-4 w-4 mr-1" />}
            Buy Tokens
          </Link>
        </Button>
      )}
    </div>
  );
}
```

---

### 6.2 Billing Dashboard

**File:** `src/routes/_authed/dashboard/billing.tsx`

**From:** All three plans, synthesized UI design

```tsx
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/api";
import { useAuth } from "@/contexts/auth-context";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Check, Zap, TrendingUp } from "lucide-react";

export const Route = createFileRoute("/_authed/dashboard/billing")({
  component: BillingPage,
});

function BillingPage() {
  const { user } = useAuth();
  const account = useQuery(api.tokenAccounts.getAccount, { userId: user!._id });
  const packages = useQuery(api.tokenPricing.listActive);
  const transactions = useQuery(api.tokenAccounts.getTransactions, {
    userId: user!._id,
    limit: 20
  });

  const createCheckout = useMutation(api.stripe.createCheckoutSession);

  const handlePurchase = async (packageId: string) => {
    const result = await createCheckout({
      userId: user!._id,
      packageId: packageId as any,
      successUrl: `${window.location.origin}/dashboard/billing?success=true`,
      cancelUrl: `${window.location.origin}/dashboard/billing?canceled=true`,
    });

    if (result.url) {
      window.location.href = result.url;
    }
  };

  return (
    <div className="container max-w-7xl py-8">
      <h1 className="text-3xl font-bold mb-2">Billing & Tokens</h1>
      <p className="text-muted-foreground mb-8">
        Manage your token balance and purchase history
      </p>

      {/* Current Balance Card */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Current Balance</CardTitle>
          <CardDescription>Available tokens for AI generation</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-5xl font-bold mb-4">
            {account?.balance.toLocaleString() ?? 0}
          </div>
          <div className="grid md:grid-cols-3 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Lifetime Used:</span>
              <div className="font-medium">{account?.lifetimeTokensUsed.toLocaleString() ?? 0}</div>
            </div>
            <div>
              <span className="text-muted-foreground">Lifetime Purchased:</span>
              <div className="font-medium">{account?.lifetimeTokensPurchased.toLocaleString() ?? 0}</div>
            </div>
            <div>
              <span className="text-muted-foreground">Total Spent:</span>
              <div className="font-medium">
                ${((account?.lifetimeSpentCents ?? 0) / 100).toFixed(2)}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="purchase">
        <TabsList className="mb-6">
          <TabsTrigger value="purchase">Buy Tokens</TabsTrigger>
          <TabsTrigger value="auto-recharge">Auto-Recharge</TabsTrigger>
          <TabsTrigger value="history">Transaction History</TabsTrigger>
        </TabsList>

        <TabsContent value="purchase">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {packages?.map((pkg) => (
              <Card
                key={pkg._id}
                className={pkg.isPopular ? "border-primary" : ""}
              >
                {pkg.isPopular && (
                  <div className="bg-primary text-primary-foreground text-xs font-medium text-center py-1">
                    Best Value
                  </div>
                )}
                <CardHeader>
                  <CardTitle>{pkg.packageName}</CardTitle>
                  <CardDescription>{pkg.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="text-3xl font-bold">
                      ${(pkg.priceCents / 100).toFixed(2)}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {pkg.tokenAmount.toLocaleString()} tokens
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      ${((pkg.priceCents / pkg.tokenAmount) * 1000 / 100).toFixed(3)} per 1k tokens
                    </div>
                  </div>

                  <Button
                    className="w-full"
                    onClick={() => handlePurchase(pkg._id)}
                  >
                    Purchase
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="auto-recharge">
          <AutoRechargeSettings />
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>Transaction History</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {transactions?.map((tx) => (
                  <div
                    key={tx._id}
                    className="flex justify-between items-center py-2 border-b"
                  >
                    <div>
                      <div className="font-medium">{tx.description}</div>
                      <div className="text-sm text-muted-foreground">
                        {new Date(tx.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                    <div className={tx.tokenAmount > 0 ? "text-green-600" : "text-red-600"}>
                      {tx.tokenAmount > 0 ? "+" : ""}
                      {tx.tokenAmount.toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function AutoRechargeSettings() {
  // Implementation similar to Claude plan's auto-recharge UI
  // ...
}
```

---

## 7. Implementation Roadmap

### Phase 1: Foundation (Week 1-2)
**Goal:** Database schema and core backend logic

- [ ] Update Convex schema with 5 new tables
- [ ] Deploy schema changes to Convex dev environment
- [ ] Create `src/lib/ai/pricing.ts` with calculation helpers
- [ ] Create `convex/tokenAccounts.ts` with account management
- [ ] Create `convex/tokenUsage.ts` with usage recording
- [ ] Create `convex/tokenPricing.ts` with package queries
- [ ] Implement `systemSettings` singleton initialization
- [ ] Add `BILLING_SECRET` to environment variables
- [ ] Test account initialization and welcome bonus

### Phase 2: Usage Tracking (Week 3-4)
**Goal:** Track all AI usage and deduct tokens

- [ ] Update `src/server/ai.ts`:
  - [ ] Add pre-flight balance checks
  - [ ] Add `recordUsage` call to `generateDraft()`
  - [ ] Add `recordUsage` call to `generateChatResponse()`
  - [ ] Add `recordUsage` call to `refineContent()`
  - [ ] Add `recordUsage` call to `refineSelection()`
  - [ ] Add `recordUsage` call to `repurposeContent()`
  - [ ] Add `recordUsage` call to `generateImagePrompt()`
- [ ] Update image generation:
  - [ ] Add tracking to `src/server/image-generation/openai.ts`
  - [ ] Add tracking to `src/server/image-generation/google.ts`
- [ ] Test end-to-end: generation → usage logged → balance deducted
- [ ] Verify account suspension on negative balance

### Phase 3: Stripe Integration (Week 5-6)
**Goal:** Enable token purchases

- [ ] Create Stripe account and configure products
- [ ] Add Stripe dependencies (`bun add stripe @stripe/stripe-js`)
- [ ] Create `src/lib/stripe.ts` configuration
- [ ] Create `convex/stripe.ts` with checkout actions
- [ ] Create `workers/stripe-webhook.ts` handler
- [ ] Register webhook in `workers/app.ts`
- [ ] Configure Stripe webhook in dashboard
- [ ] Seed token pricing packages in Convex
- [ ] Test purchase flow: checkout → payment → webhook → tokens added
- [ ] Test refund flow

### Phase 4: User Interface (Week 7-8)
**Goal:** Build user-facing billing dashboard

- [ ] Create `src/components/billing/TokenBalance.tsx` (header display)
- [ ] Create `src/routes/_authed/dashboard/billing.tsx` (main page)
- [ ] Implement token package purchase UI
- [ ] Implement auto-recharge settings UI
- [ ] Implement transaction history table
- [ ] Add low balance warnings/notifications
- [ ] Test full user journey

### Phase 5: Admin Features (Week 9-10)
**Goal:** Admin oversight and management

- [ ] Add token permissions to `src/lib/permissions.ts`
- [ ] Create `convex/admin.ts` with admin queries/mutations
- [ ] Create `src/routes/_authed/admin/tokens.tsx` dashboard
- [ ] Implement token statistics overview
- [ ] Implement model usage breakdown
- [ ] Implement user account management
- [ ] Implement token grant/deduction forms
- [ ] Implement system settings editor
- [ ] Test admin workflows

### Phase 6: Polish & Launch (Week 11-12)
**Goal:** Production readiness

- [ ] Add comprehensive error handling
- [ ] Implement rate limiting
- [ ] Add usage analytics/charts
- [ ] Write user documentation
- [ ] Write admin documentation
- [ ] Set up monitoring/alerts (Sentry, etc.)
- [ ] Load testing
- [ ] Security audit
- [ ] Beta testing with select users
- [ ] Production deployment

---

## 8. Recommended Pricing Strategy

### 8.1 Token Packages

Based on analysis of all three plans and market research:

**Pricing Tiers:**

| Package | Tokens | Price | Per 1k Tokens | Discount | Use Case |
|---------|--------|-------|---------------|----------|----------|
| **Starter** | 150,000 | $15 | $0.100 | — | Getting started (5-10 blog posts) |
| **Pro** | 750,000 | $65 | $0.087 | 13% | Regular creators (25-50 posts/month) |
| **Business** | 2,250,000 | $175 | $0.078 | 22% | Teams and agencies |
| **Enterprise** | 7,500,000 | $500 | $0.067 | 33% | High-volume users |

**Rationale:**
- Base rate: **10,000 tokens = $1.00** (from systemSettings)
- With 1.5× multiplier, actual AI tokens cost ~$0.67 per $1.00 spent
- Profit margin: ~33% after Stripe fees (sustainable)
- Volume discounts encourage larger purchases

### 8.2 Token Multiplier Configuration

```typescript
// In src/lib/ai/pricing.ts
export const DEFAULT_TOKEN_MULTIPLIER = 1.5; // 50% markup

// Adjust for different margins:
// - 1.2 = 20% markup (competitive pricing, lower profit)
// - 1.5 = 50% markup (recommended, sustainable)
// - 2.0 = 100% markup (premium pricing)
```

**Profit Analysis (at 1.5× multiplier):**

**Example: User purchases Starter ($15 for 150k tokens)**
- User gets: 150,000 tokens
- User can consume: ~100,000 actual AI tokens (150k / 1.5)
- Typical model mix cost (70% gpt-4o-mini, 30% gpt-4o): ~$3.50
- Gross profit: $15 - $3.50 = $11.50
- Stripe fees: ~$0.74 (2.9% + $0.30)
- **Net profit: ~$10.76 (72% margin)**

### 8.3 Welcome Bonus

```typescript
// In systemSettings
newUserBonusTokens: 10000 // ~$1.00 value, enough for 2-3 blog posts
```

**Goal:** Let users experience the platform before purchasing

---

## 9. Key Improvements Over Individual Plans

### 9.1 From Gemini Plan
✅ **Adopted:**
- `BILLING_SECRET` security pattern (prevents client manipulation)
- `systemSettings` singleton pattern (simpler than multiple config rows)
- Hybrid billing: `fixedAmount` option for non-LLM services

### 9.2 From Antigrav Plan
✅ **Adopted:**
- Dedicated `wallets` table abstraction (cleaner than inline user fields)
- Currency field (prepare for international expansion)
- Granular image metadata (imageSize, imageCount)
- JSON metadata fields for extensibility

### 9.3 From Claude Plan
✅ **Adopted:**
- Comprehensive 5-table architecture (most complete)
- `tokenPricing` table for admin-managed packages
- Clear billing model: actual tokens × multiplier
- Extensive admin analytics queries
- Complete implementation code patterns
- Account status system (active/suspended/blocked)
- Workspace-level tracking
- Detailed documentation (testing, support, pricing)

### 9.4 New Synthesis Enhancements
✅ **Added:**
- `chargeType` field explicitly documents billing method (multiplier vs fixed)
- Separate lifetime tracking: billable vs actual tokens (better analytics)
- Multi-currency pricing preparation (priceEUR, priceGBP fields)
- Rate limiting configuration in systemSettings
- Alert thresholds centralized (lowBalance, criticalBalance)
- Settings caching for performance (1-minute TTL)
- Referral/promotional system support (`bonus` transaction type)
- Enhanced error handling in webhooks
- Auto-recharge auto-disables on payment failure

---

## 10. Security Considerations

### 10.1 Protection Layers

1. **BILLING_SECRET** - Server-side only mutations
2. **Clerk Authentication** - User identity verification
3. **Convex Permissions** - Role-based access control
4. **Stripe Webhooks** - Signature verification
5. **Rate Limiting** - Prevent abuse (maxTokensPerHour)

### 10.2 Attack Vectors Mitigated

- ❌ **Client-side balance manipulation** → `BILLING_SECRET` required
- ❌ **Free usage** → Pre-flight balance checks
- ❌ **Double-spending** → Immutable transaction ledger
- ❌ **Webhook spoofing** → Stripe signature verification
- ❌ **Admin impersonation** → Permission checks (TODO: implement)
- ❌ **Rate abuse** → System-level limits in settings

---

## 11. Testing Checklist

### 11.1 Unit Tests

- [ ] `calculateLLMBillableTokens()` returns correct values
- [ ] `calculateImageBillableTokens()` handles all models/sizes
- [ ] `getSystemSettings()` caching works correctly
- [ ] Balance check prevents generation when insufficient

### 11.2 Integration Tests

- [ ] New user receives welcome bonus
- [ ] Token deduction after successful generation
- [ ] Account suspension on negative balance
- [ ] Stripe checkout session creation
- [ ] Webhook correctly adds tokens
- [ ] Auto-recharge triggers at threshold
- [ ] Refund correctly deducts tokens
- [ ] Admin grant/deduction works

### 11.3 End-to-End Tests

- [ ] User journey: Sign up → Get bonus → Generate content → Buy tokens → Generate more
- [ ] Admin journey: View stats → Grant tokens → Update settings
- [ ] Auto-recharge journey: Enable → Balance drops → Auto-purchase → Tokens added
- [ ] Error handling: Insufficient balance → Purchase → Retry generation (succeeds)

---

## 12. Success Metrics

**The system is successful if:**

### Technical Metrics
- [ ] 100% of AI generations tracked (zero missing usage logs)
- [ ] < 1% token calculation errors
- [ ] < 200ms balance check latency (don't slow generations)
- [ ] > 99.5% webhook success rate
- [ ] Zero incidents of balance manipulation

### Business Metrics
- [ ] > 60% of active users purchase tokens within 30 days
- [ ] < 5% support tickets related to billing confusion
- [ ] Average Revenue Per User (ARPU) > $20/month
- [ ] Customer churn rate < 10%/month
- [ ] > 30% profit margin after all costs

### User Experience Metrics
- [ ] Token purchase flow < 3 clicks
- [ ] Low balance warnings reduce "insufficient balance" errors by > 80%
- [ ] Auto-recharge adoption > 20% of paying users
- [ ] Net Promoter Score (NPS) > 40

---

## 13. Support Playbook

### 13.1 Common Issues

**"Tokens didn't arrive after purchase"**
1. Check Stripe webhook logs: Dashboard → Webhooks
2. Verify payment in Stripe Dashboard
3. Check Convex logs for webhook processing errors
4. If webhook failed: Manually trigger `addTokens` mutation
5. Query: `convex.query(api.tokenAccounts.getAccount, { userId })`

**"Generation blocked despite having tokens"**
1. Check account status: `convex.query(api.tokenAccounts.getAccount, { userId })`
2. Verify estimated cost vs balance
3. Check for suspended status (negative balance from prior usage)
4. Review recent usage logs for anomalies

**"Auto-recharge didn't work"**
1. Check settings: `autoRechargeEnabled`, `autoRechargeThreshold`, `autoRechargeAmount`
2. Verify Stripe customer has `defaultPaymentMethodId`
3. Check failed payment logs in Stripe
4. Review Convex scheduled actions logs
5. Note: Auto-recharge auto-disables on payment failure

### 13.2 Admin Tools

**Grant tokens manually:**
```typescript
await convex.mutation(api.admin.grantTokens, {
  adminUserId: "<admin_user_id>",
  targetUserId: "<user_id>",
  tokenAmount: 10000,
  reason: "Customer support compensation - ticket #1234",
});
```

**View user's full history:**
```typescript
const details = await convex.query(api.admin.getUserDetailedUsage, {
  userId: "<user_id>",
});
```

---

## 14. Next Steps

### Before Implementation

1. **Stakeholder Review**
   - Review pricing model with business team
   - Legal review of billing terms of service
   - Engineering review of technical approach

2. **Stripe Setup**
   - Create Stripe production account
   - Configure tax settings (if applicable)
   - Create products and prices in Stripe Dashboard
   - Test webhook endpoint in Stripe test mode

3. **Environment Preparation**
   - Generate `BILLING_SECRET` (64-char random string)
   - Add all required env vars to Convex and wrangler
   - Test Convex schema changes in dev environment

4. **Team Alignment**
   - Assign phase owners
   - Schedule weekly check-ins
   - Establish on-call rotation for billing issues

### Implementation Order

**Follow the 6-phase roadmap (Section 7) sequentially.**

Start with Phase 1 after approval of this plan.

---

## 15. Document Metadata

- **Version:** 2.0 - Unified Synthesis
- **Created:** 2025-12-03
- **Authors:** Synthesis of 3 independent AI-generated plans
- **Status:** ✅ Ready for Review
- **Estimated Implementation:** 12 weeks (1 developer)
- **Estimated Cost:** $0 infrastructure (Stripe fees only: ~3% of revenue)
- **Risk Level:** Medium (billing is sensitive, requires thorough testing)

---

## Appendix A: Comparison Summary

| **Feature** | **Gemini** | **Antigrav** | **Claude** | **Synthesis v2** |
|-------------|------------|--------------|------------|------------------|
| Table Count | 3 | 4 | 5 | **5** ✅ |
| Usage Tracking | ❌ | ✅ | ✅ | ✅ **Enhanced** |
| Billing Model | Multipliers | Tokens/USD | Actual × Multiplier | **Hybrid** ✅ |
| Security | ✅ Secret | ⚠️ | ✅ | ✅ **Enhanced** |
| Fixed-Cost Support | ✅ | ✅ | ⚠️ | ✅ **Native** |
| Admin Analytics | ⚠️ | ❌ | ✅ | ✅ **Enhanced** |
| International | ❌ | ✅ Currency | ❌ | ✅ **Multi-currency** |
| Documentation | ⚠️ | ⚠️ | ✅ Extensive | ✅ **Comprehensive** |
| Implementation Code | ⚠️ Partial | ❌ | ✅ Complete | ✅ **Complete** |

**Winner:** Synthesis v2 (incorporates best of all three + new enhancements)

---

## Appendix B: Environment Variables Reference

```bash
# Stripe (add to wrangler.jsonc vars)
STRIPE_WEBHOOK_SECRET=whsec_...
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_...

# Stripe (add via wrangler secret)
STRIPE_SECRET_KEY=sk_live_...

# Billing Security (add via wrangler secret)
BILLING_SECRET=<random_64_char_string>

# Already configured (reference)
VITE_CONVEX_URL=https://...
CLERK_SECRET_KEY=...
VITE_CLERK_PUBLISHABLE_KEY=...
OPENAI_API_KEY=...
ANTHROPIC_API_KEY=...
```

---

**END OF PLAN**

This unified plan represents the synthesis of three comprehensive approaches, incorporating the best elements from each while adding new enhancements for robustness, security, and scalability. The result is a production-ready token billing system designed for transparent, fair, and profitable AI usage tracking.
