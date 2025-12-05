# Unified Credit System - Implementation Plan

**Status:** Planning Phase
**Created:** 2025-12-03
**Based on:** Synthesis of Claude, Gemini, and Antigravity plans.

---

## 1. Executive Summary

We will implement a **Credit-based** billing system. Users purchase "Credits" (an abstract internal currency) which are then spent on AI features. This decouples our billing from the raw technical details of "tokens" (which can be confusing to users) and allows us to price different actions (text vs. images) consistently.

**Key Concepts:**
*   **Credits**: The user-facing currency (e.g., "1,000 Credits").
*   **Exchange Rate**: How many Credits $1 buys (e.g., $1 = 10,000 Credits).
*   **Multipliers**: How we convert raw LLM usage into Credit costs (e.g., 1 Input Token = 1 Credit, 1 Output Token = 3 Credits).

---

## 2. Database Schema (Convex)

We will adopt a clean separation of concerns by using a dedicated `wallets` table instead of polluting the `users` table.

### 2.1 `wallets`
Stores the user's current balance and billing settings.

```typescript
wallets: defineTable({
  userId: v.id("users"),
  workspaceId: v.id("workspaces"),
  
  // Balance
  balance: v.number(), // Current available CREDITS
  
  // Stripe Integration
  stripeCustomerId: v.optional(v.string()),
  stripeDefaultPaymentMethodId: v.optional(v.string()),
  
  // Auto-Recharge
  autoRechargeEnabled: v.boolean(),
  autoRechargeThreshold: v.optional(v.number()), // Trigger when balance < X Credits
  autoRechargeAmount: v.optional(v.number()),    // Buy Y Credits
  
  // Stats
  lifetimeCreditsPurchased: v.number(),
  lifetimeCreditsUsed: v.number(),
  
  updatedAt: v.number(),
})
.index("by_userId", ["userId"])
.index("by_workspaceId", ["workspaceId"]);
```

### 2.2 `creditUsage`
A detailed log of *every* AI operation for auditing and analytics.

```typescript
creditUsage: defineTable({
  userId: v.id("users"),
  walletId: v.id("wallets"),
  projectId: v.optional(v.id("projects")),
  
  // Context
  action: v.union(
    v.literal("generate_draft"),
    v.literal("chat"),
    v.literal("refine"),
    v.literal("repurpose"),
    v.literal("image_generation")
  ),
  provider: v.string(), // "openai", "anthropic", "google"
  model: v.string(),    // "gpt-4o", "claude-3-5-sonnet"
  
  // Raw Usage Stats
  inputTokens: v.optional(v.number()),
  outputTokens: v.optional(v.number()),
  imageCount: v.optional(v.number()),
  
  // Cost Calculation
  costInCredits: v.number(),
  
  // Metadata (for analytics)
  metadata: v.optional(v.string()), // JSON: { promptLength, personaId, etc. }
  
  timestamp: v.number(),
})
.index("by_walletId", ["walletId"])
.index("by_userId", ["userId"])
.index("by_timestamp", ["timestamp"]);
```

### 2.3 `creditTransactions`
The financial ledger. **Source of truth** for balance changes.

```typescript
creditTransactions: defineTable({
  walletId: v.id("wallets"),
  userId: v.id("users"),
  
  type: v.union(
    v.literal("purchase"),      // Bought via Stripe
    v.literal("usage"),         // Spent on AI
    v.literal("admin_grant"),   // Gifted by admin
    v.literal("admin_revoke"),  // Removed by admin
    v.literal("bonus"),         // Sign-up bonus
    v.literal("refund")         // Stripe refund
  ),
  
  amount: v.number(), // Positive (credit) or Negative (debit)
  balanceBefore: v.number(),
  balanceAfter: v.number(),
  
  // References
  usageId: v.optional(v.id("creditUsage")),
  stripePaymentIntentId: v.optional(v.string()),
  
  description: v.string(),
  timestamp: v.number(),
})
.index("by_walletId", ["walletId"])
.index("by_type", ["type"]);
```

### 2.4 `systemConfig` (Singleton)
Global configuration for pricing. Allows dynamic adjustments without code deploys.

