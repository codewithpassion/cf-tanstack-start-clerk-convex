/**
 * Convex queries and mutations for persona management.
 * Handles persona CRUD operations with soft delete support and file attachment capabilities.
 */
import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { authorizeWorkspaceAccess } from "./lib/auth";

/**
 * Validation constants for persona fields.
 */
const PERSONA_NAME_MAX_LENGTH = 100;
const PERSONA_DESCRIPTION_MAX_LENGTH = 2000;

/**
 * Validate persona name.
 * @throws ConvexError if name is invalid
 */
function validatePersonaName(name: string): string {
	const trimmed = name.trim();
	if (!trimmed) {
		throw new ConvexError("Persona name is required");
	}
	if (trimmed.length > PERSONA_NAME_MAX_LENGTH) {
		throw new ConvexError(`Persona name must be ${PERSONA_NAME_MAX_LENGTH} characters or less`);
	}
	return trimmed;
}

/**
 * Validate persona description.
 * @throws ConvexError if description is invalid
 */
function validatePersonaDescription(description: string | undefined): string | undefined {
	if (!description) {
		return undefined;
	}
	const trimmed = description.trim();
	if (trimmed.length > PERSONA_DESCRIPTION_MAX_LENGTH) {
		throw new ConvexError(`Persona description must be ${PERSONA_DESCRIPTION_MAX_LENGTH} characters or less`);
	}
	return trimmed || undefined;
}

/**
 * List all non-deleted personas for a project.
 * Returns personas sorted by createdAt descending (most recent first).
 */
export const listPersonas = query({
	args: {
		projectId: v.id("projects"),
	},
	handler: async (ctx, { projectId }) => {
		const { workspace } = await authorizeWorkspaceAccess(ctx);

		// Verify project exists and belongs to workspace
		const project = await ctx.db.get(projectId);
		if (!project || project.workspaceId !== workspace._id || project.deletedAt) {
			throw new ConvexError("Project not found");
		}

		const personas = await ctx.db
			.query("personas")
			.withIndex("by_projectId", (q) => q.eq("projectId", projectId))
			.collect();

		// Filter out soft-deleted personas and sort by createdAt descending
		return personas
			.filter((p) => !p.deletedAt)
			.sort((a, b) => b.createdAt - a.createdAt);
	},
});

/**
 * Get a single persona by ID with authorization check.
 * Returns the persona without files. Use getPersonaFiles to retrieve attached files.
 */
export const getPersona = query({
	args: {
		personaId: v.id("personas"),
	},
	handler: async (ctx, { personaId }) => {
		const { workspace } = await authorizeWorkspaceAccess(ctx);

		const persona = await ctx.db.get(personaId);

		if (!persona) {
			throw new ConvexError("Persona not found");
		}

		// Verify persona belongs to a project in the user's workspace
		const project = await ctx.db.get(persona.projectId);
		if (!project || project.workspaceId !== workspace._id) {
			throw new ConvexError("Persona not found");
		}

		if (persona.deletedAt) {
			throw new ConvexError("Persona not found");
		}

		return persona;
	},
});

/**
 * Get files attached to a persona.
 * Returns all files associated with the specified persona ID.
 */
export const getPersonaFiles = query({
	args: {
		personaId: v.id("personas"),
	},
	handler: async (ctx, { personaId }) => {
		const { workspace } = await authorizeWorkspaceAccess(ctx);

		// Verify persona exists and belongs to workspace
		const persona = await ctx.db.get(personaId);
		if (!persona) {
			throw new ConvexError("Persona not found");
		}

		const project = await ctx.db.get(persona.projectId);
		if (!project || project.workspaceId !== workspace._id) {
			throw new ConvexError("Persona not found");
		}

		if (persona.deletedAt) {
			throw new ConvexError("Persona not found");
		}

		// Get all files for this persona
		const files = await ctx.db
			.query("files")
			.withIndex("by_personaId", (q) => q.eq("personaId", personaId))
			.collect();

		return files;
	},
});

/**
 * Create a new persona.
 * Creates a persona with the specified name and optional description.
 */
export const createPersona = mutation({
	args: {
		projectId: v.id("projects"),
		name: v.string(),
		description: v.optional(v.string()),
	},
	handler: async (ctx, { projectId, name, description }) => {
		const { workspace } = await authorizeWorkspaceAccess(ctx);

		// Verify project exists and belongs to workspace
		const project = await ctx.db.get(projectId);
		if (!project || project.workspaceId !== workspace._id) {
			throw new ConvexError("Project not found");
		}

		if (project.deletedAt) {
			throw new ConvexError("Cannot add persona to a deleted project");
		}

		// Validate inputs
		const validatedName = validatePersonaName(name);
		const validatedDescription = validatePersonaDescription(description);

		const now = Date.now();

		// Create the persona
		const personaId = await ctx.db.insert("personas", {
			projectId,
			name: validatedName,
			description: validatedDescription,
			createdAt: now,
			updatedAt: now,
		});

		return { personaId };
	},
});

/**
 * Update an existing persona.
 * Updates the specified fields and sets updatedAt to current timestamp.
 */
export const updatePersona = mutation({
	args: {
		personaId: v.id("personas"),
		name: v.optional(v.string()),
		description: v.optional(v.string()),
	},
	handler: async (ctx, { personaId, name, description }) => {
		const { workspace } = await authorizeWorkspaceAccess(ctx);

		// Verify persona exists and belongs to workspace
		const persona = await ctx.db.get(personaId);
		if (!persona) {
			throw new ConvexError("Persona not found");
		}

		const project = await ctx.db.get(persona.projectId);
		if (!project || project.workspaceId !== workspace._id) {
			throw new ConvexError("Persona not found");
		}

		if (persona.deletedAt) {
			throw new ConvexError("Cannot update a deleted persona");
		}

		// Build update object with only provided fields
		const updates: {
			name?: string;
			description?: string;
			updatedAt: number;
		} = {
			updatedAt: Date.now(),
		};

		if (name !== undefined) {
			updates.name = validatePersonaName(name);
		}

		if (description !== undefined) {
			updates.description = validatePersonaDescription(description);
		}

		await ctx.db.patch(personaId, updates);

		return { success: true };
	},
});

/**
 * Soft delete a persona.
 * Sets deletedAt timestamp instead of permanently removing the record.
 * Files attached to the persona are not deleted but will not be accessible
 * once the persona is soft deleted.
 */
export const deletePersona = mutation({
	args: {
		personaId: v.id("personas"),
	},
	handler: async (ctx, { personaId }) => {
		const { workspace } = await authorizeWorkspaceAccess(ctx);

		// Verify persona exists and belongs to workspace
		const persona = await ctx.db.get(personaId);
		if (!persona) {
			throw new ConvexError("Persona not found");
		}

		const project = await ctx.db.get(persona.projectId);
		if (!project || project.workspaceId !== workspace._id) {
			throw new ConvexError("Persona not found");
		}

		if (persona.deletedAt) {
			throw new ConvexError("Persona is already deleted");
		}

		// Soft delete by setting deletedAt timestamp
		await ctx.db.patch(personaId, {
			deletedAt: Date.now(),
			updatedAt: Date.now(),
		});

		return { success: true };
	},
});
