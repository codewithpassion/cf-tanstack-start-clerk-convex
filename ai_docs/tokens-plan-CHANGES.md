# Token Billing Plan - Changes Summary

**Date:** 2025-12-03
**Updated File:** `ai_docs/tokens-plan-claude.md`

---

## What Changed

The token billing system has been **updated to use actual token consumption with a configurable multiplier** instead of cost-to-token conversion.

### Old Approach (Rejected)
- Convert AI provider costs to USD
- Convert USD to tokens using a fixed rate (e.g., 1 token = $0.001)
- Complex, not transparent to users
- Required currency conversion calculations

### New Approach (Current)
- Use **actual token counts** from AI SDK (input + output tokens)
- Apply **configurable multiplier** (e.g., 1.5x for 50% markup)
- Simple, transparent, easy to understand
- Direct pass-through of token consumption

---

## Key Differences

### Pricing Model

**Before:**
```typescript
const actualCostCents = calculateCost(model, inputTokens, outputTokens);
const tokensToDeduct = centsToTokens(actualCostCents);
// User charged based on USD cost conversion
```

**After:**
```typescript
const billableTokens = calculateBillableTokens(
  inputTokens,
  outputTokens,
  TOKEN_MARKUP_MULTIPLIER // e.g., 1.5
);
// User charged based on actual token usage
```

### User Experience

**Before:**
- "This generation will cost $0.045"
- User balance: "5,000 tokens (~$5.00)"
- Confusing mix of tokens and dollars

**After:**
- "This generation will cost 18,000 tokens"
- User balance: "50,000 tokens"
- Clear token-based accounting

### Database Schema Changes

**Added fields to `tokenUsage` table:**
```typescript
billableTokens: v.number(),      // Tokens with multiplier applied
actualCostCents: v.number(),     // For analytics only
multiplier: v.number(),          // Audit trail
```

**Removed fields:**
```typescript
inputCostCents: v.number(),      // No longer needed
outputCostCents: v.number(),     // No longer needed
totalCostCents: v.number(),      // Replaced by billableTokens
```

**Added fields to `tokenAccounts` table:**
```typescript
lifetimeActualTokensUsed: v.number(), // Track real AI tokens
```

---

## Configuration

### Primary Configuration Value

**File:** `src/lib/ai/pricing.ts`

```typescript
export const TOKEN_MARKUP_MULTIPLIER = 1.5; // 50% markup
```

**To change profit margin, adjust this value:**
- `1.2` = 20% markup (lower profit, more competitive)
- `1.5` = 50% markup (recommended, sustainable)
- `2.0` = 100% markup (double the actual cost)
- `3.0` = 200% markup (triple the actual cost)

### How It Works

1. User generates content with GPT-4o
2. AI SDK reports: 10,000 input + 2,000 output = **12,000 actual tokens**
3. System calculates: 12,000 × 1.5 = **18,000 billable tokens**
4. User's balance deducted: 50,000 → 32,000 tokens
5. Analytics records:
   - Actual tokens: 12,000
   - Billable tokens: 18,000
   - Actual cost: $0.045 (for reporting)
   - Multiplier: 1.5 (audit trail)

---

## Example Scenarios

### Scenario 1: Blog Post Generation

**User action:** Generate 1,500-word blog post with GPT-4o

**AI SDK returns:**
- Input tokens: 10,000 (prompt + context)
- Output tokens: 2,000 (generated content)
- Total actual tokens: 12,000

**System calculates:**
- Billable tokens: 12,000 × 1.5 = **18,000**
- Actual AI cost: $0.045 (for analytics)

**User sees:**
- "This generation used 18,000 tokens"
- Balance: 50,000 → 32,000 tokens

**Business outcome:**
- Actual cost to us: $0.045
- User paid value: ~$1.80 (at $0.0001/token)
- Profit: $1.755 (97.5% margin) ✅

### Scenario 2: Image Generation

**User action:** Generate DALL-E 3 image

**AI SDK returns:**
- No token data (images are flat-rate)

**System calculates:**
- DALL-E 3 cost: $0.04 per image
- Equivalent tokens: 4,000 (fake "tokens" for consistency)
- With multiplier: 4,000 × 1.5 = **6,000 billable tokens**

**User sees:**
- "This image generation used 6,000 tokens"
- Balance: 32,000 → 26,000 tokens

### Scenario 3: Chat Message

**User action:** Ask AI assistant a quick question

**AI SDK returns:**
- Input tokens: 500
- Output tokens: 200
- Total: 700

**System calculates:**
- Billable tokens: 700 × 1.5 = **1,050**
- Actual cost: ~$0.003

**User sees:**
- "This chat used 1,050 tokens"
- Balance: 26,000 → 24,950 tokens

---

## Updated Function Signatures

### recordUsage (convex/tokenUsage.ts)

