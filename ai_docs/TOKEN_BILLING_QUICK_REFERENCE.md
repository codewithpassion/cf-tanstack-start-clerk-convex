# Token Billing System - Quick Reference

## Quick Start (5 Minutes)

### 1. Generate BILLING_SECRET
```bash
openssl rand -hex 32
```
Add to `.env`:
```bash
BILLING_SECRET=your-generated-secret-here
```

### 2. Initialize System
```typescript
// Run once in Convex dashboard
await ctx.runMutation(api.billing.settings.initializeDefaultSettings);
await ctx.runMutation(api.billing.pricing.seedDefaultPackages);
```

### 3. Create User Token Account
```typescript
// Automatic on user signup, or run manually:
await ctx.runMutation(api.billing.accounts.initializeAccount, {
  userId: user._id,
  workspaceId: workspace._id
});
```

---

## Common Operations

### Check User Balance
```typescript
const account = await ctx.runQuery(api.billing.accounts.getAccount, {
  userId: user._id
});
console.log(`Balance: ${account.balance} tokens`);
```

### Record AI Usage (Server-side only!)
```typescript
await ctx.runMutation(api.billing.usage.recordUsage, {
  secret: process.env.BILLING_SECRET!,
  userId: user._id,
  workspaceId: workspace._id,
  operationType: "content_generation",
  provider: "openai",
  model: "gpt-4",
  inputTokens: 1000,
  outputTokens: 500,
  totalTokens: 1500,
  billableTokens: 2250, // 1500 * 1.5
  chargeType: "multiplier",
  multiplier: 1.5,
  success: true
});
```

### Grant Tokens (Admin)
```typescript
await ctx.runMutation(api.billing.admin.grantTokens, {
  targetUserId: user._id,
  tokenAmount: 50000,
  reason: "Promotional bonus"
});
```

### Purchase Tokens
```typescript
const { url } = await ctx.runAction(api.billing.stripe.createCheckoutSession, {
  userId: user._id,
  packageId: package._id,
  successUrl: 'https://example.com/tokens?success=true',
  cancelUrl: 'https://example.com/tokens'
});
window.location.href = url;
```

---

## Token Costs

### LLM Operations
**Formula:** `(inputTokens + outputTokens) × 1.5 multiplier`

**Examples:**
- Short content (1,500 tokens) = 2,250 billable tokens
- Medium content (5,000 tokens) = 7,500 billable tokens
- Long content (10,000 tokens) = 15,000 billable tokens

### Image Generation (Fixed Costs)
- DALL-E 3 (1024x1024): 6,000 tokens
- DALL-E 3 (1024x1792, 1792x1024): 8,000 tokens
- DALL-E 2 (1024x1024): 3,000 tokens
- DALL-E 2 (512x512): 2,000 tokens
- Google Imagen (1024x1024): 4,500 tokens

---

## Pricing Packages

| Package | Tokens | Price | Value |
|---------|--------|-------|-------|
| Starter | 150,000 | $15 | $0.10/1k |
| Pro | 750,000 | $65 | $0.087/1k |
| Business | 2,250,000 | $175 | $0.078/1k |
| Enterprise | 7,500,000 | $500 | $0.067/1k |

---

## Balance Thresholds

- **Healthy:** > 1,000 tokens (green)
- **Low:** 100-1,000 tokens (yellow warning)
- **Critical:** < 100 tokens (red alert)
- **Suspended:** < 0 tokens (account suspended)

---

## Environment Variables

### Development (.env)
```bash
BILLING_SECRET=<64-char-hex-string>
STRIPE_SECRET_KEY=sk_test_...
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

### Production (Cloudflare)
```bash
wrangler secret put BILLING_SECRET
wrangler secret put STRIPE_SECRET_KEY
wrangler secret put STRIPE_WEBHOOK_SECRET
```

---

## API Quick Reference

### Queries (Read-Only)
- `api.billing.accounts.getAccount` - Get user account
- `api.billing.accounts.checkBalance` - Check if sufficient balance
- `api.billing.accounts.getTransactions` - Transaction history
- `api.billing.pricing.listActivePackages` - List available packages
- `api.billing.pricing.getPackageById` - Get specific package
- `api.billing.settings.getSystemSettings` - Get system config
- `api.billing.usage.getUserUsage` - Usage history
- `api.billing.admin.getTokenStats` - Admin statistics
- `api.billing.admin.getModelUsageStats` - Usage by model
- `api.billing.admin.getOperationStats` - Usage by operation
- `api.billing.admin.getUserAccounts` - List user accounts

### Mutations (Write Operations)
- `api.billing.accounts.initializeAccount` - Create new account
- `api.billing.accounts.addTokens` - Add tokens (purchase/grant)
- `api.billing.accounts.updateAutoRecharge` - Configure auto-recharge
- `api.billing.usage.recordUsage` - Record AI usage (requires BILLING_SECRET)
- `api.billing.pricing.createPackage` - Create package (admin)
- `api.billing.pricing.updatePackage` - Update package (admin)
- `api.billing.pricing.seedDefaultPackages` - Initialize packages
- `api.billing.settings.initializeDefaultSettings` - Initialize settings
- `api.billing.settings.updateSystemSettings` - Update settings (admin)
- `api.billing.admin.grantTokens` - Grant tokens (superadmin)

### Actions (External Integrations)
- `api.billing.stripe.createCheckoutSession` - Create Stripe checkout
- `api.billing.stripe.triggerAutoRecharge` - Trigger auto-recharge

---

## Transaction Types

1. **purchase** - User bought tokens with money
2. **usage** - Tokens consumed by AI operation
3. **bonus** - Free tokens granted (welcome, promo)
4. **admin_grant** - Admin manually granted tokens
5. **admin_deduction** - Admin manually removed tokens
6. **refund** - Tokens refunded for failed operation
7. **auto_recharge** - Automatic purchase triggered

---

## Account Statuses

- **active** - Normal operation (balance >= 0)
- **suspended** - Negative balance, operations blocked
- **blocked** - Manually blocked by admin

---

## User Roles

- **user** - Regular user (view own data)
- **admin** - Admin (view all data, read-only)
- **superadmin** - Super admin (full access, can grant tokens)

---

## Helpful Calculations

### Tokens to USD
```typescript
const usd = tokens / 10000; // 10,000 tokens = $1
```

### USD to Tokens
```typescript
const tokens = usd * 10000; // $1 = 10,000 tokens
```

### LLM Billable Tokens
```typescript
import { calculateLLMBillableTokens } from "@/lib/billing/pricing";

