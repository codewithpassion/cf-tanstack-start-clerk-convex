import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
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

	organizations: defineTable({
		name: v.string(),
		slug: v.string(),
		description: v.optional(v.string()),
		clerkOrgId: v.string(),
		createdAt: v.number(),
		updatedAt: v.number(),
	})
		.index("by_slug", ["slug"])
		.index("by_clerkOrgId", ["clerkOrgId"]),

	organizationMembers: defineTable({
		orgId: v.id("organizations"),
		userId: v.id("users"),
		clerkUserId: v.string(),
		role: v.union(v.literal("admin"), v.literal("member")),
		createdAt: v.number(),
	})
		.index("by_org", ["orgId"])
		.index("by_user", ["userId"])
		.index("by_clerkUser", ["clerkUserId"])
		.index("by_org_user", ["orgId", "userId"])
		.index("by_org_clerkUser", ["orgId", "clerkUserId"]),

	sources: defineTable({
		orgId: v.id("organizations"),
		type: v.union(
			v.literal("web_search"),
			v.literal("rss"),
			v.literal("website"),
			v.literal("manual"),
		),
		name: v.string(),
		config: v.any(),
		schedule: v.optional(v.string()),
		status: v.union(
			v.literal("active"),
			v.literal("paused"),
			v.literal("deleted"),
		),
		health: v.union(
			v.literal("healthy"),
			v.literal("warning"),
			v.literal("failing"),
		),
		lastRunAt: v.optional(v.number()),
		nextRunAt: v.optional(v.number()),
		lastError: v.optional(v.string()),
		createdAt: v.number(),
		updatedAt: v.number(),
	})
		.index("by_org", ["orgId"])
		.index("by_org_status", ["orgId", "status"])
		.index("by_nextRunAt", ["nextRunAt"]),

	entries: defineTable({
		orgId: v.id("organizations"),
		primarySourceId: v.id("sources"),
		canonicalUrl: v.string(),
		title: v.string(),
		snippet: v.optional(v.string()),
		content: v.optional(v.string()),
		fetchedAt: v.number(),
		publishedAt: v.optional(v.number()),
		used: v.boolean(),
		usedAt: v.optional(v.number()),
		usedByUserId: v.optional(v.id("users")),
		archived: v.boolean(),
		embedding: v.optional(v.array(v.float64())),
	})
		.index("by_org_fetchedAt", ["orgId", "fetchedAt"])
		.index("by_org_canonicalUrl", ["orgId", "canonicalUrl"])
		.index("by_org_used", ["orgId", "used"])
		.index("by_org_archived", ["orgId", "archived"])
		.vectorIndex("by_embedding", {
			vectorField: "embedding",
			dimensions: 1024,
			filterFields: ["orgId", "used", "archived"],
		}),

	entrySources: defineTable({
		entryId: v.id("entries"),
		sourceId: v.id("sources"),
		orgId: v.id("organizations"),
		originalUrl: v.string(),
		foundAt: v.number(),
	})
		.index("by_entry", ["entryId"])
		.index("by_source", ["sourceId"]),

	drafts: defineTable({
		orgId: v.id("organizations"),
		title: v.string(),
		body: v.string(),
		status: v.union(
			v.literal("generating"),
			v.literal("ready"),
			v.literal("finalized"),
			v.literal("reopened"),
		),
		createdAt: v.number(),
		updatedAt: v.number(),
		finalizedAt: v.optional(v.number()),
		createdByUserId: v.id("users"),
	})
		.index("by_org", ["orgId"])
		.index("by_org_status", ["orgId", "status"]),

	draftEntries: defineTable({
		draftId: v.id("drafts"),
		entryId: v.id("entries"),
		orgId: v.id("organizations"),
	})
		.index("by_draft", ["draftId"])
		.index("by_entry", ["entryId"]),

	ghostWriterProfiles: defineTable({
		orgId: v.id("organizations"),
		summary: v.string(),
		voiceAttributes: v.array(v.string()),
		doExamples: v.array(v.string()),
		dontExamples: v.array(v.string()),
		generatedAt: v.number(),
		model: v.string(),
	}).index("by_org", ["orgId"]),

	ghostWriterExamples: defineTable({
		orgId: v.id("organizations"),
		title: v.string(),
		content: v.string(),
		addedByUserId: v.id("users"),
		createdAt: v.number(),
	}).index("by_org", ["orgId"]),

	sourceRuns: defineTable({
		sourceId: v.id("sources"),
		orgId: v.id("organizations"),
		startedAt: v.number(),
		finishedAt: v.optional(v.number()),
		status: v.union(
			v.literal("running"),
			v.literal("success"),
			v.literal("error"),
		),
		itemsAdded: v.optional(v.number()),
		error: v.optional(v.string()),
		acknowledged: v.optional(v.boolean()),
		acknowledgedAt: v.optional(v.number()),
	})
		.index("by_source_startedAt", ["sourceId", "startedAt"])
		.index("by_org_startedAt", ["orgId", "startedAt"]),

	analyticsEvents: defineTable({
		orgId: v.id("organizations"),
		type: v.string(),
		createdAt: v.number(),
	})
		.index("by_org_type_createdAt", ["orgId", "type", "createdAt"])
		.index("by_org_createdAt", ["orgId", "createdAt"]),

	autoDraftSchedules: defineTable({
		orgId: v.id("organizations"),
		enabled: v.boolean(),
		cron: v.string(),
		timezone: v.optional(v.string()),
		lastRunAt: v.optional(v.number()),
		createdByUserId: v.id("users"),
	}).index("by_org", ["orgId"]),
});