**Before:**
```typescript
recordUsage({
  inputTokens: number,
  outputTokens: number,
  totalTokens: number,
  inputCostCents: number,
  outputCostCents: number,
  totalCostCents: number,
  // ...
})
```

**After:**
```typescript
recordUsage({
  inputTokens: number,       // Actual from AI SDK
  outputTokens: number,      // Actual from AI SDK
  totalTokens: number,       // Actual from AI SDK
  billableTokens: number,    // With multiplier applied
  actualCostCents: number,   // For analytics
  multiplier: number,        // Audit trail (e.g., 1.5)
  // ...
})
```

### deductTokens (convex/tokenAccounts.ts)

**Before:**
```typescript
deductTokens({
  userId: Id<"users">,
  workspaceId: Id<"workspaces">,
  tokenUsageId: Id<"tokenUsage">,
  amountCents: number, // USD cents to convert to tokens
})
```

**After:**
```typescript
deductTokens({
  userId: Id<"users">,
  workspaceId: Id<"workspaces">,
  tokenUsageId: Id<"tokenUsage">,
  billableTokens: number,  // Direct token deduction
  actualTokens: number,    // For tracking real consumption
})
```

### checkBalance (convex/tokenAccounts.ts)

**Before:**
```typescript
checkBalance({
  userId: Id<"users">,
  estimatedCostCents: number, // USD cents
})
```

**After:**
```typescript
checkBalance({
  userId: Id<"users">,
  estimatedBillableTokens: number, // Tokens with multiplier
})
```

---

## Benefits of New Approach

### For Users
1. **Transparency:** "You used 18,000 tokens" is clearer than "You used $0.045"
2. **Simplicity:** No currency conversion mental math
3. **Predictability:** Easy to estimate costs based on past usage
4. **Fairness:** Direct relationship to actual AI consumption

### For Developers
1. **Simpler code:** No cost-to-token conversions
2. **Easier debugging:** Token counts match AI SDK responses
3. **Flexible pricing:** Change multiplier in one place
4. **Better analytics:** Track both actual and billable tokens

### For Business
1. **Clear margins:** Multiplier directly controls profit
2. **Competitive:** Can adjust multiplier based on market
3. **Sustainable:** Built-in profit margin
4. **Scalable:** Works for any AI model (OpenAI, Anthropic, etc.)

---

## Migration Notes

### No Data Migration Needed
This is a **new feature**, not a change to existing data. No migration scripts required.

### Configuration Changes Required

**Environment Variables:** No changes

**Code Changes:**
1. Create `src/lib/ai/pricing.ts` with `TOKEN_MARKUP_MULTIPLIER`
2. Update `src/server/ai.ts` to use `calculateBillableTokens()`
3. Update all Convex functions to use new schema

---

## Recommended Token Packages

Based on 1.5x multiplier and $0.0001 per token pricing:

| Package | Tokens | Price | Actual AI Tokens | Typical Use Case |
|---------|--------|-------|------------------|------------------|
| **Starter** | 150,000 | $15 | ~100,000 | 5-10 blog posts |
| **Pro** | 750,000 | $65 | ~500,000 | 25-50 blog posts |
| **Business** | 2,250,000 | $175 | ~1,500,000 | Teams/agencies |
| **Enterprise** | 7,500,000 | $500 | ~5,000,000 | High-volume users |

**Profit margins:** 67-90% depending on model mix (gpt-4o-mini vs gpt-4o)

---

## Questions & Answers

### Q: Why not just pass through costs directly (1.0x multiplier)?
**A:** No profit margin = unsustainable. Need buffer for:
- Infrastructure costs (Convex, Cloudflare)
- Support costs (customer service)
- Feature development
- Payment processing fees (Stripe)
- Buffer for AI price increases

### Q: Can we change the multiplier after launch?
**A:** Yes! Change `TOKEN_MARKUP_MULTIPLIER` constant. Existing user balances unaffected. Only new generations use new multiplier.

### Q: What if AI providers change their pricing?
**A:** No impact on users! Multiplier is based on actual tokens, not costs. We absorb cost changes (up or down) without user disruption.

### Q: How do users know how many tokens a generation will cost?
**A:** Show estimate before generation: "This will cost approximately 15,000-20,000 tokens" based on rough prompt length estimate.

### Q: What about different models having different costs?
**A:** Users pay same multiplier regardless of model. We eat the cost difference. Alternatively, could implement per-model multipliers in future.

---

## Implementation Priority

**Phase 1 (Week 1):** Database schema with new token fields
**Phase 2 (Week 2):** Update all generation endpoints to use billable tokens
**Phase 3 (Week 3):** Stripe integration (unchanged)
**Phase 4 (Week 4):** User UI (unchanged)
**Phase 5 (Week 5):** Admin UI (unchanged)

---

**Status:** Ready for implementation after approval
**Risk:** Low - cleaner approach than previous plan
**Complexity:** Lower than cost-based approach
