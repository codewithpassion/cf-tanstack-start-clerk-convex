/**
 * Convex queries and mutations for workspace management.
 * Handles workspace retrieval and onboarding state management.
 */
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import {
	authorizeWorkspaceAccess,
	getCurrentUserWithOptionalWorkspace,
} from "./lib/auth";

/**
 * Get the current user's workspace.
 * Returns the workspace associated with the authenticated user.
 */
export const getMyWorkspace = query({
	args: {},
	handler: async (ctx) => {
		const result = await getCurrentUserWithOptionalWorkspace(ctx);
		if (!result) {
			return null;
		}

		return result.workspace ?? null;
	},
});

/**
 * Check if the current user needs to complete onboarding.
 * Returns true if workspace exists but onboardingCompleted is false.
 * Returns null if user is not authenticated or workspace doesn't exist.
 */
export const needsOnboarding = query({
	args: {},
	handler: async (ctx) => {
		const result = await getCurrentUserWithOptionalWorkspace(ctx);
		if (!result) {
			return null;
		}

		if (!result.workspace) {
			return null;
		}

		return !result.workspace.onboardingCompleted;
	},
});

/**
 * Mark the current user's workspace onboarding as complete.
 * Sets onboardingCompleted to true and updates the timestamp.
 */
export const completeOnboarding = mutation({
	args: {},
	handler: async (ctx) => {
		const { workspace } = await authorizeWorkspaceAccess(ctx);

		await ctx.db.patch(workspace._id, {
			onboardingCompleted: true,
			updatedAt: Date.now(),
		});

		return { success: true };
	},
});

/**
 * Update the current user's workspace theme preference.
 * Sets the theme preference (light, dark, or system) and updates the timestamp.
 */
export const updateThemePreference = mutation({
	args: {
		themePreference: v.union(
			v.literal("light"),
			v.literal("dark"),
			v.literal("system"),
		),
	},
	handler: async (ctx, { themePreference }) => {
		const { workspace } = await authorizeWorkspaceAccess(ctx);

		await ctx.db.patch(workspace._id, {
			themePreference,
			updatedAt: Date.now(),
		});

		return { success: true };
	},
});
