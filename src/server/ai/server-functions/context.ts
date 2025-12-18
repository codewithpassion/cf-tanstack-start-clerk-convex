/**
 * Context Assembly Server Function
 *
 * Server function for assembling generation context.
 * Used by components that need to preview or display context.
 */

import { createServerFn } from "@tanstack/react-start";
import { getAuthenticatedConvexClient } from "../../utils";
import { ContextRepository } from "../context/ContextRepository";
import type { AssembleContextParams, GenerationContext } from "../core/types";

/**
 * Assemble generation context from all relevant sources
 */
export const assembleGenerationContext = createServerFn({ method: "POST" })
	.inputValidator((input: AssembleContextParams) => input)
	.handler(async ({ data }): Promise<GenerationContext> => {
		const convex = await getAuthenticatedConvexClient();
		const repository = new ContextRepository(convex);
		return repository.assembleContext(data);
	});