```typescript
systemConfig: defineTable({
  key: v.string(), // "global_pricing"
  
  // Multipliers (Credits per Token)
  defaultInputMultiplier: v.number(),  // e.g., 1.5
  defaultOutputMultiplier: v.number(), // e.g., 2.0
  
  // Image Costs (Fixed Credits)
  imageGenerationCost: v.number(),     // e.g., 5000
  
  // Exchange Rate
  creditsPerUSD: v.number(),           // e.g., 10,000
  
  updatedAt: v.number(),
}).index("by_key", ["key"]);
```

### 2.5 `creditPackages`
Pre-defined packages for the UI.

```typescript
creditPackages: defineTable({
  name: v.string(),        // "Starter Pack"
  credits: v.number(),     // 100,000
  priceCents: v.number(),  // 1000 ($10.00)
  stripePriceId: v.string(),
  isPopular: v.boolean(),
  active: v.boolean(),
});
```

---

## 3. Core Logic & Architecture

### 3.1 The "Cost Calculator" (`src/lib/billing.ts`)
A shared helper to calculate costs consistently.

```typescript
export function calculateCost(
  usage: { input?: number, output?: number, images?: number },
  config: SystemConfig
): number {
  let cost = 0;
  if (usage.input) cost += Math.ceil(usage.input * config.defaultInputMultiplier);
  if (usage.output) cost += Math.ceil(usage.output * config.defaultOutputMultiplier);
  if (usage.images) cost += usage.images * config.imageGenerationCost;
  return cost;
}
```

### 3.2 Pre-Flight Check (Middleware)
Before *any* AI call, we check if the user has enough credits.

1.  **Estimate**: Frontend or Backend estimates usage (e.g., "Draft = ~2000 tokens").
2.  **Check**: Call `api.billing.checkBalance({ userId, estimatedCost })`.
3.  **Result**: If `allowed: false`, block the request with a "Low Balance" error.

### 3.3 Post-Flight Charge (Mutation)
After the AI responds, we record the *actual* usage.

1.  **AI Response**: Get `usage.inputTokens` and `usage.outputTokens` from SDK.
2.  **Charge**: Call `api.billing.chargeUsage`.
    *   Calculates final cost.
    *   Deducts from `wallets.balance`.
    *   Inserts `creditUsage` log.
    *   Inserts `creditTransactions` record.
    *   **Auto-Recharge Trigger**: If `balance < threshold`, schedule a background job to charge Stripe.

---

## 4. Implementation Steps

### Phase 1: Foundation (Schema & Logic)
1.  **Update Schema**: Add the 5 new tables to `convex/schema.ts`.
2.  **Init Config**: Create a migration to insert the default `systemConfig` and `creditPackages`.
3.  **Billing API**: Implement `convex/billing.ts` with:
    *   `getBalance`
    *   `checkBalance`
    *   `chargeUsage` (Critical: needs to be atomic)
    *   `grantBonus` (for new users)

### Phase 2: AI Integration
1.  **Refactor `src/server/ai.ts`**:
    *   Inject `checkBalance` before `streamText`.
    *   Call `chargeUsage` in `onFinish` callbacks.
2.  **Refactor Image Gen**:
    *   Apply similar checks to `src/server/image-generation/*.ts`.

### Phase 3: Stripe & UI
1.  **Stripe Setup**: Configure products and webhooks.
2.  **Webhook Handler**: Implement `api/webhooks/stripe` to handle `checkout.session.completed`.
3.  **Wallet UI**:
    *   Create `src/routes/_authed/settings/billing.tsx`.
    *   Show Balance, Transaction History, and "Buy Credits" cards.
4.  **Auto-Recharge**: Implement the logic to save payment methods and trigger off-session payments.

---

## 5. Security & Edge Cases
*   **Concurrency**: Convex mutations are transactional, preventing double-spending race conditions.
*   **Failed Generations**: If the AI fails, we do *not* call `chargeUsage`.
*   **Negative Balance**: Allowed temporarily if a generation exceeds the remaining balance (better UX than cutting off mid-stream), but blocks subsequent requests.
