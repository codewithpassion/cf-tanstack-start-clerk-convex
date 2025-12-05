# Token Billing System - Usage Guide

## Table of Contents

1. [User Guide](#user-guide)
2. [Admin Guide](#admin-guide)
3. [API Reference](#api-reference)
4. [Troubleshooting](#troubleshooting)

---

## User Guide

This section covers how regular users interact with the token billing system.

### Understanding Tokens

**What are tokens?**
Tokens are the internal currency used to pay for AI operations in the platform. Different operations consume different amounts of tokens based on:
- The AI model used (GPT-4 is more expensive than GPT-3.5)
- The length of the input and output
- The type of operation (image generation has fixed costs)

**Token consumption examples:**
- Generate short blog post (500 words): ~2,500 tokens
- Chat with AI (average response): ~1,500 tokens
- Refine existing content: ~3,000 tokens
- Generate image with DALL-E 3: 6,000 tokens (fixed)
- Generate image with DALL-E 2: 3,000 tokens (fixed)

**Token calculation:**
- LLM operations: `(inputTokens + outputTokens) × 1.5 multiplier`
- Image generation: Fixed cost based on model and size

---

### Viewing Your Token Balance

Your token balance is displayed in multiple locations:

**1. Header/Navigation Bar**
- Real-time balance display
- Color-coded indicators:
  - Green: Balance above 1,000 tokens (healthy)
  - Yellow: Balance 100-1,000 tokens (low warning)
  - Red: Balance below 100 tokens (critical)

**2. Tokens Page** (`/tokens`)
- Detailed balance information
- Lifetime statistics (purchased, used)
- Recent transaction history
- Purchase options

**3. Before AI Operations**
- Pre-flight check shows estimated cost
- Warning if insufficient balance

---

### Buying Tokens

**Available Packages:**

| Package | Tokens | Price | Value |
|---------|--------|-------|-------|
| Starter | 150,000 | $15.00 | $0.10 per 1,000 tokens |
| Pro | 750,000 | $65.00 | $0.087 per 1,000 tokens (13% savings) |
| Business | 2,250,000 | $175.00 | $0.078 per 1,000 tokens (22% savings) |
| Enterprise | 7,500,000 | $500.00 | $0.067 per 1,000 tokens (33% savings) |

**How to purchase:**

1. Navigate to `/tokens` page
2. Click "Buy Tokens" button on desired package
3. You'll be redirected to Stripe checkout
4. Enter payment details (credit card, Apple Pay, Google Pay)
5. Complete payment
6. You'll be redirected back to the app
7. Tokens are added immediately to your balance

**Payment methods accepted:**
- Credit/debit cards (Visa, Mastercard, American Express)
- Apple Pay
- Google Pay

**Payment security:**
- All payments processed by Stripe (PCI DSS compliant)
- Card details never stored on our servers
- Encrypted connection (HTTPS)

---

### Transaction History

View all token transactions on the `/tokens` page:

**Transaction Types:**

1. **Purchase** - Token package bought with money
   - Shows amount purchased and price paid
   - Includes Stripe payment ID for reference

2. **Usage** - Tokens consumed by AI operation
   - Shows operation type and tokens used
   - Links to the content piece (if applicable)

3. **Bonus** - Free tokens granted
   - Welcome bonus (10,000 tokens for new users)
   - Promotional bonuses

4. **Admin Grant** - Tokens manually added by admin
   - Includes reason for grant
   - Shows which admin granted tokens

5. **Auto-Recharge** - Automatic token purchase
   - Triggered when balance falls below threshold
   - Shows recharge amount and payment ID

6. **Refund** - Tokens refunded for failed operations
   - Rare, only for system errors

**Transaction Details:**
Each transaction shows:
- Date and time
- Type of transaction
- Token amount (positive for additions, negative for usage)
- Balance before and after
- Description/reason
- Related payment or operation IDs

---

### Auto-Recharge Settings

Never run out of tokens during important work by enabling auto-recharge.

**How Auto-Recharge Works:**

1. Set a balance threshold (e.g., 5,000 tokens)
2. Choose a recharge amount (must match a package size)
3. Save a payment method
4. When your balance drops below the threshold, we automatically purchase the specified amount
5. Your balance is topped up immediately

**Setting Up Auto-Recharge:**

1. Go to `/tokens` page
2. Find "Auto-Recharge Settings" section
3. Toggle "Enable Auto-Recharge" on
4. Set threshold (recommended: 5,000-10,000 tokens)
5. Choose recharge amount:
   - 150,000 tokens ($15)
   - 750,000 tokens ($65)
   - 2,250,000 tokens ($175)
   - 7,500,000 tokens ($500)
6. Add payment method (redirects to Stripe)
7. Save settings

**Important Notes:**
- Payment method must be saved first
- Auto-recharge only triggers once per threshold crossing
- If payment fails, auto-recharge is automatically disabled
- You'll receive an email notification when auto-recharge triggers
- You can disable auto-recharge at any time

**Recommended Thresholds:**
- Light usage (occasional content): 2,000 tokens
- Medium usage (daily content): 5,000 tokens
- Heavy usage (multiple pieces daily): 10,000 tokens

---

### Usage Tracking

Monitor your token consumption patterns on the `/tokens` page:

**Usage History:**
- View recent AI operations
- See tokens consumed per operation
- Filter by operation type:
  - Content Generation
  - Content Refinement
  - Content Repurpose
  - Chat Response
  - Image Generation
  - Image Prompt Generation

**Usage Insights:**
- Most expensive operations
- Most frequently used AI models
- Average tokens per operation
- Daily/weekly/monthly usage trends

---

### Low Balance Alerts

The system automatically warns you when running low on tokens:

**Warning Levels:**

1. **Low Balance (1,000 tokens)** - Yellow alert
   - Warning message on dashboard
   - Notification before AI operations
   - Recommendation to purchase more tokens

2. **Critical Balance (100 tokens)** - Red alert
   - Prominent warning throughout app
   - AI operations may be blocked
   - Urgent recommendation to purchase

3. **Insufficient Balance (below operation cost)** - Blocking
   - AI operation prevented from running
   - Error message with cost estimate
   - Direct link to purchase tokens

**Avoiding Service Interruption:**
- Enable auto-recharge
- Monitor your balance regularly
- Purchase tokens in advance for large projects
- Check estimated costs before operations

---

## Admin Guide

This section covers administrative functions for managing the token billing system.

### Admin Access Requirements

**Roles with Admin Access:**
- `superadmin` - Full access to all admin features
- `admin` - Read-only access to statistics

**Admin Permissions:**

| Feature | Admin | Superadmin |
|---------|-------|------------|
| View statistics | Yes | Yes |
| View user accounts | Yes | Yes |
| Grant tokens | No | Yes |
| Deduct tokens | No | Yes |
| Edit system settings | No | Yes |
| Manage packages | No | Yes |

---

### Admin Dashboard

Access the admin dashboard at `/admin/tokens`

**Overview Statistics:**

1. **Total Tokens Used**
   - Billable tokens charged to users
   - Actual tokens consumed by AI providers
   - Profit margin percentage

2. **Revenue Metrics**
   - Total revenue in USD
   - Average purchase amount
   - Number of purchases

3. **Account Statistics**
   - Total user accounts
   - Active accounts
   - Suspended accounts (negative balance)
   - Average balance per account

4. **Model Usage**
   - Most used AI models
   - Tokens consumed per model
   - Number of operations per model

5. **Operation Statistics**
   - Most frequent operation types
   - Tokens consumed per operation type
   - Success/failure rates

---

### Managing User Accounts

**View User Accounts:**

```typescript
// List all active accounts
const accounts = await ctx.runQuery(api.billing.admin.getUserAccounts, {
  status: "active",
  limit: 100
});

// List all accounts (any status)
const allAccounts = await ctx.runQuery(api.billing.admin.getUserAccounts);
```

**Filter Options:**
- Status: `active`, `suspended`, `blocked`
- Limit: Maximum accounts to return (default: 100)

**Account Information Displayed:**
- User email and name
- Current balance
- Lifetime tokens purchased
- Lifetime tokens used
- Account status
- Last purchase date
- Auto-recharge settings
- Stripe customer ID

---

### Granting Tokens to Users

Superadmins can manually grant tokens to users for various reasons:

**Use Cases:**
- Compensation for service outage
- Promotional bonuses
- Beta tester rewards
- Customer service recovery

**How to Grant Tokens:**

```typescript
const result = await ctx.runMutation(api.billing.admin.grantTokens, {
  targetUserId: user._id,
  tokenAmount: 50000,
  reason: "Compensation for service outage on 2025-12-01"
});

console.log(`New balance: ${result.newBalance} tokens`);
```

**Best Practices:**
- Always include a clear reason for the grant
- Use reasonable amounts (typical grants: 10,000-100,000 tokens)
- Document large grants (>100,000 tokens) separately
- Track promotional grants for accounting purposes

**Grant Transaction Record:**
- Type: "admin_grant"
- Includes granting admin's user ID
- Includes reason for audit trail
- Visible in user's transaction history

---

### Viewing System Statistics

**Overall System Stats:**

```typescript
const stats = await ctx.runQuery(api.billing.admin.getTokenStats);

// Returns:
{
  totalBillableTokensUsed: 5000000,
  totalActualTokensUsed: 3333333,
  totalRevenueCents: 150000, // $1,500.00
  activeAccounts: 150,
  totalAccounts: 200,
  totalBalance: 2500000,
  averageBalance: 12500,
  profitMargin: 33.33 // Percentage
}
```

**Model Usage Statistics:**

```typescript
const modelStats = await ctx.runQuery(api.billing.admin.getModelUsageStats);

// Returns array sorted by usage:
[
  {
    model: "gpt-4",
    operationCount: 1200,
    billableTokens: 3000000,
    actualTokens: 2000000
  },
  {
    model: "gpt-3.5-turbo",
    operationCount: 800,
    billableTokens: 1500000,
    actualTokens: 1000000
  }
  // ... more models
]
```

**Operation Type Statistics:**

```typescript
const opStats = await ctx.runQuery(api.billing.admin.getOperationStats);

// Returns array sorted by frequency:
[
  {
    operationType: "content_generation",
    operationCount: 1500,
    billableTokens: 3500000
  },
  {
    operationType: "chat_response",
    operationCount: 900,
    billableTokens: 1200000
  }
  // ... more operation types
]
```

---

### Managing Pricing Packages

**Create New Package:**

```typescript
const packageId = await ctx.runMutation(api.billing.pricing.createPackage, {
  adminUserId: admin._id,
  packageName: "Mega",
  tokenAmount: 15000000,
  priceCents: 90000, // $900.00
  stripePriceId: "price_1ABC123...",
  description: "Best for large enterprises",
  isPopular: false,
  sortOrder: 5
});
```

**Update Existing Package:**

```typescript
await ctx.runMutation(api.billing.pricing.updatePackage, {
  adminUserId: admin._id,
  packageId: existingPackageId,
  updates: {
    priceCents: 5900, // Change price to $59.00
    isPopular: true, // Mark as popular
    description: "Limited time offer - Best value!"
  }
});
```

**Deactivate Package:**

```typescript
await ctx.runMutation(api.billing.pricing.updatePackage, {
  adminUserId: admin._id,
  packageId: packageId,
  updates: {
    active: false // No longer available for purchase
  }
});
```

**Package Fields:**
- `packageName`: Display name
- `tokenAmount`: Number of tokens
- `priceCents`: Price in cents (e.g., 1500 = $15.00)
- `stripePriceId`: Stripe price ID for checkout
- `description`: Marketing description (optional)
- `isPopular`: Show "Popular" badge (boolean)
- `sortOrder`: Display order (lower numbers first)
- `active`: Available for purchase (boolean)

---

### Managing System Settings

**View Current Settings:**

```typescript
const settings = await ctx.runQuery(api.billing.settings.getSystemSettings);

// Returns:
{
  key: "global_settings",
  defaultTokenMultiplier: 1.5,
  imageGenerationCostDallE3: 6000,
  imageGenerationCostDallE2: 3000,
  imageGenerationCostGoogle: 4500,
  tokensPerUSD: 10000,
  minPurchaseAmountCents: 500,
  newUserBonusTokens: 10000,
  lowBalanceThreshold: 1000,
  criticalBalanceThreshold: 100,
  updatedAt: 1234567890,
  updatedBy: userId
}
```

**Update Settings:**

```typescript
await ctx.runMutation(api.billing.settings.updateSystemSettings, {
  adminUserId: admin._id,
  updates: {
    defaultTokenMultiplier: 1.8, // Increase margin
    newUserBonusTokens: 15000, // Increase welcome bonus
    imageGenerationCostDallE3: 7000 // Adjust for price changes
  }
});
```

**Setting Descriptions:**

- `defaultTokenMultiplier`: Markup applied to LLM token usage (1.5 = 50% margin)
- `imageGenerationCostDallE3`: Fixed token cost for DALL-E 3 images
- `imageGenerationCostDallE2`: Fixed token cost for DALL-E 2 images
- `imageGenerationCostGoogle`: Fixed token cost for Google Imagen
- `tokensPerUSD`: Exchange rate (10000 = 1 USD buys 10,000 tokens)
- `minPurchaseAmountCents`: Minimum purchase amount (500 = $5.00)
- `newUserBonusTokens`: Welcome bonus for new signups
- `lowBalanceThreshold`: When to show low balance warning
- `criticalBalanceThreshold`: When to show critical warning

**When to Update Settings:**

- **Token Multiplier**: When AI provider costs change significantly
- **Image Costs**: When image generation API prices change
- **Tokens Per USD**: When adjusting overall pricing strategy
- **Welcome Bonus**: For promotional campaigns
- **Thresholds**: To optimize user experience

**Important Notes:**
- Settings changes affect all future operations immediately
- Does not retroactively change past transactions
- Always document reason for changes
- Monitor impact on profit margins after changes

---

## API Reference

Complete reference for all Convex functions in the token billing system.

### Account Management

#### `initializeAccount`

Initialize a token account for a new user with welcome bonus.

**Type:** Mutation

**Parameters:**
```typescript
{
  userId: Id<"users">,
  workspaceId: Id<"workspaces">
}
```

**Returns:** `Id<"tokenAccounts">`

**Example:**
```typescript
const accountId = await ctx.runMutation(api.billing.accounts.initializeAccount, {
  userId: user._id,
  workspaceId: workspace._id
});
```

**Notes:**
- Idempotent (safe to call multiple times)
- Grants welcome bonus tokens from system settings
- Marks user as having received onboarding tokens

---

#### `getAccount`

Get a user's token account details.

**Type:** Query

**Parameters:**
```typescript
{
  userId: Id<"users">
}
```

**Returns:** Token account object or `null`

**Example:**
```typescript
const account = await ctx.runQuery(api.billing.accounts.getAccount, {
  userId: user._id
});

if (account) {
  console.log(`Balance: ${account.balance} tokens`);
}
```

---

#### `checkBalance`

Check if a user has sufficient balance for an operation.

**Type:** Query

**Parameters:**
```typescript
{
  userId: Id<"users">,
  requiredTokens: number
}
```

**Returns:**
```typescript
{
  sufficient: boolean,
  balance: number,
  required: number,
  accountStatus: "active" | "suspended" | "blocked" | "not_found"
}
```

**Example:**
```typescript
const check = await ctx.runQuery(api.billing.accounts.checkBalance, {
  userId: user._id,
  requiredTokens: 5000
});

if (!check.sufficient) {
  throw new Error("Insufficient token balance");
}
```

---

#### `addTokens`

Add tokens to a user's account.

**Type:** Mutation

**Parameters:**
```typescript
{
  userId: Id<"users">,
  workspaceId: Id<"workspaces">,
  tokenAmount: number,
  amountCents?: number,
  transactionType: "purchase" | "admin_grant" | "refund" | "auto_recharge",
  stripePaymentIntentId?: string,
  description: string,
  adminUserId?: Id<"users">
}
```

**Returns:** `number` (new balance)

**Example:**
```typescript
const newBalance = await ctx.runMutation(api.billing.accounts.addTokens, {
  userId: user._id,
  workspaceId: workspace._id,
  tokenAmount: 50000,
  amountCents: 500,
  transactionType: "purchase",
  stripePaymentIntentId: "pi_123456",
  description: "Purchased 50,000 token package"
});
```

---

#### `updateAutoRecharge`

Update auto-recharge settings for a user's account.

**Type:** Mutation

**Parameters:**
```typescript
{
  userId: Id<"users">,
  enabled: boolean,
  threshold?: number,
  amount?: number
}
```

**Returns:** `boolean` (success status)

**Example:**
```typescript
await ctx.runMutation(api.billing.accounts.updateAutoRecharge, {
  userId: user._id,
  enabled: true,
  threshold: 5000,
  amount: 50000
});
```

---

#### `getTransactions`

Get transaction history for a user.

**Type:** Query

**Parameters:**
```typescript
{
  userId: Id<"users">,
  limit?: number // Default: 50
}
```

**Returns:** Array of transaction records

**Example:**
```typescript
const transactions = await ctx.runQuery(api.billing.accounts.getTransactions, {
  userId: user._id,
  limit: 25
});
```

---

### Usage Tracking

#### `recordUsage`

Record AI usage and deduct tokens from user's account.

**Type:** Mutation

**Security:** Requires `BILLING_SECRET` - only call from server-side code!

**Parameters:**
```typescript
{
  secret: string, // BILLING_SECRET from environment
  userId: Id<"users">,
  workspaceId: Id<"workspaces">,
  projectId?: Id<"projects">,
  contentPieceId?: Id<"contentPieces">,
  operationType: "content_generation" | "content_refinement" | "content_repurpose" |
                 "chat_response" | "image_generation" | "image_prompt_generation",
  provider: "openai" | "anthropic" | "google",
  model: string,
  inputTokens?: number,
  outputTokens?: number,
  totalTokens?: number,
  imageCount?: number,
  imageSize?: string,
  billableTokens: number,
  chargeType: "multiplier" | "fixed",
  multiplier?: number,
  fixedCost?: number,
  requestMetadata?: string,
  success: boolean,
  errorMessage?: string
}
```

**Returns:** `Id<"tokenUsage">` (usage record ID)

**Example:**
```typescript
// Server-side only!
const usageId = await ctx.runMutation(api.billing.usage.recordUsage, {
  secret: process.env.BILLING_SECRET!,
  userId: user._id,
  workspaceId: workspace._id,
  projectId: project._id,
  operationType: "content_generation",
  provider: "openai",
  model: "gpt-4",
  inputTokens: 1000,
  outputTokens: 500,
  totalTokens: 1500,
  billableTokens: 2250, // 1500 * 1.5 multiplier
  chargeType: "multiplier",
  multiplier: 1.5,
  success: true
});
```

**Security Warning:** Never call this from client code! The `BILLING_SECRET` must be kept on the server to prevent users from bypassing token charges.

---

#### `getUserUsage`

Get usage history for a user.

**Type:** Query

**Parameters:**
```typescript
{
  userId: Id<"users">,
  limit?: number, // Default: 50
  operationType?: "content_generation" | "content_refinement" | ... // Optional filter
}
```

**Returns:** Array of usage records

**Example:**
```typescript
// Get all recent usage
const usage = await ctx.runQuery(api.billing.usage.getUserUsage, {
  userId: user._id,
  limit: 100
});

// Get only image generation usage
const imageUsage = await ctx.runQuery(api.billing.usage.getUserUsage, {
  userId: user._id,
  limit: 50,
  operationType: "image_generation"
});
```

---

### Pricing Management

#### `listActivePackages`

List all active token pricing packages.

**Type:** Query (public, no auth required)

**Parameters:** None

**Returns:** Array of pricing packages (sorted by sortOrder)

**Example:**
```typescript
const packages = await ctx.runQuery(api.billing.pricing.listActivePackages);

packages.forEach(pkg => {
  console.log(`${pkg.packageName}: ${pkg.tokenAmount} tokens for $${pkg.priceCents / 100}`);
});
```

---

#### `getPackageById`

Get a specific token pricing package by ID.

**Type:** Query (public, no auth required)

**Parameters:**
```typescript
{
  id: Id<"tokenPricing">
}
```

**Returns:** Package object or `null`

**Example:**
```typescript
const package = await ctx.runQuery(api.billing.pricing.getPackageById, {
  id: packageId
});

if (package) {
  console.log(`Package: ${package.packageName}`);
}
```

---

#### `createPackage`

Create a new token pricing package (admin only).

**Type:** Mutation

**Auth:** Requires admin or superadmin role

**Parameters:**
```typescript
{
  adminUserId: Id<"users">,
  packageName: string,
  tokenAmount: number,
  priceCents: number,
  stripePriceId: string,
  description?: string,
  isPopular: boolean,
  sortOrder: number
}
```

**Returns:** `Id<"tokenPricing">` (new package ID)

**Example:**
```typescript
const packageId = await ctx.runMutation(api.billing.pricing.createPackage, {
  adminUserId: userId,
  packageName: "Pro",
  tokenAmount: 750000,
  priceCents: 6500,
  stripePriceId: "price_123456",
  description: "Best value for growing businesses",
  isPopular: true,
  sortOrder: 2
});
```

---

#### `updatePackage`

Update an existing token pricing package (admin only).

**Type:** Mutation

**Auth:** Requires admin or superadmin role

**Parameters:**
```typescript
{
  adminUserId: Id<"users">,
  packageId: Id<"tokenPricing">,
  updates: {
    packageName?: string,
    tokenAmount?: number,
    priceCents?: number,
    stripePriceId?: string,
    description?: string,
    isPopular?: boolean,
    sortOrder?: number,
    active?: boolean
  }
}
```

**Returns:** `{ success: boolean }`

**Example:**
```typescript
await ctx.runMutation(api.billing.pricing.updatePackage, {
  adminUserId: userId,
  packageId,
  updates: {
    priceCents: 5900,
    isPopular: true,
    active: false
  }
});
```

---

#### `seedDefaultPackages`

Seed default token pricing packages (for initial setup).

**Type:** Mutation

**Auth:** No auth required (idempotent, safe to call multiple times)

**Parameters:** None

**Returns:**
```typescript
{
  message: string,
  packageIds?: Id<"tokenPricing">[]
}
```

**Example:**
```typescript
const result = await ctx.runMutation(api.billing.pricing.seedDefaultPackages);
console.log(result.message); // "Default packages created successfully"
```

**Notes:**
- Only creates packages if none exist
- Creates 4 default packages (Starter, Pro, Business, Enterprise)
- Uses placeholder Stripe price IDs that must be updated

---

### System Settings

#### `getSystemSettings`

Get system settings for token billing.

**Type:** Query (public, no auth required)

**Parameters:** None

**Returns:** System settings object

**Example:**
```typescript
const settings = await ctx.runQuery(api.billing.settings.getSystemSettings);

const multiplier = settings.defaultTokenMultiplier;
const imageCost = settings.imageGenerationCostDallE3;
```

---

#### `initializeDefaultSettings`

Initialize default system settings if they don't exist.

**Type:** Mutation

**Auth:** No auth required (idempotent)

**Parameters:** None

**Returns:** `Id<"systemSettings">` (settings record ID)

**Example:**
```typescript
await ctx.runMutation(api.billing.settings.initializeDefaultSettings);
```

**Notes:**
- Idempotent (safe to call multiple times)
- Only creates settings if they don't exist

---

#### `updateSystemSettings`

Update system settings (admin only).

**Type:** Mutation

**Auth:** Requires admin or superadmin role

**Parameters:**
```typescript
{
  adminUserId: Id<"users">,
  updates: {
    defaultTokenMultiplier?: number,
    imageGenerationCostDallE3?: number,
    imageGenerationCostDallE2?: number,
    imageGenerationCostGoogle?: number,
    tokensPerUSD?: number,
    minPurchaseAmountCents?: number,
    newUserBonusTokens?: number,
    lowBalanceThreshold?: number,
    criticalBalanceThreshold?: number
  }
}
```

**Returns:** `{ success: boolean }`

**Example:**
```typescript
await ctx.runMutation(api.billing.settings.updateSystemSettings, {
  adminUserId: userId,
  updates: {
    defaultTokenMultiplier: 1.8,
    newUserBonusTokens: 15000
  }
});
```

---

### Stripe Integration

#### `createCheckoutSession`

Create a Stripe checkout session for purchasing tokens.

**Type:** Action

**Parameters:**
```typescript
{
  userId: Id<"users">,
  packageId: Id<"tokenPricing">,
  successUrl: string,
  cancelUrl: string
}
```

**Returns:**
```typescript
{
  sessionId: string,
  url: string
}
```

**Example:**
```typescript
const { sessionId, url } = await ctx.runAction(api.billing.stripe.createCheckoutSession, {
  userId: user._id,
  packageId: selectedPackage._id,
  successUrl: 'https://example.com/tokens?success=true',
  cancelUrl: 'https://example.com/tokens'
});

// Redirect user to Stripe checkout
window.location.href = url;
```

---

#### `triggerAutoRecharge`

Trigger auto-recharge for a user's account.

**Type:** Action

**Parameters:**
```typescript
{
  userId: Id<"users">,
  accountId: Id<"tokenAccounts">
}
```

**Returns:**
```typescript
{
  success: boolean,
  paymentIntentId?: string,
  reason?: string
}
```

**Example:**
```typescript
const result = await ctx.runAction(api.billing.stripe.triggerAutoRecharge, {
  userId: user._id,
  accountId: account._id
});

if (result.success) {
  console.log(`Auto-recharged successfully`);
} else {
  console.log(`Auto-recharge failed: ${result.reason}`);
}
```

**Notes:**
- Called automatically when balance drops below threshold
- Requires saved payment method
- Disables auto-recharge if payment fails

---

### Admin Functions

#### `getTokenStats`

Get system-wide token statistics (admin only).

**Type:** Query

**Auth:** Requires admin or superadmin role

**Parameters:** None

**Returns:**
```typescript
{
  totalBillableTokensUsed: number,
  totalActualTokensUsed: number,
  totalRevenueCents: number,
  activeAccounts: number,
  totalAccounts: number,
  totalBalance: number,
  averageBalance: number,
  profitMargin: number
}
```

**Example:**
```typescript
const stats = await ctx.runQuery(api.billing.admin.getTokenStats);
console.log(`Total revenue: $${stats.totalRevenueCents / 100}`);
console.log(`Profit margin: ${stats.profitMargin.toFixed(2)}%`);
```

---

#### `getModelUsageStats`

Get usage statistics grouped by AI model (admin only).

**Type:** Query

**Auth:** Requires admin or superadmin role

**Parameters:** None

**Returns:** Array of model statistics

**Example:**
```typescript
const modelStats = await ctx.runQuery(api.billing.admin.getModelUsageStats);

modelStats.forEach(stat => {
  console.log(`${stat.model}: ${stat.operationCount} ops, ${stat.billableTokens} tokens`);
});
```

---

#### `getOperationStats`

Get usage statistics grouped by operation type (admin only).

**Type:** Query

**Auth:** Requires admin or superadmin role

**Parameters:** None

**Returns:** Array of operation type statistics

**Example:**
```typescript
const opStats = await ctx.runQuery(api.billing.admin.getOperationStats);

opStats.forEach(stat => {
  console.log(`${stat.operationType}: ${stat.operationCount} operations`);
});
```

---

#### `getUserAccounts`

Get user token accounts with enriched user details (admin only).

**Type:** Query

**Auth:** Requires admin or superadmin role

**Parameters:**
```typescript
{
  limit?: number, // Default: 100
  status?: "active" | "suspended" | "blocked"
}
```

**Returns:** Array of enriched account data

**Example:**
```typescript
// Get all active accounts
const accounts = await ctx.runQuery(api.billing.admin.getUserAccounts, {
  status: "active",
  limit: 50
});

// Get all accounts regardless of status
const allAccounts = await ctx.runQuery(api.billing.admin.getUserAccounts);
```

---

#### `grantTokens`

Grant tokens to a user (admin only).

**Type:** Mutation

**Auth:** Requires superadmin role

**Parameters:**
```typescript
{
  targetUserId: Id<"users">,
  tokenAmount: number,
  reason: string
}
```

**Returns:**
```typescript
{
  success: boolean,
  newBalance: number
}
```

**Example:**
```typescript
const result = await ctx.runMutation(api.billing.admin.grantTokens, {
  targetUserId: user._id,
  tokenAmount: 50000,
  reason: "Compensation for service outage"
});

console.log(`New balance: ${result.newBalance} tokens`);
```

---

## Troubleshooting

### Common User Issues

#### Issue: "Insufficient token balance" error

**Symptoms:**
- AI operation fails before starting
- Error message shows required tokens vs. current balance

**Causes:**
1. Token balance too low for operation
2. Operation requires more tokens than estimated
3. Multiple concurrent operations depleted balance

**Solutions:**
1. Purchase more tokens immediately
2. Enable auto-recharge to prevent future occurrences
3. Check transaction history to see recent usage
4. Contact support if balance seems incorrect

---

#### Issue: Token purchase completed but balance not updated

**Symptoms:**
- Stripe checkout completed successfully
- Payment charged on card
- Token balance unchanged

**Causes:**
1. Webhook processing delay (usually <30 seconds)
2. Webhook failed to deliver
3. Webhook signature validation failed

**Solutions:**
1. Wait 1-2 minutes and refresh page
2. Check transaction history for pending purchase
3. Check email for purchase confirmation
4. Contact support with Stripe payment ID if balance not updated after 5 minutes

---

#### Issue: Auto-recharge not working

**Symptoms:**
- Balance dropped below threshold
- No automatic purchase occurred
- No error notification received

**Causes:**
1. Auto-recharge disabled (payment failure)
2. Payment method expired or invalid
3. Stripe customer ID not saved
4. Threshold misconfigured

**Solutions:**
1. Check auto-recharge settings - verify it's enabled
2. Update payment method
3. Verify threshold and amount are set correctly
4. Try manual purchase to test payment method
5. Re-enable auto-recharge after fixing payment issue

---

#### Issue: Balance showing negative number

**Symptoms:**
- Token balance displays negative value (e.g., -500)
- Account status changed to "suspended"
- Unable to perform AI operations

**Causes:**
1. Concurrent operations caused overdraft
2. Operation completed but pre-flight check was bypassed
3. System error in balance calculation

**Solutions:**
1. Purchase tokens to bring balance back to positive
2. Account will automatically reactivate when balance >= 0
3. Contact support if negative balance seems incorrect
4. Review transaction history to understand cause

---

#### Issue: Unable to complete Stripe checkout

**Symptoms:**
- Redirected to Stripe but checkout fails
- Error message in Stripe checkout page
- Redirect back to app without purchase

**Causes:**
1. Payment method declined
2. Bank blocking online transaction
3. Insufficient funds
4. Invalid Stripe configuration (admin issue)

**Solutions:**
1. Try different payment method
2. Contact your bank to authorize transaction
3. Use different card
4. Try smaller package first to test
5. Contact support if all payment methods fail

---

### Common Admin Issues

#### Issue: Admin dashboard not accessible

**Symptoms:**
- 403 Forbidden or "Insufficient permissions" error
- Dashboard page doesn't load
- Admin menu not visible

**Causes:**
1. User doesn't have admin or superadmin role
2. Auth session expired
3. Permissions system misconfigured

**Solutions:**
1. Verify user roles in database:
   ```typescript
   const user = await ctx.db.get(userId);
   console.log(user.roles); // Should include "admin" or "superadmin"
   ```
2. Update user roles:
   ```typescript
   await ctx.db.patch(userId, {
     roles: ["superadmin"]
   });
   ```
3. Log out and log back in to refresh session

---

#### Issue: Unable to grant tokens to user

**Symptoms:**
- Grant tokens mutation fails
- "Insufficient permissions" error
- "Target user account not found" error

**Causes:**
1. Admin user doesn't have superadmin role (only superadmins can grant)
2. Target user doesn't have a token account initialized
3. Invalid user ID provided

**Solutions:**
1. Verify admin has superadmin role (not just admin)
2. Initialize target user's account:
   ```typescript
   await ctx.runMutation(api.billing.accounts.initializeAccount, {
     userId: targetUserId,
     workspaceId: targetUserWorkspaceId
   });
   ```
3. Verify target user ID is correct

---

#### Issue: System settings update fails

**Symptoms:**
- Settings update mutation returns error
- Settings remain unchanged after update
- "Unauthorized" error

**Causes:**
1. User doesn't have admin/superadmin role
2. Settings record not initialized
3. Invalid update values (e.g., negative multiplier)

**Solutions:**
1. Verify admin role
2. Initialize settings if missing:
   ```typescript
   await ctx.runMutation(api.billing.settings.initializeDefaultSettings);
   ```
3. Validate update values before submitting
4. Check Convex logs for detailed error message

---

#### Issue: Package creation/update fails

**Symptoms:**
- Package creation returns error
- Updates don't persist
- Package not visible after creation

**Causes:**
1. Missing required fields (stripePriceId, etc.)
2. Duplicate Stripe price ID
3. Invalid Stripe price ID format

**Solutions:**
1. Verify all required fields are provided
2. Check Stripe dashboard for correct price ID format
3. Ensure price ID is from correct Stripe account (test vs. live)
4. Create new price in Stripe if ID is invalid

---

### Common Integration Issues

#### Issue: Webhook signature validation fails

**Symptoms:**
- Stripe webhooks showing as failed in dashboard
- Purchases complete but tokens not added
- Webhook logs show signature errors

**Causes:**
1. Wrong webhook secret in environment variables
2. Webhook secret from different Stripe account
3. Request body modified before validation

**Solutions:**
1. Get correct webhook secret from Stripe dashboard
2. Update `STRIPE_WEBHOOK_SECRET` in environment
3. Verify webhook endpoint URL is correct
4. Check webhook is configured for correct event types
5. Test webhook manually from Stripe dashboard

---

#### Issue: "Invalid billing secret" errors

**Symptoms:**
- AI operations fail with "Unauthorized" error
- Usage not being recorded
- Tokens not being deducted

**Causes:**
1. `BILLING_SECRET` not set in environment
2. Secret mismatch between environments
3. Secret not deployed to production

**Solutions:**
1. Verify `.env` contains `BILLING_SECRET`
2. Set Cloudflare secret: `wrangler secret put BILLING_SECRET`
3. Ensure same secret in all environments
4. Restart development server after adding secret

---

#### Issue: Stripe customer creation fails

**Symptoms:**
- First purchase attempt fails
- Error about missing Stripe customer
- Checkout session creation fails

**Causes:**
1. Invalid Stripe API key
2. Stripe account in restricted mode
3. API key doesn't have customer creation permission

**Solutions:**
1. Verify `STRIPE_SECRET_KEY` is correct
2. Check Stripe dashboard for account restrictions
3. Use correct API key for environment (test vs. live)
4. Regenerate API key if necessary

---

### Error Messages Reference

**"Insufficient token balance"**
- **Meaning:** User doesn't have enough tokens for operation
- **Action:** Purchase tokens or enable auto-recharge

**"Unauthorized: Invalid billing secret"**
- **Meaning:** BILLING_SECRET validation failed
- **Action:** Check server-side secret configuration

**"Token account not found"**
- **Meaning:** User's token account not initialized
- **Action:** Call `initializeAccount` mutation

**"Package not found"**
- **Meaning:** Invalid package ID or package deleted
- **Action:** Verify package ID, check package is active

**"Insufficient permissions"**
- **Meaning:** User doesn't have required role
- **Action:** Grant admin/superadmin role to user

**"Stripe customer not found"**
- **Meaning:** User's Stripe customer record missing
- **Action:** Will be created automatically on next purchase

**"Auto-recharge is not enabled"**
- **Meaning:** Attempted auto-recharge but feature disabled
- **Action:** Enable auto-recharge in settings

**"No default payment method set"**
- **Meaning:** Auto-recharge enabled but no saved payment
- **Action:** Add payment method in Stripe

**"Payment failed with status: requires_payment_method"**
- **Meaning:** Payment method was declined
- **Action:** Update payment method or use different card

---

### Getting Additional Help

If you encounter issues not covered in this guide:

1. **Check System Logs:**
   - Convex Dashboard: https://dashboard.convex.dev
   - Stripe Dashboard: https://dashboard.stripe.com/logs
   - Cloudflare Dashboard: View Worker logs

2. **Review Transaction History:**
   - User transaction history at `/tokens`
   - Admin view of all transactions in dashboard
   - Look for error patterns or anomalies

3. **Test in Isolation:**
   - Try with test user account
   - Use Stripe test mode
   - Check with minimal token operation

4. **Contact Support:**
   - Include user ID and transaction ID
   - Provide error messages and timestamps
   - Describe steps to reproduce issue
   - Share relevant screenshots

---

## Best Practices

### For Users

1. **Enable Auto-Recharge:**
   - Prevents workflow interruption
   - Set reasonable threshold (5,000-10,000 tokens)
   - Choose appropriate recharge amount

2. **Monitor Balance Regularly:**
   - Check before starting large projects
   - Review usage patterns weekly
   - Adjust purchasing strategy accordingly

3. **Buy in Bulk:**
   - Larger packages offer better value
   - Up to 33% savings with Enterprise package
   - Plan ahead for big projects

4. **Review Usage:**
   - Check which operations use most tokens
   - Optimize prompt length to reduce costs
   - Use appropriate AI models (GPT-3.5 vs GPT-4)

### For Admins

1. **Monitor System Health:**
   - Check profit margins weekly
   - Track revenue vs. costs
   - Monitor active vs. suspended accounts

2. **Adjust Pricing Strategically:**
   - Update multiplier based on actual costs
   - Keep image generation costs aligned with API prices
   - Test price changes with small user groups first

3. **Document Admin Actions:**
   - Always provide clear reasons for token grants
   - Track promotional campaigns separately
   - Maintain audit log of setting changes

4. **Respond to Trends:**
   - If profit margin drops, investigate model usage
   - If many suspended accounts, consider welcome bonus increase
   - If high churn, review pricing packages

5. **Communicate Changes:**
   - Notify users of pricing changes in advance
   - Explain reason for system setting updates
   - Provide migration path for package changes

---

## Summary

This guide covers:
- Complete user guide for buying and managing tokens
- Admin guide for managing the billing system
- Comprehensive API reference for all functions
- Troubleshooting for common issues
- Best practices for users and admins

For setup and installation instructions, see `TOKEN_BILLING_SETUP.md`.
