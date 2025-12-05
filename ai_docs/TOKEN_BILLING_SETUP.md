# Token Billing System - Setup Guide

## Overview

This guide covers the complete setup process for the token billing system, from environment configuration to system initialization. Follow these steps in order to get the billing system fully operational.

## Prerequisites

- Node.js/Bun installed
- Convex account and deployment
- Stripe account (Standard or higher tier for automatic payment intents)
- Cloudflare Workers account (for production deployment)
- Admin access to the application

---

## 1. Environment Variables Configuration

### Required Environment Variables

Add the following variables to your `.env` file for local development:

```bash
# Token Billing Security
BILLING_SECRET=your-64-char-random-string-here

# Stripe Integration
STRIPE_SECRET_KEY=sk_test_xxxxxxxxxxxxxxxxxxxxx
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_xxxxxxxxxxxxxxxxxxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxxxxxxx
```

### Generating BILLING_SECRET

The `BILLING_SECRET` is critical for preventing unauthorized token deductions. Generate a secure 64-character random string:

**Using OpenSSL (recommended):**
```bash
openssl rand -hex 32
```

**Using Node.js:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**Using Python:**
```bash
python3 -c "import secrets; print(secrets.token_hex(32))"
```

**Important Security Notes:**
- Never commit this secret to version control
- Use different secrets for development, staging, and production
- Store production secrets in Cloudflare Workers secrets (not environment variables)

### Adding to .env.example

Update your `.env.example` to include placeholder entries:

```bash
# Token Billing
BILLING_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
STRIPE_SECRET_KEY=sk_test_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

---

## 2. Cloudflare Workers Configuration (Production)

### wrangler.jsonc Updates

Add billing-related secrets to your `wrangler.jsonc` vars section:

```jsonc
{
  "vars": {
    // ... existing vars ...
    "DEFAULT_AI_PROVIDER": "openai",
    "DEFAULT_AI_MODEL": "gpt-4o"
  }
  // Note: Secrets should NOT be in vars section
}
```

### Setting Cloudflare Secrets

Use Wrangler CLI to set secrets securely (these are encrypted and separate from environment variables):

```bash
# Set billing secret
wrangler secret put BILLING_SECRET
# Paste your 64-char secret when prompted

# Set Stripe keys
wrangler secret put STRIPE_SECRET_KEY
wrangler secret put STRIPE_WEBHOOK_SECRET

# Set VITE_ vars (these need to be in vars section of wrangler.jsonc)
# as they are needed on the client side
```

**Important:** Only `VITE_` prefixed variables should be in the `vars` section. All other secrets should be set using `wrangler secret put`.

---

## 3. Stripe Account Setup

### Create a Stripe Account

1. Go to https://stripe.com and create an account
2. Complete business verification (required for live mode)
3. Enable payment methods (credit cards, Apple Pay, Google Pay)

### Create Products and Prices

You need to create 4 products in Stripe that match the default packages:

#### Product 1: Starter Package
```
Name: Starter Token Package
Description: 150,000 tokens - Perfect for trying out the platform
Price: $15.00 USD (one-time payment)
```

#### Product 2: Pro Package
```
Name: Pro Token Package
Description: 750,000 tokens - Best value for growing businesses
Price: $65.00 USD (one-time payment)
```

#### Product 3: Business Package
```
Name: Business Token Package
Description: 2,250,000 tokens - For teams and scaling operations
Price: $175.00 USD (one-time payment)
```

#### Product 4: Enterprise Package
```
Name: Enterprise Token Package
Description: 7,500,000 tokens - Maximum capacity for large organizations
Price: $500.00 USD (one-time payment)
```

### Get Stripe Price IDs

After creating products:

1. Go to Stripe Dashboard > Products
2. Click on each product
3. Copy the Price ID (starts with `price_`)
4. Save these for the next step

### Update Token Pricing Packages

After initializing the system (see step 5), you'll need to update the placeholder price IDs with your real Stripe price IDs:

```typescript
// Use Convex dashboard or call the mutation directly
await ctx.runMutation(api.billing.pricing.updatePackage, {
  adminUserId: yourAdminUserId,
  packageId: starterPackageId,
  updates: {
    stripePriceId: "price_1ABC123..." // Your real Stripe price ID
  }
});
```

### Configure Stripe Webhook

1. Go to Stripe Dashboard > Developers > Webhooks
2. Click "Add endpoint"
3. Enter your webhook URL:
   - Development: `http://localhost:5173/api/stripe/webhook`
   - Production: `https://your-domain.com/api/stripe/webhook`
