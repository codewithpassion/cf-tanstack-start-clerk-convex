# Token System Implementation Plan (Unified)

This plan synthesizes the best elements from the **Antigrav**, **Claude**, and **Gemini** proposals. It aims for a robust, scalable, and transparent billing system that separates billing concerns from user authentication while providing dynamic pricing controls.

## 1. Comparison & Strategy

### Analysis of Approaches
*   **Schema Structure:**
    *   *Gemini* proposed adding fields directly to `users`.
    *   *Claude* & *Antigrav* proposed a separate `tokenAccounts` or `wallets` table.
    *   **Decision:** We will use a separate **`tokenAccounts`** table. This is cleaner, separates billing state from authentication profile, and allows for easier future expansion (e.g., team wallets).

*   **Usage Logging:**
    *   *Gemini* suggested logging usage metadata directly in transactions.
    *   *Claude* & *Antigrav* proposed a dedicated `tokenUsage` or `usageLogs` table.
    *   **Decision:** We will use a dedicated **`tokenUsage`** table. Transactions should be a clean financial ledger (Credits In/Out). Usage logs should be granular operational records (Prompt tokens, model used, latency, etc.) for analytics.

*   **Pricing Logic:**
    *   *Claude* suggested a single "Markup Multiplier" on total tokens.
    *   *Antigrav* & *Gemini* suggested separate multipliers for Input vs. Output tokens.
    *   **Decision:** We will use **separate Input/Output multipliers** stored in a database-backed **`systemConfig`**. This allows us to align our pricing with the underlying costs (where output is often 3x-10x more expensive) and adjust margins without code deployment.

## 2. Database Schema (`convex/schema.ts`)

### `tokenAccounts`
Stores the current balance and billing configuration for a user.
```typescript
tokenAccounts: defineTable({
  userId: v.id("users"),
  balance: v.number(), // Current available tokens
  
  // Auto-Recharge Configuration
  autoRechargeEnabled: v.boolean(),
  autoRechargeThreshold: v.optional(v.number()), // Trigger when balance < this
  autoRechargeAmount: v.optional(v.number()),    // Amount to buy
  
  // Stripe Integration
  stripeCustomerId: v.optional(v.string()),
  stripeDefaultPaymentMethodId: v.optional(v.string()), // Required for auto-recharge
  
  // Stats
  lifetimePurchased: v.number(),
  lifetimeUsed: v.number(),
  updatedAt: v.number(),
}).index("by_userId", ["userId"]),
```

### `systemConfig` (Singleton)
Global configuration for pricing and exchange rates.
```typescript
systemConfig: defineTable({
  key: v.string(), // e.g., "global_pricing"
  
  // Exchange Rate
  tokensPerUSD: v.number(), // e.g., 10,000 = $1 buys 10k tokens
  
  // Usage Multipliers (The "Markup")
  inputTokenMultiplier: v.number(),  // e.g., 1.5
  outputTokenMultiplier: v.number(), // e.g., 3.0 (Output is expensive!)
  
  // Fixed Costs
  imageGenerationCost: v.number(), // e.g., 5000 tokens per image
  
  updatedAt: v.number(),
}).index("by_key", ["key"]),
```

### `tokenUsage`
Detailed log of every AI interaction.
```typescript
tokenUsage: defineTable({
  userId: v.id("users"),
  type: v.string(), // "text_generation", "image_generation"
  provider: v.string(), // "openai", "anthropic"
  model: v.string(),    // "gpt-4o"
  
  // Usage Stats
  inputTokens: v.optional(v.number()),
  outputTokens: v.optional(v.number()),
  totalTokens: v.optional(v.number()),
  
  // Billing
  billableTokens: v.number(), // The amount actually deducted
  multiplierApplied: v.string(), // JSON string e.g. "{input: 1.5, output: 3.0}"
  
  timestamp: v.number(),
}).index("by_userId", ["userId"]),
```

