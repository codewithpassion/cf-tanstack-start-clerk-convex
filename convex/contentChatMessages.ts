/**
 * Convex queries and mutations for content chat message management.
 * Handles AI chat history persistence per content piece with simple CRUD operations.
 */
import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { authorizeWorkspaceAccess } from "./lib/auth";

/**
 * Validation constants for chat message fields.
 */
const CHAT_MESSAGE_CONTENT_MAX_LENGTH = 10000;

/**
 * Validate chat message content.
 * @throws ConvexError if content is invalid
 */
function validateChatMessageContent(content: string): string {
	const trimmed = content.trim();
	if (!trimmed) {
		throw new ConvexError("Chat message content is required");
	}
	if (trimmed.length > CHAT_MESSAGE_CONTENT_MAX_LENGTH) {
		throw new ConvexError(
			`Chat message content must be ${CHAT_MESSAGE_CONTENT_MAX_LENGTH} characters or less`
		);
	}
	return trimmed;
}

/**
 * Verify that content piece exists and belongs to user's workspace.
 * @throws ConvexError if content piece not found or access denied
 */
async function verifyContentPieceAccess(
	ctx: { db: any },
	contentPieceId: string,
	workspaceId: string
) {
	const contentPiece = await ctx.db.get(contentPieceId);
	if (!contentPiece) {
		throw new ConvexError("Content piece not found");
	}

	const project = await ctx.db.get(contentPiece.projectId);
	if (!project || project.workspaceId !== workspaceId) {
		throw new ConvexError("Content piece not found");
	}

	if (contentPiece.deletedAt) {
		throw new ConvexError("Content piece not found");
	}

	return contentPiece;
}

/**
 * List chat messages for a content piece.
 * Returns messages ordered by createdAt ascending (chronological order).
 */
export const listChatMessages = query({
	args: {
		contentPieceId: v.id("contentPieces"),
	},
	handler: async (ctx, { contentPieceId }) => {
		const { workspace } = await authorizeWorkspaceAccess(ctx);

		// Verify content piece access
		await verifyContentPieceAccess(ctx, contentPieceId, workspace._id);

		// Query all chat messages for this content piece
		const messages = await ctx.db
			.query("contentChatMessages")
			.withIndex("by_contentPieceId", (q) => q.eq("contentPieceId", contentPieceId))
			.collect();

		// Sort by createdAt ascending (oldest first, chronological order)
		messages.sort((a, b) => a.createdAt - b.createdAt);

		return messages;
	},
});

/**
 * Add a new chat message to a content piece.
 * Stores message with role (user or assistant) and content.
 */
export const addChatMessage = mutation({
	args: {
		contentPieceId: v.id("contentPieces"),
		role: v.union(v.literal("user"), v.literal("assistant")),
		content: v.string(),
	},
	handler: async (ctx, { contentPieceId, role, content }) => {
		const { workspace } = await authorizeWorkspaceAccess(ctx);

		// Verify content piece access
		await verifyContentPieceAccess(ctx, contentPieceId, workspace._id);

		// Validate content
		const validatedContent = validateChatMessageContent(content);

		const now = Date.now();

		// Create the chat message
		const messageId = await ctx.db.insert("contentChatMessages", {
			contentPieceId,
			role,
			content: validatedContent,
			createdAt: now,
		});

		return { messageId };
	},
});

/**
 * Clear all chat history for a content piece.
 * Removes all chat messages associated with the content piece.
 */
export const clearChatHistory = mutation({
	args: {
		contentPieceId: v.id("contentPieces"),
	},
	handler: async (ctx, { contentPieceId }) => {
		const { workspace } = await authorizeWorkspaceAccess(ctx);

		// Verify content piece access
		await verifyContentPieceAccess(ctx, contentPieceId, workspace._id);

		// Query all chat messages for this content piece
		const messages = await ctx.db
			.query("contentChatMessages")
			.withIndex("by_contentPieceId", (q) => q.eq("contentPieceId", contentPieceId))
			.collect();

		// Delete all messages
		for (const message of messages) {
			await ctx.db.delete(message._id);
		}

		return { deletedCount: messages.length };
	},
});
