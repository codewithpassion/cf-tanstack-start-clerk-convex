/**
 * Server Function Handlers
 *
 * Thin wrappers around AI services that handle TanStack server function creation.
 * These are the entry points called from the client.
 */

import { createServerFn } from "@tanstack/react-start";
import { api } from "@/convex/api";
import { getAuthenticatedConvexClient, getAIEnvironment } from "../../utils";
import {
	DraftGenerationService,
	RefineContentService,
	RefineSelectionService,
	ChatService,
	RepurposeService,
	ImagePromptService,
} from "../services";
import type {
	GenerateDraftInput,
	RefineContentInput,
	RefineSelectionInput,
	GenerateChatResponseInput,
	RepurposeContentInput,
	GenerateImagePromptInput,
} from "../core/types";
import { AuthenticationError, ResourceNotFoundError } from "../core/errors";

/**
 * Get authenticated context for AI operations
 */
async function getAuthContext() {
	const convex = await getAuthenticatedConvexClient();

	const user = await convex.query(api.users.getMe);
	if (!user) {
		throw new AuthenticationError("User not found");
	}

	const workspace = await convex.query(api.workspaces.getMyWorkspace);
	if (!workspace) {
		throw new ResourceNotFoundError("Workspace");
	}

	return {
		convex,
		userId: user._id,
		workspaceId: workspace._id,
	};
}

/**
 * Create service dependencies
 */
function createServiceDeps(convex: Awaited<ReturnType<typeof getAuthenticatedConvexClient>>) {
	return {
		convex,
		billingSecret: process.env.BILLING_SECRET!,
		env: getAIEnvironment(),
	};
}

// =============================================================================
// Server Functions
// =============================================================================

/**
 * Generate AI draft with streaming response
 */
export const generateDraft = createServerFn({ method: "POST" })
	.inputValidator((input: GenerateDraftInput) => input)
	.handler(async ({ data }) => {
		const { convex, userId, workspaceId } = await getAuthContext();
		const service = new DraftGenerationService(createServiceDeps(convex));
		return service.execute(data, { userId, workspaceId });
	});

/**
 * Refine content with streaming response
 */
export const refineContent = createServerFn({ method: "POST" })
	.inputValidator((input: RefineContentInput) => input)
	.handler(async ({ data }) => {
		const { convex, userId, workspaceId } = await getAuthContext();
		const service = new RefineContentService(createServiceDeps(convex));
		return service.execute(data, { userId, workspaceId });
	});

/**
 * Refine selection with streaming response
 */
export const refineSelection = createServerFn({ method: "POST" })
	.inputValidator((input: RefineSelectionInput) => input)
	.handler(async ({ data }) => {
		const { convex, userId, workspaceId } = await getAuthContext();
		const service = new RefineSelectionService(createServiceDeps(convex));
		return service.execute(data, { userId, workspaceId });
	});

/**
 * Generate chat response with streaming
 */
export const generateChatResponse = createServerFn({ method: "POST" })
	.inputValidator((input: GenerateChatResponseInput) => input)
	.handler(async ({ data }) => {
		const { convex, userId, workspaceId } = await getAuthContext();
		const service = new ChatService(createServiceDeps(convex));
		return service.execute(data, { userId, workspaceId });
	});

/**
 * Repurpose content with streaming response
 */
export const repurposeContent = createServerFn({ method: "POST" })
	.inputValidator((input: RepurposeContentInput) => input)
	.handler(async ({ data }) => {
		const { convex, userId, workspaceId } = await getAuthContext();
		const service = new RepurposeService(createServiceDeps(convex));
		return service.execute(data, { userId, workspaceId });
	});

/**
 * Generate image prompt (non-streaming)
 */
export const generateImagePrompt = createServerFn({ method: "POST" })
	.inputValidator((input: GenerateImagePromptInput) => input)
	.handler(async ({ data }) => {
		const { convex, userId, workspaceId } = await getAuthContext();
		const service = new ImagePromptService(createServiceDeps(convex));
		return service.execute(data, { userId, workspaceId });
	});
