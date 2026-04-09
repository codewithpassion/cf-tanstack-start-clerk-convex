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

	userProfiles: defineTable({
		userId: v.string(), // clerkId
		bio: v.optional(v.string()),
		location: v.optional(v.string()),
		skills: v.optional(v.array(v.string())),
		githubUrl: v.optional(v.string()),
		linkedinUrl: v.optional(v.string()),
		portfolioUrl: v.optional(v.string()),
		avatarUrl: v.optional(v.string()),
		updatedAt: v.number(),
	}).index("by_user", ["userId"]),

	hackathons: defineTable({
		name: v.string(),
		slug: v.string(),
		description: v.string(),
		theme: v.optional(v.string()),
		ownerId: v.string(), // clerkId
		status: v.union(
			v.literal("draft"),
			v.literal("open"),
			v.literal("active"),
			v.literal("judging"),
			v.literal("closed"),
			v.literal("archived"),
		),
		visibility: v.union(v.literal("public"), v.literal("private")),
		startDate: v.optional(v.number()),
		endDate: v.optional(v.number()),
		submissionCutoff: v.optional(v.number()),
		problemModerationMode: v.union(
			v.literal("auto"),
			v.literal("manual"),
		),
		solutionModerationMode: v.union(
			v.literal("auto"),
			v.literal("manual"),
		),
		sponsorsContent: v.optional(v.string()),
		prizesContent: v.optional(v.string()),
		rulesContent: v.optional(v.string()),
		eligibilityContent: v.optional(v.string()),
		galleryPublic: v.boolean(),
		archivedAt: v.optional(v.number()),
		archivedBy: v.optional(v.string()),
		createdAt: v.number(),
		updatedAt: v.number(),
	})
		.index("by_owner", ["ownerId"])
		.index("by_slug", ["slug"])
		.index("by_status", ["status"])
		.index("by_visibility", ["visibility"]),

	categories: defineTable({
		hackathonId: v.id("hackathons"),
		name: v.string(),
		description: v.optional(v.string()),
		order: v.number(),
		createdAt: v.number(),
	}).index("by_hackathon", ["hackathonId"]),

	hackathonRoles: defineTable({
		hackathonId: v.id("hackathons"),
		userId: v.string(), // clerkId
		role: v.union(
			v.literal("organiser"),
			v.literal("curator"),
			v.literal("judge"),
			v.literal("participant"),
		),
		assignedBy: v.string(), // clerkId
		createdAt: v.number(),
	})
		.index("by_hackathon", ["hackathonId"])
		.index("by_user", ["userId"])
		.index("by_hackathon_user", ["hackathonId", "userId"]),

	roleInvitations: defineTable({
		hackathonId: v.id("hackathons"),
		email: v.string(),
		role: v.union(
			v.literal("organiser"),
			v.literal("curator"),
			v.literal("judge"),
			v.literal("participant"),
		),
		token: v.string(),
		invitedBy: v.string(), // clerkId
		status: v.union(
			v.literal("pending"),
			v.literal("accepted"),
			v.literal("expired"),
			v.literal("revoked"),
		),
		expiresAt: v.number(),
		createdAt: v.number(),
	})
		.index("by_hackathon", ["hackathonId"])
		.index("by_email", ["email"])
		.index("by_token", ["token"]),

	problems: defineTable({
		hackathonId: v.id("hackathons"),
		proposerId: v.string(), // clerkId
		title: v.string(),
		description: v.string(),
		backgroundContext: v.optional(v.string()),
		status: v.union(
			v.literal("pending"),
			v.literal("approved"),
			v.literal("rejected"),
			v.literal("hidden"),
		),
		createdAt: v.number(),
		updatedAt: v.number(),
		approvedBy: v.optional(v.string()),
		approvedAt: v.optional(v.number()),
		hiddenBy: v.optional(v.string()),
		hiddenAt: v.optional(v.number()),
	})
		.index("by_hackathon", ["hackathonId"])
		.index("by_proposer", ["proposerId"])
		.index("by_hackathon_status", ["hackathonId", "status"]),

	problemQuestions: defineTable({
		problemId: v.id("problems"),
		hackathonId: v.id("hackathons"),
		askerId: v.string(), // clerkId
		question: v.string(),
		answer: v.optional(v.string()),
		answeredBy: v.optional(v.string()),
		answeredAt: v.optional(v.number()),
		isPublished: v.boolean(),
		createdAt: v.number(),
	})
		.index("by_problem", ["problemId"])
		.index("by_hackathon", ["hackathonId"])
		.index("by_problem_published", ["problemId", "isPublished"]),

	teams: defineTable({
		hackathonId: v.id("hackathons"),
		name: v.string(),
		leaderId: v.string(), // clerkId
		description: v.optional(v.string()),
		isOpen: v.boolean(),
		inviteCode: v.string(),
		problemIds: v.array(v.id("problems")),
		createdAt: v.number(),
		updatedAt: v.number(),
	})
		.index("by_hackathon", ["hackathonId"])
		.index("by_leader", ["leaderId"])
		.index("by_invite_code", ["inviteCode"]),

	teamMembers: defineTable({
		teamId: v.id("teams"),
		userId: v.string(), // clerkId
		hackathonId: v.id("hackathons"),
		joinedAt: v.number(),
	})
		.index("by_team", ["teamId"])
		.index("by_user", ["userId"])
		.index("by_hackathon_user", ["hackathonId", "userId"]),

	teamJoinRequests: defineTable({
		teamId: v.id("teams"),
		userId: v.string(), // clerkId
		hackathonId: v.id("hackathons"),
		status: v.union(
			v.literal("pending"),
			v.literal("approved"),
			v.literal("rejected"),
		),
		message: v.optional(v.string()),
		createdAt: v.number(),
		resolvedAt: v.optional(v.number()),
		resolvedBy: v.optional(v.string()),
	})
		.index("by_team", ["teamId"])
		.index("by_user", ["userId"])
		.index("by_team_status", ["teamId", "status"]),

	submissions: defineTable({
		hackathonId: v.id("hackathons"),
		teamId: v.id("teams"),
		problemId: v.optional(v.id("problems")),
		categoryIds: v.array(v.id("categories")),
		title: v.string(),
		description: v.string(),
		githubUrl: v.optional(v.string()),
		liveDemoUrl: v.optional(v.string()),
		videoUrl: v.optional(v.string()),
		deckUrl: v.optional(v.string()),
		status: v.union(
			v.literal("draft"),
			v.literal("submitted"),
			v.literal("approved"),
			v.literal("rejected"),
		),
		version: v.number(),
		isLatest: v.boolean(),
		parentId: v.optional(v.id("submissions")),
		createdAt: v.number(),
		updatedAt: v.number(),
		submittedAt: v.optional(v.number()),
		approvedBy: v.optional(v.string()),
		approvedAt: v.optional(v.number()),
	})
		.index("by_hackathon", ["hackathonId"])
		.index("by_team", ["teamId"])
		.index("by_hackathon_status", ["hackathonId", "status"])
		.index("by_team_latest", ["teamId", "isLatest"]),

	judgeAssignments: defineTable({
		hackathonId: v.id("hackathons"),
		judgeId: v.string(), // clerkId
		categoryId: v.optional(v.id("categories")),
		submissionId: v.optional(v.id("submissions")),
		assignedBy: v.string(), // clerkId
		createdAt: v.number(),
	})
		.index("by_hackathon", ["hackathonId"])
		.index("by_judge", ["judgeId"])
		.index("by_hackathon_judge", ["hackathonId", "judgeId"]),

	rankings: defineTable({
		hackathonId: v.id("hackathons"),
		judgeId: v.string(), // clerkId
		submissionId: v.id("submissions"),
		categoryId: v.optional(v.id("categories")),
		rank: v.number(), // 1=first, 2=second, 3=third
		createdAt: v.number(),
		updatedAt: v.number(),
	})
		.index("by_hackathon_judge", ["hackathonId", "judgeId"])
		.index("by_submission", ["submissionId"])
		.index("by_hackathon_category", ["hackathonId", "categoryId"]),

	results: defineTable({
		hackathonId: v.id("hackathons"),
		categoryId: v.optional(v.id("categories")),
		submissionId: v.id("submissions"),
		teamId: v.id("teams"),
		totalPoints: v.number(),
		firstPlaceVotes: v.number(),
		secondPlaceVotes: v.number(),
		thirdPlaceVotes: v.number(),
		rank: v.number(),
		isPublished: v.boolean(),
		overriddenBy: v.optional(v.string()),
		overriddenAt: v.optional(v.number()),
		publishedBy: v.optional(v.string()),
		publishedAt: v.optional(v.number()),
		computedAt: v.number(),
	})
		.index("by_hackathon", ["hackathonId"])
		.index("by_hackathon_category", ["hackathonId", "categoryId"])
		.index("by_hackathon_published", ["hackathonId", "isPublished"]),

	notifications: defineTable({
		userId: v.string(), // clerkId
		hackathonId: v.optional(v.id("hackathons")),
		type: v.string(),
		title: v.string(),
		message: v.string(),
		isRead: v.boolean(),
		actionUrl: v.optional(v.string()),
		createdAt: v.number(),
	})
		.index("by_user", ["userId"])
		.index("by_user_unread", ["userId", "isRead"]),

	notificationPreferences: defineTable({
		userId: v.string(), // clerkId
		deadlineReminders: v.object({
			email: v.boolean(),
			inApp: v.boolean(),
		}),
		approvalNotifications: v.object({
			email: v.boolean(),
			inApp: v.boolean(),
		}),
		resultAnnouncements: v.object({
			email: v.boolean(),
			inApp: v.boolean(),
		}),
		teamInvitations: v.object({
			email: v.boolean(),
			inApp: v.boolean(),
		}),
		qnaUpdates: v.object({
			email: v.boolean(),
			inApp: v.boolean(),
		}),
		updatedAt: v.number(),
	}).index("by_user", ["userId"]),

	auditLogs: defineTable({
		userId: v.string(), // clerkId
		hackathonId: v.optional(v.id("hackathons")),
		action: v.string(),
		entityType: v.optional(v.string()),
		entityId: v.optional(v.string()),
		metadata: v.optional(v.any()),
		ipAddress: v.optional(v.string()),
		userAgent: v.optional(v.string()),
		createdAt: v.number(),
	})
		.index("by_user", ["userId"])
		.index("by_hackathon", ["hackathonId"])
		.index("by_action", ["action"])
		.index("by_created", ["createdAt"]),
});