4. Select events to listen for:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `checkout.session.completed`
5. Copy the webhook signing secret (starts with `whsec_`)
6. Add it to your environment as `STRIPE_WEBHOOK_SECRET`

---

## 4. Install Dependencies

If you haven't already, install the Stripe SDK:

```bash
bun add stripe @stripe/stripe-js
```

---

## 5. System Initialization

After environment setup, initialize the billing system with default data.

### Initialize System Settings

Run this mutation once to create the global system settings:

```typescript
import { api } from "@/convex/api";

// From Convex dashboard or your initialization script
const settingsId = await ctx.runMutation(
  api.billing.settings.initializeDefaultSettings
);

console.log("System settings initialized:", settingsId);
```

**Default Settings Created:**
- Token multiplier: 1.5x (charges 150% of actual API tokens)
- DALL-E 3 image cost: 6,000 tokens
- DALL-E 2 image cost: 3,000 tokens
- Google image cost: 4,500 tokens
- Tokens per USD: 10,000 (1 USD = 10,000 tokens)
- Minimum purchase: $5.00 (500 cents)
- Welcome bonus: 10,000 tokens
- Low balance threshold: 1,000 tokens
- Critical balance threshold: 100 tokens

### Seed Token Packages

Run this mutation once to create the default pricing packages:

```typescript
const result = await ctx.runMutation(
  api.billing.pricing.seedDefaultPackages
);

console.log(result.message); // "Default packages created successfully"
console.log("Package IDs:", result.packageIds);
```

**Default Packages Created:**
1. Starter: 150,000 tokens for $15.00
2. Pro: 750,000 tokens for $65.00 (marked as popular)
3. Business: 2,250,000 tokens for $175.00
4. Enterprise: 7,500,000 tokens for $500.00

**Important:** After seeding, update each package with the real Stripe price IDs you created in step 3.

---

## 6. Create Initial Token Accounts

Token accounts are created automatically when users sign up. However, for existing users, you need to initialize their accounts:

```typescript
// For each existing user
const accountId = await ctx.runMutation(
  api.billing.accounts.initializeAccount,
  {
    userId: user._id,
    workspaceId: user.workspaceId
  }
);
```

This will:
- Create a token account with 10,000 welcome bonus tokens
- Record the bonus transaction
- Mark the user as having received onboarding tokens

---

## 7. Grant Admin Permissions

Ensure your admin user has the proper roles to access billing features:

```typescript
// Update user record with admin role
await ctx.runMutation(api.users.updateUser, {
  userId: yourUserId,
  updates: {
    roles: ["superadmin"] // or ["admin"]
  }
});
```

**Role Permissions:**
- `superadmin`: Full access (view stats, grant tokens, edit settings, manage packages)
- `admin`: Limited access (view stats only)
- `user`: No admin access

---

## 8. Testing the System End-to-End

### Test 1: User Token Account

1. Sign up a new test user
2. Verify they receive 10,000 welcome bonus tokens
3. Check the transaction history shows the bonus

**Expected Result:**
- Token account created with balance: 10,000
- Transaction type: "bonus"
- User's `onboardingTokensGranted` field set to `true`

### Test 2: AI Operation with Token Deduction

1. Generate content using the AI (e.g., create a new content piece)
2. Check the token balance decreases
3. Verify a usage record was created
4. Verify a transaction record was created

