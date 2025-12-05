import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
	// Existing users table (preserve)
	users: defineTable({
		email: v.string(),
		name: v.optional(v.string()),
		clerkId: v.string(),
		imageUrl: v.optional(v.string()),
		roles: v.optional(v.array(v.string())),
		onboardingTokensGranted: v.optional(v.boolean()),
		createdAt: v.number(),
		updatedAt: v.number(),
	})
		.index("by_email", ["email"])
		.index("by_clerkId", ["clerkId"]),

	// Workspaces - 1:1 with users
	workspaces: defineTable({
		userId: v.id("users"),
		onboardingCompleted: v.boolean(),
		themePreference: v.optional(
			v.union(v.literal("light"), v.literal("dark"), v.literal("system"))
		),
		createdAt: v.number(),
		updatedAt: v.number(),
	}).index("by_userId", ["userId"]),

	// Projects - belong to workspace
	projects: defineTable({
		workspaceId: v.id("workspaces"),
		name: v.string(),
		description: v.optional(v.string()),
		defaultAiProvider: v.optional(
			v.union(v.literal("openai"), v.literal("anthropic"))
		),
		defaultAiModel: v.optional(v.string()),
		deletedAt: v.optional(v.number()),
		createdAt: v.number(),
		updatedAt: v.number(),
	})
		.index("by_workspaceId", ["workspaceId"])
		.index("by_workspaceId_deletedAt", ["workspaceId", "deletedAt"]),

	// Categories - belong to project
	categories: defineTable({
		projectId: v.id("projects"),
		name: v.string(),
		description: v.optional(v.string()),
		formatGuidelines: v.optional(v.string()),
		isDefault: v.boolean(),
		sortOrder: v.number(),
		deletedAt: v.optional(v.number()),
		createdAt: v.number(),
		updatedAt: v.number(),
	})
		.index("by_projectId", ["projectId"])
		.index("by_projectId_deletedAt", ["projectId", "deletedAt"]),

	// Brand Voices - belong to project
	brandVoices: defineTable({
		projectId: v.id("projects"),
		name: v.string(),
		description: v.optional(v.string()),
		deletedAt: v.optional(v.number()),
		createdAt: v.number(),
		updatedAt: v.number(),
	})
		.index("by_projectId", ["projectId"])
		.index("by_projectId_deletedAt", ["projectId", "deletedAt"]),

	// Personas - belong to project
	personas: defineTable({
		projectId: v.id("projects"),
		name: v.string(),
		description: v.optional(v.string()),
		deletedAt: v.optional(v.number()),
		createdAt: v.number(),
		updatedAt: v.number(),
	})
		.index("by_projectId", ["projectId"])
		.index("by_projectId_deletedAt", ["projectId", "deletedAt"]),

	// Knowledge Base Items - belong to category
	knowledgeBaseItems: defineTable({
		categoryId: v.id("categories"),
		projectId: v.id("projects"), // Denormalized for easier querying
		title: v.string(),
		content: v.optional(v.string()), // For free-text entries
		fileId: v.optional(v.id("files")), // For file uploads
		deletedAt: v.optional(v.number()),
		createdAt: v.number(),
		updatedAt: v.number(),
	})
		.index("by_categoryId", ["categoryId"])
		.index("by_categoryId_deletedAt", ["categoryId", "deletedAt"])
		.index("by_projectId", ["projectId"]),

	// Examples - belong to category
	examples: defineTable({
		categoryId: v.id("categories"),
		projectId: v.id("projects"), // Denormalized for easier querying
		title: v.string(),
		content: v.optional(v.string()), // For text entries
		notes: v.optional(v.string()),
		fileId: v.optional(v.id("files")), // For file uploads
		deletedAt: v.optional(v.number()),
		createdAt: v.number(),
		updatedAt: v.number(),
	})
		.index("by_categoryId", ["categoryId"])
		.index("by_categoryId_deletedAt", ["categoryId", "deletedAt"])
		.index("by_projectId", ["projectId"]),

	// Files - central file storage tracking
	files: defineTable({
		// Ownership - one of these will be set
		brandVoiceId: v.optional(v.id("brandVoices")),
		personaId: v.optional(v.id("personas")),
		knowledgeBaseItemId: v.optional(v.id("knowledgeBaseItems")),
		exampleId: v.optional(v.id("examples")),
		contentPieceId: v.optional(v.id("contentPieces")), // Source material uploads
		contentImageId: v.optional(v.id("contentImages")), // Attached images
		// File metadata
		filename: v.string(),
		mimeType: v.string(),
		sizeBytes: v.number(),
		r2Key: v.string(), // Cloudflare R2 object key
		thumbnailR2Key: v.optional(v.string()), // Cloudflare R2 object key for thumbnail
		extractedText: v.optional(v.string()), // Parsed text content
		createdAt: v.number(),
	})
		.index("by_brandVoiceId", ["brandVoiceId"])
		.index("by_personaId", ["personaId"])
		.index("by_knowledgeBaseItemId", ["knowledgeBaseItemId"])
		.index("by_exampleId", ["exampleId"])
		.index("by_r2Key", ["r2Key"])
		.index("by_contentPieceId", ["contentPieceId"])
		.index("by_contentImageId", ["contentImageId"]),

	// Content Pieces - the main content entity
	contentPieces: defineTable({
		projectId: v.id("projects"),
		categoryId: v.id("categories"),
		personaId: v.optional(v.id("personas")),
		brandVoiceId: v.optional(v.id("brandVoices")),
		parentContentId: v.optional(v.id("contentPieces")), // For derived content
		title: v.string(),
		content: v.string(), // JSON string from Novel editor
		status: v.union(v.literal("draft"), v.literal("finalized")),
		currentFinalizedVersion: v.optional(v.number()), // v1, v2, v3, etc.
		deletedAt: v.optional(v.number()),
		createdAt: v.number(),
		updatedAt: v.number(),
	})
		.index("by_projectId", ["projectId"])
		.index("by_projectId_status", ["projectId", "status"])
		.index("by_projectId_categoryId", ["projectId", "categoryId"])
		.index("by_projectId_deletedAt", ["projectId", "deletedAt"])
		.index("by_parentContentId", ["parentContentId"]),

	// Content Versions - version history for each content piece
	contentVersions: defineTable({
		contentPieceId: v.id("contentPieces"),
		versionNumber: v.number(), // Sequential version number
		content: v.string(), // JSON string snapshot
		label: v.optional(v.string()), // Optional version label
		isFinalizedVersion: v.boolean(), // Whether this is a finalized milestone
		finalizedVersionNumber: v.optional(v.number()), // v1, v2, v3 if finalized
		createdAt: v.number(),
	})
		.index("by_contentPieceId", ["contentPieceId"])
		.index("by_contentPieceId_versionNumber", ["contentPieceId", "versionNumber"]),

	// Content Chat Messages - AI chat history per content piece
	contentChatMessages: defineTable({
		contentPieceId: v.id("contentPieces"),
		role: v.union(v.literal("user"), v.literal("assistant")),
		content: v.string(),
		createdAt: v.number(),
	}).index("by_contentPieceId", ["contentPieceId"]),

	// Content Images - images attached to content pieces
	contentImages: defineTable({
		contentPieceId: v.id("contentPieces"),
		fileId: v.id("files"), // Reference to files table
		caption: v.optional(v.string()),
		sortOrder: v.number(),
		generatedPrompt: v.optional(v.string()), // If AI-generated
		createdAt: v.number(),
	}).index("by_contentPieceId", ["contentPieceId"]),

	// Image Prompt Templates - reusable AI image prompts
	imagePromptTemplates: defineTable({
		projectId: v.id("projects"),
		name: v.string(),
		imageType: v.union(
			v.literal("infographic"),
			v.literal("illustration"),
			v.literal("photo"),
			v.literal("diagram")
		),
		promptTemplate: v.string(),
		createdAt: v.number(),
		updatedAt: v.number(),
	}).index("by_projectId", ["projectId"]),

	// Activity Log - for dashboard activity feed
	activityLog: defineTable({
		workspaceId: v.id("workspaces"),
		projectId: v.id("projects"),
		contentPieceId: v.optional(v.id("contentPieces")),
		action: v.union(
			v.literal("content_created"),
			v.literal("content_edited"),
			v.literal("content_finalized"),
			v.literal("content_deleted"),
			v.literal("project_created"),
			v.literal("derived_content_created")
		),
		metadata: v.optional(v.string()), // JSON string for additional data
		createdAt: v.number(),
	})
		.index("by_workspaceId", ["workspaceId"])
		.index("by_projectId", ["projectId"])
		.index("by_workspaceId_createdAt", ["workspaceId", "createdAt"]),

	// ===== TOKEN BILLING SYSTEM TABLES =====

	// Token Accounts - User token balance and settings
	tokenAccounts: defineTable({
		userId: v.id("users"),
		workspaceId: v.id("workspaces"),

		// Balance
		balance: v.number(),
		lifetimeTokensPurchased: v.number(),
		lifetimeTokensUsed: v.number(),
		lifetimeActualTokensUsed: v.number(),
		lifetimeSpentCents: v.number(),

		// Auto-Recharge
		autoRechargeEnabled: v.boolean(),
		autoRechargeThreshold: v.optional(v.number()),
		autoRechargeAmount: v.optional(v.number()),

		// Stripe
		stripeCustomerId: v.optional(v.string()),
		defaultPaymentMethodId: v.optional(v.string()),

		// International
		currency: v.string(), // "usd", "eur", "gbp"

		// Status
		status: v.union(
			v.literal("active"),
			v.literal("suspended"),
			v.literal("blocked")
		),

		lastPurchaseAt: v.optional(v.number()),
		createdAt: v.number(),
		updatedAt: v.number(),
	})
		.index("by_userId", ["userId"])
		.index("by_workspaceId", ["workspaceId"])
		.index("by_status", ["status"]),

	// Token Usage - Detailed usage logs
	tokenUsage: defineTable({
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
		provider: v.union(
			v.literal("openai"),
			v.literal("anthropic"),
			v.literal("google")
		),
		model: v.string(),

		// LLM Tokens (optional for fixed-cost)
		inputTokens: v.optional(v.number()),
		outputTokens: v.optional(v.number()),
		totalTokens: v.optional(v.number()),

		// Image Details
		imageCount: v.optional(v.number()),
		imageSize: v.optional(v.string()),

		// Billing
		billableTokens: v.number(),
		chargeType: v.union(v.literal("multiplier"), v.literal("fixed")),
		multiplier: v.optional(v.number()),
		fixedCost: v.optional(v.number()),

		// Metadata
		requestMetadata: v.optional(v.string()),
		success: v.boolean(),
		errorMessage: v.optional(v.string()),

		createdAt: v.number(),
	})
		.index("by_userId", ["userId"])
		.index("by_userId_createdAt", ["userId", "createdAt"])
		.index("by_workspaceId", ["workspaceId"])
		.index("by_projectId", ["projectId"])
		.index("by_createdAt", ["createdAt"]),

	// Token Transactions - Financial ledger
	tokenTransactions: defineTable({
		userId: v.id("users"),
		workspaceId: v.id("workspaces"),

		transactionType: v.union(
			v.literal("purchase"),
			v.literal("usage"),
			v.literal("admin_grant"),
			v.literal("admin_deduction"),
			v.literal("refund"),
			v.literal("bonus"),
			v.literal("auto_recharge")
		),

		tokenAmount: v.number(),
		balanceBefore: v.number(),
		balanceAfter: v.number(),
		amountCents: v.optional(v.number()),

		// References
		tokenUsageId: v.optional(v.id("tokenUsage")),
		stripePaymentIntentId: v.optional(v.string()),
		adminUserId: v.optional(v.id("users")),

		description: v.string(),
		metadata: v.optional(v.string()),

		createdAt: v.number(),
	})
		.index("by_userId", ["userId"])
		.index("by_userId_createdAt", ["userId", "createdAt"])
		.index("by_workspaceId", ["workspaceId"])
		.index("by_transactionType", ["transactionType"])
		.index("by_stripePaymentIntentId", ["stripePaymentIntentId"]),

	// Token Pricing - Token packages
	tokenPricing: defineTable({
		packageName: v.string(),
		tokenAmount: v.number(),
		priceCents: v.number(),

		description: v.optional(v.string()),
		isPopular: v.boolean(),
		sortOrder: v.number(),

		stripePriceId: v.string(),

		// Multi-currency (future)
		priceEUR: v.optional(v.number()),
		priceGBP: v.optional(v.number()),

		active: v.boolean(),
		createdAt: v.number(),
		updatedAt: v.number(),
	})
		.index("by_active", ["active"])
		.index("by_sortOrder", ["sortOrder"]),

	// System Settings - Global configuration
	systemSettings: defineTable({
		key: v.string(), // "global_settings"

		// Token Multiplier
		defaultTokenMultiplier: v.number(), // 1.5

		// Fixed Costs
		imageGenerationCostDallE3: v.number(), // 6000 tokens
		imageGenerationCostDallE2: v.number(), // 3000 tokens
		imageGenerationCostGoogle: v.number(), // 4500 tokens

		// Purchase Config
		tokensPerUSD: v.number(), // 10000
		minPurchaseAmountCents: v.number(), // 500

		// Welcome Bonus
		newUserBonusTokens: v.number(), // 10000

		// Alerts
		lowBalanceThreshold: v.number(), // 1000
		criticalBalanceThreshold: v.number(), // 100

		updatedAt: v.number(),
		updatedBy: v.optional(v.id("users")),
	}).index("by_key", ["key"]),
});
