import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireAuth } from "./auth";

const channelValidator = v.object({
	email: v.boolean(),
	inApp: v.boolean(),
});

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export const listForUser = query({
	args: { limit: v.optional(v.number()) },
	handler: async (ctx, args) => {
		const user = await requireAuth(ctx);
		const limit = args.limit ?? 20;

		const notifications = await ctx.db
			.query("notifications")
			.withIndex("by_user", (q) => q.eq("userId", user.clerkId))
			.order("desc")
			.take(limit);

		return notifications;
	},
});

export const getUnreadCount = query({
	args: {},
	handler: async (ctx) => {
		const user = await requireAuth(ctx);

		const unread = await ctx.db
			.query("notifications")
			.withIndex("by_user_unread", (q) =>
				q.eq("userId", user.clerkId).eq("isRead", false),
			)
			.collect();

		return unread.length;
	},
});

export const getPreferences = query({
	args: {},
	handler: async (ctx) => {
		const user = await requireAuth(ctx);

		const prefs = await ctx.db
			.query("notificationPreferences")
			.withIndex("by_user", (q) => q.eq("userId", user.clerkId))
			.unique();

		if (!prefs) {
			return {
				deadlineReminders: { email: true, inApp: true },
				approvalNotifications: { email: true, inApp: true },
				resultAnnouncements: { email: true, inApp: true },
				teamInvitations: { email: true, inApp: true },
				qnaUpdates: { email: false, inApp: true },
			};
		}

		return {
			deadlineReminders: prefs.deadlineReminders,
			approvalNotifications: prefs.approvalNotifications,
			resultAnnouncements: prefs.resultAnnouncements,
			teamInvitations: prefs.teamInvitations,
			qnaUpdates: prefs.qnaUpdates,
		};
	},
});

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

export const markAsRead = mutation({
	args: { notificationId: v.id("notifications") },
	handler: async (ctx, args) => {
		const user = await requireAuth(ctx);
		const notification = await ctx.db.get(args.notificationId);

		if (!notification) throw new ConvexError("Notification not found");
		if (notification.userId !== user.clerkId) {
			throw new ConvexError("Not your notification");
		}

		await ctx.db.patch(args.notificationId, { isRead: true });
	},
});

export const markAllAsRead = mutation({
	args: {},
	handler: async (ctx) => {
		const user = await requireAuth(ctx);

		const unread = await ctx.db
			.query("notifications")
			.withIndex("by_user_unread", (q) =>
				q.eq("userId", user.clerkId).eq("isRead", false),
			)
			.collect();

		await Promise.all(
			unread.map((n) => ctx.db.patch(n._id, { isRead: true })),
		);
	},
});

export const createNotification = mutation({
	args: {
		userId: v.string(),
		hackathonId: v.optional(v.id("hackathons")),
		type: v.string(),
		title: v.string(),
		message: v.string(),
		actionUrl: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		await ctx.db.insert("notifications", {
			userId: args.userId,
			hackathonId: args.hackathonId,
			type: args.type,
			title: args.title,
			message: args.message,
			isRead: false,
			actionUrl: args.actionUrl,
			createdAt: Date.now(),
		});
	},
});

export const deleteNotification = mutation({
	args: { notificationId: v.id("notifications") },
	handler: async (ctx, args) => {
		const user = await requireAuth(ctx);
		const notification = await ctx.db.get(args.notificationId);

		if (!notification) throw new ConvexError("Notification not found");
		if (notification.userId !== user.clerkId) {
			throw new ConvexError("Not your notification");
		}

		await ctx.db.delete(args.notificationId);
	},
});

export const updatePreferences = mutation({
	args: {
		deadlineReminders: channelValidator,
		approvalNotifications: channelValidator,
		resultAnnouncements: channelValidator,
		teamInvitations: channelValidator,
		qnaUpdates: channelValidator,
	},
	handler: async (ctx, args) => {
		const user = await requireAuth(ctx);

		const existing = await ctx.db
			.query("notificationPreferences")
			.withIndex("by_user", (q) => q.eq("userId", user.clerkId))
			.unique();

		const data = {
			userId: user.clerkId,
			deadlineReminders: args.deadlineReminders,
			approvalNotifications: args.approvalNotifications,
			resultAnnouncements: args.resultAnnouncements,
			teamInvitations: args.teamInvitations,
			qnaUpdates: args.qnaUpdates,
			updatedAt: Date.now(),
		};

		if (existing) {
			await ctx.db.patch(existing._id, data);
		} else {
			await ctx.db.insert("notificationPreferences", data);
		}
	},
});