**Expected Result:**
- Balance decreases by billable amount (e.g., 7,500 tokens for 5,000 actual)
- Usage record shows: operation type, model, tokens, success
- Transaction record shows: type "usage", negative token amount

### Test 3: Token Purchase Flow

1. Navigate to `/tokens` page
2. Click "Buy Tokens" on a package
3. Complete Stripe checkout (use test card: `4242 4242 4242 4242`)
4. Verify redirect back to success URL
5. Check balance increased
6. Verify transaction created

**Test Card Details:**
- Card Number: `4242 4242 4242 4242`
- Expiry: Any future date
- CVC: Any 3 digits
- ZIP: Any 5 digits

**Expected Result:**
- Balance increases by package amount
- Transaction type: "purchase"
- Stripe payment intent ID recorded
- `lastPurchaseAt` timestamp updated

### Test 4: Auto-Recharge Configuration

1. Go to billing settings
2. Enable auto-recharge
3. Set threshold: 5,000 tokens
4. Set amount: 150,000 tokens (Starter package)
5. Add a payment method (Stripe test card)
6. Use AI operations until balance drops below 5,000
7. Verify auto-recharge triggers

**Expected Result:**
- Auto-recharge settings saved
- When balance hits threshold, automatic purchase occurs
- Transaction type: "auto_recharge"
- If payment fails, auto-recharge is disabled automatically

### Test 5: Admin Dashboard

1. Log in as admin user
2. Navigate to `/admin/tokens`
3. Verify statistics display correctly
4. Grant tokens to a test user
5. Verify user receives tokens

**Expected Result:**
- Dashboard shows: total tokens used, revenue, active accounts
- Model usage stats display
- Operation stats display
- User accounts list with filters works
- Token grant creates "admin_grant" transaction

### Test 6: Low Balance Alerts

1. Use a test account
2. Reduce balance below 1,000 tokens
3. Verify warning alert appears
4. Reduce below 100 tokens
5. Verify critical alert appears

**Expected Result:**
- At 1,000 tokens: Yellow warning alert
- At 100 tokens: Red critical alert
- Alerts prompt user to purchase tokens

### Test 7: Insufficient Balance Handling

1. Create test account with 100 tokens
2. Try to generate content (requires ~2,500+ tokens)
3. Verify error message appears
4. Verify operation does not execute

**Expected Result:**
- Error: "Insufficient token balance"
- No content generated
- No tokens deducted
- Balance remains unchanged

### Test 8: Webhook Processing

1. Make a purchase in test mode
2. Check Stripe webhook logs
3. Verify webhook endpoint received the event
4. Verify token account updated correctly

**Expected Result:**
- Webhook logs show `payment_intent.succeeded` event received
- Webhook signature validated successfully
- Tokens added to account
- Transaction created with Stripe payment intent ID

---

## 9. Production Deployment Checklist

Before deploying to production:

- [ ] All environment variables set in Cloudflare secrets
- [ ] Stripe account in live mode with business verification complete
- [ ] Real Stripe price IDs updated in token packages
- [ ] Webhook endpoint configured with live mode URL
- [ ] BILLING_SECRET is unique and never committed to Git
- [ ] System settings initialized
- [ ] Token packages seeded and updated
- [ ] Admin users have proper roles assigned
- [ ] End-to-end testing completed successfully
- [ ] Webhook endpoint tested with live events
- [ ] Error handling and logging verified
- [ ] Rate limiting configured (if applicable)
- [ ] Monitoring and alerts set up

---

## 10. Common Setup Issues

### Issue: "Invalid billing secret" error

**Cause:** BILLING_SECRET not set or doesn't match between client and server

**Solution:**
1. Verify `BILLING_SECRET` is in `.env` for development
2. Verify secret is set in Cloudflare Workers for production: `wrangler secret put BILLING_SECRET`
3. Restart development server after adding to `.env`

