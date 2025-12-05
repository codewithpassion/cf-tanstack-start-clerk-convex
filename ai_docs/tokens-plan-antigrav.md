# Token Usage Tracking & Billing System Plan

## 1. Overview
We will implement a comprehensive usage tracking and billing system that allows users to purchase "Credits" (tokens) and spend them on AI generation features (text and images). The system will track granular usage (input/output tokens for LLMs, image counts) and deduct equivalent Credits from the user's balance.

**Key Principle**: Users interact primarily with **Tokens** (Credits).
- **Billing**: Users buy Tokens with dollars.
- **Spending**: Tokens are deducted based on **ACTUAL** usage (LLM input/output tokens) multiplied by a configurable factor.

## 2. Core Concepts

### 2.1. The "Credit" (Unified Currency)
We use a unified **"Credit"** (or "Token") as the internal currency.
- **LLM Usage**:
    - We track the *exact* input and output tokens reported by the AI provider (e.g., OpenAI).
    - **Cost = (Input Tokens × Input Multiplier) + (Output Tokens × Output Multiplier)**.
    - Example: If Multiplier is 1.5, then 1000 LLM tokens cost 1500 System Credits.
- **Image Usage**:
    - Fixed cost per image (e.g., 4000 Credits).

### 2.2. Architecture
- **Database (Convex)**: Stores balances, transaction history, detailed usage logs, and **pricing configuration**.
- **Payment Provider (Stripe)**: Handles credit card processing, one-time purchases, and auto-recharge subscriptions.
- **Backend (Cloudflare Workers + Convex)**: Enforces limits, calculates costs, and logs usage.

## 3. Database Schema (Convex)

We will add the following tables to `convex/schema.ts`:

### `wallets`
Tracks the current balance for each user.
```typescript
wallets: defineTable({
  userId: v.id("users"),
  balance: v.number(), // Current available TOKENS
  stripeCustomerId: v.optional(v.string()), // Link to Stripe Customer
  autoRechargeEnabled: v.boolean(),
  autoRechargeThreshold: v.optional(v.number()), // When balance drops below this (in TOKENS)
  autoRechargeAmount: v.optional(v.number()), // Amount of TOKENS to buy
  currency: v.string(), // e.g., "usd"
  updatedAt: v.number(),
}).index("by_userId", ["userId"]),
```

### `usageLogs`
Detailed record of every AI interaction.
```typescript
usageLogs: defineTable({
  userId: v.id("users"),
  projectId: v.optional(v.id("projects")),
  action: v.string(), // "generate_draft", "chat", "generate_image"
  provider: v.string(), // "openai", "anthropic"
  model: v.string(), // "gpt-4o", "dall-e-3"
  
  // LLM Specifics
  inputTokens: v.optional(v.number()),
  outputTokens: v.optional(v.number()),
  
  // Image Specifics
  imageCount: v.optional(v.number()),
  imageSize: v.optional(v.string()),
  
  // Cost Calculation
  costInCredits: v.number(),
  
  timestamp: v.number(),
}).index("by_userId", ["userId"])
  .index("by_projectId", ["projectId"])
  .index("by_timestamp", ["timestamp"]),
```

### `transactions`
Financial record of credits added or removed.
```typescript
transactions: defineTable({
  walletId: v.id("wallets"),
  type: v.union(v.literal("credit"), v.literal("debit")),
  amount: v.number(), // Credits added/removed
  description: v.string(), // "Purchase via Stripe", "Usage: Draft Generation"
  referenceId: v.optional(v.string()), // Stripe Charge ID or usageLog ID
  metadata: v.optional(v.string()), // JSON
  timestamp: v.number(),
}).index("by_walletId", ["walletId"]),
```

### `systemConfig`
Global configuration, including pricing and multipliers.
```typescript
systemConfig: defineTable({
  key: v.string(), // e.g., "pricing_v1"
  
  // Purchasing
  tokensPerUSD: v.number(), // e.g., 100,000 Tokens per $1.00
  minRechargeAmountUSD: v.number(), // Minimum purchase size
  
  // Spending Multipliers
  defaultInputMultiplier: v.number(), // e.g., 1.0
  defaultOutputMultiplier: v.number(), // e.g., 3.0 (Output is usually more expensive)
  defaultImageCost: v.number(), // e.g., 4000
  
  updatedAt: v.number(),
}).index("by_key", ["key"]),
```

## 4. Stripe Integration

### 4.1. Setup
- Create a **Stripe Project**.
- Define **Products** in Stripe for Credit Packages (e.g., "100k Credits", "1M Credits").
- Configure **Webhooks** to point to our Cloudflare Worker (`/api/webhooks/stripe`).

### 4.2. Purchase Flow
1. **User UI**: User selects a package (e.g., "1,000,000 Tokens for $10").
   - The UI calculates the price dynamically based on `systemConfig.tokensPerUSD`.