const result = calculateLLMBillableTokens(inputTokens, outputTokens);
// result.billableTokens = (inputTokens + outputTokens) * 1.5
```

### Image Billable Tokens
```typescript
import { calculateImageBillableTokens } from "@/lib/billing/pricing";

const result = calculateImageBillableTokens("dall-e-3", "1024x1024", 1);
// result.billableTokens = 6000
```

---

## Testing

### Test Card (Stripe)
```
Number: 4242 4242 4242 4242
Expiry: Any future date
CVC: Any 3 digits
ZIP: Any 5 digits
```

### Test Scenarios
1. New user signup → verify 10,000 welcome bonus
2. Purchase tokens → verify balance increase
3. AI operation → verify token deduction
4. Auto-recharge → verify automatic purchase
5. Admin grant → verify tokens added

---

## Common Errors

**"Insufficient token balance"**
- User needs to purchase more tokens
- Solution: Redirect to `/tokens` page

**"Unauthorized: Invalid billing secret"**
- BILLING_SECRET not set or incorrect
- Solution: Check environment variables

**"Token account not found"**
- Account not initialized for user
- Solution: Call `initializeAccount()`

**"Package not found"**
- Invalid package ID or inactive package
- Solution: Use `listActivePackages()` to get valid IDs

**"Insufficient permissions"**
- User lacks required role
- Solution: Grant admin/superadmin role

---

## URLs

### User Pages
- `/tokens` - Token balance, purchase, settings
- `/tokens?success=true` - Stripe success redirect
- `/tokens?cancelled=true` - Stripe cancel redirect

### Admin Pages
- `/admin/tokens` - Admin dashboard
- `/admin/tokens/stats` - Statistics view
- `/admin/tokens/accounts` - User account management

### API Endpoints
- `/api/stripe/webhook` - Stripe webhook handler

---

## Default System Settings

```typescript
{
  defaultTokenMultiplier: 1.5,
  imageGenerationCostDallE3: 6000,
  imageGenerationCostDallE2: 3000,
  imageGenerationCostGoogle: 4500,
  tokensPerUSD: 10000,
  minPurchaseAmountCents: 500, // $5.00
  newUserBonusTokens: 10000,
  lowBalanceThreshold: 1000,
  criticalBalanceThreshold: 100
}
```

---

## Security Checklist

- [ ] BILLING_SECRET is 64 characters (hex)
- [ ] BILLING_SECRET never committed to Git
- [ ] Different secrets for dev/staging/prod
- [ ] Stripe webhook secret configured
- [ ] recordUsage only called server-side
- [ ] Admin roles properly assigned
- [ ] Webhook signature validation enabled

---

## Performance

- Account lookup: <10ms
- Transaction history: <50ms
- Usage recording: <30ms
- Token deduction: <20ms
- Admin dashboard: <200ms

---

## Support Links

- Setup Guide: `TOKEN_BILLING_SETUP.md`
- Usage Guide: `TOKEN_BILLING_USAGE.md`
- Implementation Summary: `IMPLEMENTATION_SUMMARY.md`
- Convex Dashboard: https://dashboard.convex.dev
- Stripe Dashboard: https://dashboard.stripe.com

---

## Emergency Procedures

### Grant Emergency Tokens
```typescript
// As superadmin
await ctx.runMutation(api.billing.admin.grantTokens, {
  targetUserId: user._id,
  tokenAmount: 100000,
  reason: "Emergency grant - ticket #123"
});
```

### Disable User Auto-Recharge
```typescript
await ctx.runMutation(api.billing.accounts.updateAutoRecharge, {
  userId: user._id,
  enabled: false
});
```

### Check System Health
```typescript
const stats = await ctx.runQuery(api.billing.admin.getTokenStats);
console.log(`Profit margin: ${stats.profitMargin}%`);
console.log(`Active accounts: ${stats.activeAccounts}`);
console.log(`Revenue: $${stats.totalRevenueCents / 100}`);
```

---

For detailed information, see the complete documentation:
- **TOKEN_BILLING_SETUP.md** - Setup and configuration
- **TOKEN_BILLING_USAGE.md** - User and admin guides
- **IMPLEMENTATION_SUMMARY.md** - Complete implementation details