### Issue: "Token account not found"

**Cause:** Account not initialized for user

**Solution:**
```typescript
await ctx.runMutation(api.billing.accounts.initializeAccount, {
  userId: user._id,
  workspaceId: user.workspaceId
});
```

### Issue: "Package not found" during checkout

**Cause:** Token packages not seeded or package is inactive

**Solution:**
1. Run `seedDefaultPackages` mutation
2. Verify packages are active: check `active: true` field
3. Verify package IDs are correct

### Issue: Stripe checkout fails

**Cause:** Invalid Stripe keys or price IDs

**Solution:**
1. Verify `STRIPE_SECRET_KEY` is correct
2. Verify price IDs in packages match Stripe dashboard
3. Check Stripe dashboard logs for error details
4. Ensure Stripe account is not restricted

### Issue: Webhook events not processing

**Cause:** Webhook secret mismatch or endpoint not reachable

**Solution:**
1. Verify `STRIPE_WEBHOOK_SECRET` matches Stripe dashboard
2. Test webhook endpoint is accessible: `curl -X POST https://your-domain.com/api/stripe/webhook`
3. Check webhook logs in Stripe dashboard
4. Verify endpoint is deployed to production

### Issue: Auto-recharge not triggering

**Cause:** Missing payment method or auto-recharge disabled

**Solution:**
1. Verify auto-recharge is enabled: `autoRechargeEnabled: true`
2. Verify threshold and amount are set
3. Verify user has a saved payment method (`defaultPaymentMethodId`)
4. Check account status is "active"

---

## 11. Monitoring and Maintenance

### Key Metrics to Monitor

1. **Token Usage:**
   - Total billable tokens used
   - Total actual tokens used
   - Profit margin percentage

2. **Revenue:**
   - Total revenue (sum of purchase transactions)
   - Average purchase amount
   - Purchase frequency

3. **Account Health:**
   - Number of active accounts
   - Number of suspended accounts (negative balance)
   - Average balance across all accounts

4. **System Performance:**
   - Failed AI operations due to insufficient balance
   - Auto-recharge success/failure rate
   - Webhook processing success rate

### Accessing Metrics

Use the admin dashboard at `/admin/tokens` or query directly:

```typescript
// System-wide statistics
const stats = await ctx.runQuery(api.billing.admin.getTokenStats);

// Model usage breakdown
const modelStats = await ctx.runQuery(api.billing.admin.getModelUsageStats);

// Operation type breakdown
const opStats = await ctx.runQuery(api.billing.admin.getOperationStats);
```

### Regular Maintenance Tasks

**Weekly:**
- Review token usage trends
- Check for accounts with negative balances
- Monitor failed payment attempts

**Monthly:**
- Analyze profit margins
- Review pricing strategy
- Update token packages if needed
- Check system settings alignment with costs

**Quarterly:**
- Review and adjust token multiplier based on actual costs
- Update fixed costs for image generation if API prices change
- Audit admin actions (token grants, setting changes)

---

## 12. Support Resources

### Documentation
- User Guide: `TOKEN_BILLING_USAGE.md`
- API Reference: See individual function docs in Convex files
- Stripe Docs: https://stripe.com/docs

### Troubleshooting
- Check Convex logs: https://dashboard.convex.dev
- Check Stripe logs: https://dashboard.stripe.com/logs
- Check Cloudflare logs: `wrangler tail` or dashboard

### Getting Help
- Convex Community: https://discord.gg/convex
- Stripe Support: https://support.stripe.com
- Internal documentation: `/agent-os/specs/token-billing/`

---

## Summary

After completing this setup guide, you should have:

1. All environment variables configured securely
2. Stripe products and prices created
3. Webhook endpoint configured and tested
4. System settings initialized with sensible defaults
5. Token packages seeded and connected to Stripe
6. Test users with token accounts
7. Admin access configured
8. End-to-end testing completed successfully

Your token billing system is now ready for production use!
