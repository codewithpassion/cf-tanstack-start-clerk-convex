# Token System Implementation Plan

This document outlines the plan to implement a usage-tracking and billing system using Tokens.

## 1. Database Schema (`convex/schema.ts`)

We will modify the `users` table and add new tables for transactions and system settings.

### Modified `users` table
Add the following fields:
- `tokenBalance` (number): Current available tokens.
- `stripeCustomerId` (string, optional): Stripe Customer ID.
- `stripeDefaultPaymentMethodId` (string, optional): ID of the default payment method for auto-recharge.
- `autoRechargeEnabled` (boolean, default: false): Whether auto-recharge is active.
- `autoRechargeThreshold` (number, default: 0): Trigger recharge when balance drops below this.
- `autoRechargePackSize` (number, default: 0): Number of tokens to buy automatically.

### New `tokenTransactions` table
- `userId` (string): ID of the user.
- `amount` (number): Positive for credits, negative for debits.
- `type` (string): 'purchase', 'usage', 'admin_grant', 'bonus', 'auto_recharge'.
- `description` (string): e.g., "Draft Generation", "Auto-recharge 50k tokens".
- `metadata` (object, optional):
  - `model` (string): e.g., "gpt-4o".
  - `promptTokens` (number).
  - `completionTokens` (number).
  - `contentId` (string).
- `timestamp` (number): Creation time (automatic).

### New `systemSettings` table (Singleton)
- `key` (string): e.g., 'global_settings'.
- `tokensPerUSD` (number): Exchange rate (e.g., 10,000 tokens per $1).
- `inputTokenMultiplier` (number, default: 1): Multiplier for prompt tokens.
- `outputTokenMultiplier` (number, default: 3): Multiplier for completion tokens.

## 2. Backend Logic (Convex)

Create a new file `convex/billing.ts`.

### Mutations
1.  `chargeUsage(args: { userId, type, description, metadata, promptTokens, completionTokens, secret })`:
    *   **Security:** Verify `args.secret` matches `process.env.BILLING_SECRET`.
    *   **Logic:**
        *   Fetch `systemSettings` (or use defaults).
        *   Calculate deduction: `amount = (promptTokens * settings.inputTokenMultiplier) + (completionTokens * settings.outputTokenMultiplier)`.
        *   Check if user has enough tokens (`tokenBalance >= amount`).
        *   Decrement `tokenBalance` by `amount`.
        *   Insert into `tokenTransactions` with the calculated amount.
        *   **Auto-Recharge Check:**
            *   If `autoRechargeEnabled` AND `newBalance < autoRechargeThreshold`:
            *   Schedule/Call internal action `triggerAutoRecharge`.
        *   Throw error if insufficient balance (and auto-recharge fails/disabled).
2.  `addTokens(args: { userId, amount, type, description, secret })`:
    *   **Security:** Verify `args.secret` or Admin Auth.
    *   **Logic:** Increment balance, log transaction.
3.  `updateAutoRechargeSettings`:
    *   Callable by client (authed).
    *   Updates `autoRechargeEnabled`, `threshold`, `packSize`.
4.  `createStripeCheckoutSession`:
    *   Callable by client (authed).
    *   Creates a Stripe Checkout Session for a token pack.
    *   **Important:** Setup mode to save payment details for future auto-recharge.

### Actions (Stripe Integration)
1.  `triggerAutoRecharge(args: { userId })`:
    *   Fetches user and global `tokensPerUSD`.
    *   Calculates cost: `cost = (user.autoRechargePackSize / tokensPerUSD)`.
    *   Calls Stripe API to charge `stripeDefaultPaymentMethodId` for `cost`.
    *   If success, calls `internalMutation:fulfillPurchase`.

### Internal Mutations (for Webhooks/Actions)
1.  `fulfillPurchase(internalArgs: { stripeCustomerId, amount, paymentId, source })`:
    *   Called by Stripe Webhook OR `triggerAutoRecharge`.
    *   Finds user.
    *   Adds tokens.
    *   Logs transaction.

## 3. Server-Side Integration (`src/server/`)

### Environment
- Add `BILLING_SECRET` to `.dev.vars`, `wrangler.jsonc`, and Convex Dashboard.
- Add `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` to `wrangler.jsonc`.

### AI Functions (`src/server/ai.ts`)
- In `generateDraft`, `generateChatResponse`, `refineContent`, etc.:
    - After successful generation (in the `(async () => { ... })` block):
    - Get `promptTokens` and `completionTokens` from the AI response.
    - Call `api.billing.chargeUsage` with these values.
    - **Note:** The mutation handles the multiplication and cost calculation.

### Image Generation (`src/server/image-generation/`)
- In `openai.ts` and `google.ts`:
    - Define fixed "virtual" tokens (e.g., treat 1 image as 1000 prompt tokens and 0 completion tokens, or just pass a fixed `amount` if we add an override to `chargeUsage`).
    - *Refinement:* Let's allow `chargeUsage` to take an optional explicit `amount` for non-LLM usage (images), OR map images to "output tokens".
    - *Decision:* Pass `completionTokens: FIXED_IMAGE_COST / multiplier`? No, that's messy.
    - *Better:* Add `fixedCost` optional arg to `chargeUsage`. If present, use it. Else use tokens.
    - *Plan Update:* `chargeUsage` args: `{ ..., promptTokens?, completionTokens?, fixedAmount? }`. Logic: `amount = fixedAmount || ((prompt * inMult) + (comp * outMult))`.

## 4. Frontend Implementation

### Components
- `TokenBalance.tsx`: Display current balance (in Header/Sidebar). "X Tokens Available".
- `BillingPage.tsx` (`/dashboard/billing`):
    - **Balance:** Large display of token count.
    - **Buy Tokens:** "Buy 10k ($1)", "Buy 50k ($5)" cards.
    - **Auto-Recharge:**
        - Toggle Switch.
        - "When balance drops below [ Input ] tokens".
        - "Automatically buy [ Input ] tokens".
        - Shows calculated cost based on `tokensPerUSD`.
        - "Save Settings" button.

### Admin UI (`src/routes/admin/`)
- **Settings Page:**
    - "Exchange Rate": Input for `tokensPerUSD` (e.g., 10000).
    - "Input Token Multiplier": Input (e.g., 1.0).
    - "Output Token Multiplier": Input (e.g., 3.0).
    - "Update Settings" button.
- **Users List:** Show token balance, auto-recharge status.
- **Action:** "Grant Tokens" button.

## 5. Implementation Steps

1.  **Setup:**
    - `bun add stripe`
    - Set env vars.

2.  **Schema:**
    - Update `convex/schema.ts` (Users, Transactions, SystemSettings).
    - Run `bun convex:dev`.

3.  **Convex Billing Logic:**
    - Create `convex/billing.ts`.
    - Implement `chargeUsage` (with auto-recharge trigger), `addTokens`, `triggerAutoRecharge`.
    - Implement `systemSettings` queries/mutations.

4.  **Connect AI:**
    - Update `src/server/ai.ts` and image generation to charge tokens.

5.  **Stripe Integration:**
    - Implement Webhook in `workers/app.ts`.

6.  **UI:**
    - Build User Billing Page (Buy + Auto-recharge).
    - Build Admin Settings Page (Rate control).