2. **Checkout**: App creates a Stripe Checkout Session.
3. **Payment**: User pays on Stripe.
4. **Webhook**: Stripe sends `checkout.session.completed`.
5. **Fulfillment**: 
    - Verify `client_reference_id` (userId).
    - Calculate tokens to add: `Amount Paid (USD) * tokensPerUSD`.
    - Call Convex mutation `addCredits(userId, tokenAmount)`.
    - Update `wallets` and add `transactions` record.

### 4.3. Auto-Recharge
To implement auto-recharge:
1. User saves a payment method (via Stripe Setup Intent).
2. User enables "Auto-recharge" in UI:
   - "When my balance drops below **[ 50,000 ] Tokens**..."
   - "...automatically buy **[ 500,000 ] Tokens** ($5.00)."
3. **Backend Check**: After every usage deduction, check if `balance < threshold`.
4. **Trigger**: If low, trigger a Stripe Payment Intent off-session using the saved customer ID.
   - Amount to charge = `autoRechargeAmount / tokensPerUSD`.
5. **Success**: On success webhook, add credits.

## 5. Usage Tracking Implementation

We will modify `src/server/ai.ts` and `src/server/image-generation/*.ts`.

### 5.1. The `trackUsage` Helper
Create a robust helper function in `src/lib/billing.ts` (or similar):

```typescript
export async function trackUsage(ctx: MutationCtx, {
  userId,
  provider,
  model,
  inputTokens,
  outputTokens,
  imageCount
}: UsageData) {
  // 0. Fetch Config
  const config = await ctx.db.query("systemConfig").unique();
  const inputMult = config?.defaultInputMultiplier ?? 1;
  const outputMult = config?.defaultOutputMultiplier ?? 3;
  const imageCost = config?.defaultImageCost ?? 4000;

  // 1. Calculate Cost
  let cost = 0;
  if (inputTokens) cost += inputTokens * inputMult;
  if (outputTokens) cost += outputTokens * outputMult;
  if (imageCount) cost += imageCount * imageCost;
  
  // 2. Check Balance
  const wallet = await getWallet(ctx, userId);
  if (wallet.balance < cost) {
    throw new Error("Insufficient credits");
  }
  
  // 3. Deduct & Log
  await ctx.db.patch(wallet._id, { balance: wallet.balance - cost });
  await ctx.db.insert("usageLogs", { 
    ... 
    costInCredits: cost,
    inputTokens,
    outputTokens
  });
  await ctx.db.insert("transactions", { ... });
}
```

### 5.2. Integration Points
- **`generateDraft` / `generateChatResponse`**:
    - *Pre-flight*: Check if user has > 0 credits.
    - *Post-flight*: The `streamText` result provides `usage` (input/output tokens).
    - Call `trackUsage` inside the `onFinish` callback or after the stream completes.
- **`generateImage`**:
    - *Pre-flight*: Check balance.
    - *Post-flight*: Call `trackUsage` with `imageCount: 1`.

## 6. User Interface

### 6.1. Billing Dashboard (`/settings/billing`)
- **Current Balance**: Big number showing available **Tokens**.
- **"Buy Tokens"**: Grid of packages.
- **Auto-Recharge Toggle**: 
    - Switch to enable/disable.
    - Slider/Input for **Threshold (Tokens)**.
    - Slider/Input for **Recharge Amount (Tokens)** (shows estimated cost in USD).
- **Usage History**: Chart showing daily usage (bar chart) and a table of recent transactions.

### 6.2. Usage Visibility
- **Top Bar**: Small badge showing current **Token Balance**.
- **Low Balance Warning**: Toast/Banner when credits are running low.

## 7. Admin Interface

### 7.1. Overview Dashboard
- Total Credits in circulation.
- Total Revenue (approx).
- Top Users by consumption.

### 7.2. Pricing Configuration
- **Exchange Rate**: Input field to set `Tokens Per USD` (e.g., 100,000).
- **Multipliers**:
    - `Input Token Multiplier` (e.g., 1.0)
    - `Output Token Multiplier` (e.g., 3.0)
    - `Image Cost` (e.g., 4000)
- **Update**: Button to save config to `systemConfig` table.

### 7.3. User Detail View
- View specific user's wallet and transaction history.
- **"Grant Credits"**: Admin tool to manually add credits (e.g., for refunds or bonuses).
    - Form: Amount (Tokens), Reason.
    - Action: Updates wallet, adds `transaction` record with type `adjustment`.

## 8. Implementation Steps

1.  **Schema**: Update `convex/schema.ts` with new tables (`wallets`, `usageLogs`, `transactions`, `systemConfig`).
2.  **Stripe Setup**: Configure Stripe account and env vars (`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`).
3.  **Backend Billing Logic**: Implement `calculateCost` and `trackUsage` helpers.
4.  **API Integration**: Hook up `trackUsage` to `ai.ts` and image generation.
5.  **Webhooks**: Create `src/routes/api/webhooks/stripe.ts` to handle payments.
6.  **Frontend**: Build the Billing Dashboard and "Buy" flow.
7.  **Admin**: Add Admin Billing views and Pricing Config.
