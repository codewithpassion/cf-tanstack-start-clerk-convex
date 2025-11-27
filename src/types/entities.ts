/**
 * TypeScript type definitions for all core entities in the PostMate application.
 * These types mirror the Convex schema and provide type safety for frontend consumption.
 */
import type { Doc, Id } from "../../convex/_generated/dataModel";

// Re-export Id types for convenience
export type { Id };

// Document types inferred from Convex schema
export type User = Doc<"users">;
export type Workspace = Doc<"workspaces">;
export type Project = Doc<"projects">;
export type Category = Doc<"categories">;
export type BrandVoice = Doc<"brandVoices">;
export type Persona = Doc<"personas">;
export type KnowledgeBaseItem = Doc<"knowledgeBaseItems">;
export type Example = Doc<"examples">;
export type File = Doc<"files">;

// ID types for each entity
export type UserId = Id<"users">;
export type WorkspaceId = Id<"workspaces">;
export type ProjectId = Id<"projects">;
export type CategoryId = Id<"categories">;
export type BrandVoiceId = Id<"brandVoices">;
export type PersonaId = Id<"personas">;
export type KnowledgeBaseItemId = Id<"knowledgeBaseItems">;
export type ExampleId = Id<"examples">;
export type FileId = Id<"files">;

// Input types for creating entities (without auto-generated fields)
export type CreateWorkspaceInput = {
	userId: UserId;
	onboardingCompleted: boolean;
};

export type CreateProjectInput = {
	workspaceId: WorkspaceId;
	name: string;
	description?: string;
};

export type UpdateProjectInput = {
	projectId: ProjectId;
	name?: string;
	description?: string;
};

export type CreateCategoryInput = {
	projectId: ProjectId;
	name: string;
	description?: string;
	formatGuidelines?: string;
	isDefault?: boolean;
	sortOrder?: number;
};

export type UpdateCategoryInput = {
	categoryId: CategoryId;
	name?: string;
	description?: string;
	formatGuidelines?: string;
};

export type CreateBrandVoiceInput = {
	projectId: ProjectId;
	name: string;
	description?: string;
};

export type UpdateBrandVoiceInput = {
	brandVoiceId: BrandVoiceId;
	name?: string;
	description?: string;
};

export type CreatePersonaInput = {
	projectId: ProjectId;
	name: string;
	description?: string;
};

export type UpdatePersonaInput = {
	personaId: PersonaId;
	name?: string;
	description?: string;
};

export type CreateKnowledgeBaseItemInput = {
	categoryId: CategoryId;
	projectId: ProjectId;
	title: string;
	content?: string;
	fileId?: FileId;
};

export type UpdateKnowledgeBaseItemInput = {
	itemId: KnowledgeBaseItemId;
	title?: string;
	content?: string;
};

export type CreateExampleInput = {
	categoryId: CategoryId;
	projectId: ProjectId;
	title: string;
	content?: string;
	notes?: string;
	fileId?: FileId;
};

export type UpdateExampleInput = {
	exampleId: ExampleId;
	title?: string;
	content?: string;
	notes?: string;
};

// File ownership type - one of these must be set
export type FileOwnerType =
	| "brandVoice"
	| "persona"
	| "knowledgeBaseItem"
	| "example";

export type CreateFileInput = {
	ownerType: FileOwnerType;
	ownerId: BrandVoiceId | PersonaId | KnowledgeBaseItemId | ExampleId;
	filename: string;
	mimeType: string;
	sizeBytes: number;
	r2Key: string;
	extractedText?: string;
};

// Allowed MIME types for file uploads
export const ALLOWED_MIME_TYPES = [
	"text/plain",
	"application/pdf",
	"application/msword",
	"application/vnd.openxmlformats-officedocument.wordprocessingml.document",
	"image/jpeg",
	"image/png",
	"image/gif",
	"image/webp",
] as const;

export type AllowedMimeType = (typeof ALLOWED_MIME_TYPES)[number];

// File size limit (15MB in bytes)
export const MAX_FILE_SIZE_BYTES = 15728640;

// Validation constants
export const VALIDATION = {
	project: {
		nameMaxLength: 100,
		descriptionMaxLength: 2000,
	},
	category: {
		nameMaxLength: 50,
		descriptionMaxLength: 2000,
		formatGuidelinesMaxLength: 5000,
	},
	brandVoice: {
		nameMaxLength: 100,
		descriptionMaxLength: 2000,
	},
	persona: {
		nameMaxLength: 100,
		descriptionMaxLength: 2000,
	},
	knowledgeBaseItem: {
		titleMaxLength: 200,
		contentMaxLength: 50000,
	},
	example: {
		titleMaxLength: 200,
		contentMaxLength: 50000,
		notesMaxLength: 2000,
	},
	file: {
		filenameMaxLength: 255,
		maxSizeBytes: MAX_FILE_SIZE_BYTES,
		extractedTextMaxLength: 50000,
	},
} as const;
