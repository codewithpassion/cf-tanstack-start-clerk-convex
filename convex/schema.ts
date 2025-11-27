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
		createdAt: v.number(),
		updatedAt: v.number(),
	})
		.index("by_email", ["email"])
		.index("by_clerkId", ["clerkId"]),

	// Workspaces - 1:1 with users
	workspaces: defineTable({
		userId: v.id("users"),
		onboardingCompleted: v.boolean(),
		createdAt: v.number(),
		updatedAt: v.number(),
	}).index("by_userId", ["userId"]),

	// Projects - belong to workspace
	projects: defineTable({
		workspaceId: v.id("workspaces"),
		name: v.string(),
		description: v.optional(v.string()),
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
		// File metadata
		filename: v.string(),
		mimeType: v.string(),
		sizeBytes: v.number(),
		r2Key: v.string(), // Cloudflare R2 object key
		extractedText: v.optional(v.string()), // Parsed text content
		createdAt: v.number(),
	})
		.index("by_brandVoiceId", ["brandVoiceId"])
		.index("by_personaId", ["personaId"])
		.index("by_knowledgeBaseItemId", ["knowledgeBaseItemId"])
		.index("by_exampleId", ["exampleId"])
		.index("by_r2Key", ["r2Key"]),
});