### `tokenTransactions`
Financial ledger for the user.
```typescript
tokenTransactions: defineTable({
  accountId: v.id("tokenAccounts"),
  userId: v.id("users"),
  type: v.union(
    v.literal("purchase"), 
    v.literal("usage"), 
    v.literal("bonus"), 
    v.literal("admin_grant"),
    v.literal("auto_recharge")
  ),
  amount: v.number(), // Positive (credit) or Negative (debit)
  description: v.string(),
  
  // References
  tokenUsageId: v.optional(v.id("tokenUsage")),
  stripePaymentId: v.optional(v.string()),
  
  timestamp: v.number(),
}).index("by_userId", ["userId"])
  .index("by_accountId", ["accountId"]),
```

## 3. Backend Implementation (`convex/billing.ts`)

We will centralize billing logic to ensure consistency.

### Helper: `calculateCost`
*(Internal function, not mutation)*
```typescript
function calculateCost(config, input, output, isImage) {
  if (isImage) return config.imageGenerationCost;
  return Math.ceil(
    (input * config.inputTokenMultiplier) + 
    (output * config.outputTokenMultiplier)
  );
}
```

### Mutation: `chargeUsage`
Called by `src/server/ai.ts` after generation.
**Args:** `userId`, `model`, `provider`, `inputTokens`, `outputTokens`, `isImage`
1.  **Fetch Config:** Get `systemConfig`.
2.  **Calculate:** Compute `billableTokens`.
3.  **Deduct:** `account.balance -= billableTokens`. Check for negative balance (allow slightly negative? Or fail? **Decision: Fail if balance < 0 before start, allow dipping negative during stream to avoid interruption, but block next request**).
4.  **Log:** Insert `tokenUsage` and `tokenTransactions`.
5.  **Auto-Recharge:**
    *   If `autoRechargeEnabled` AND `balance < threshold`:
    *   Schedule `internal.billing.triggerAutoRecharge`.

### Action: `triggerAutoRecharge`
1.  Fetch user account & system config.
2.  Calculate USD cost: `account.autoRechargeAmount / config.tokensPerUSD`.
3.  **Stripe:** Create `PaymentIntent` (off-session) using `stripeDefaultPaymentMethodId`.
4.  **On Success:** Call `internal.billing.processPurchase`.

### Mutation: `processPurchase`
1.  Update `tokenAccounts`: `balance += amount`.
2.  Log `tokenTransactions`: Type `purchase` or `auto_recharge`.

## 4. Stripe Integration

### Webhook (`workers/app.ts`)
*   Endpoint: `POST /api/webhooks/stripe`
*   Events:
    *   `checkout.session.completed`: Handle one-time purchases.
    *   `payment_intent.succeeded`: Handle auto-recharges.
*   Logic: Verify signature -> Extract metadata (userId, amount) -> Call `processPurchase`.

### Checkout
*   Action: `createCheckoutSession(packageId)`
*   Uses Stripe Checkout to collect payment details and set up the user for future off-session payments (SetupIntent mode or saving payment method during payment).

## 5. User Interface

### Components
1.  **`TokenBalance`**: Simple badge in header.
2.  **`BillingPage`**:
    *   **Overview**: Big balance display, approx USD value.
    *   **Buy Tokens**: Cards for "Starter" (10k), "Pro" (100k), etc.
    *   **Auto-Recharge**: Toggle switch + Threshold Input + Amount Input.
    *   **History**: Table of `tokenTransactions`.
3.  **`LowBalanceAlert`**: Component shown in the Editor if balance is low.

## 6. Admin Interface

### `SettingsPage`
*   Form to edit `systemConfig`:
    *   Input/Output Multipliers.
    *   Tokens per USD.
    *   Image Cost.

### `UserDetail`
*   View `tokenUsage` logs (to debug "why did this cost so much?").
*   Button: "Grant Bonus Tokens".

## 7. Implementation Roadmap

1.  **Schema & Config:**
    *   Update `convex/schema.ts`.
    *   Create `convex/billing.ts` with `chargeUsage` and `processPurchase`.
    *   Seed `systemConfig`.
2.  **Integration:**
    *   Modify `src/server/ai.ts` to call `chargeUsage` after generation.
    *   Modify `src/server/image-generation/*` to call `chargeUsage`.
3.  **Stripe:**
    *   Add Stripe SDK.
    *   Implement Webhook.
    *   Implement `createCheckoutSession`.
4.  **Frontend:**
    *   Build Billing Page & Components.
    *   Connect Admin UI.
