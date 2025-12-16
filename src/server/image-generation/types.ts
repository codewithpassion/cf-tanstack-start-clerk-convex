import type { Id } from "../../../convex/_generated/dataModel";

/**
 * Aspect ratio options for image generation
 */
export type ImageAspectRatio = "square" | "landscape" | "portrait";

/**
 * Input parameters for image generation
 */
export interface GenerateImageInput {
	prompt: string;
	aspectRatio?: ImageAspectRatio;
	workspaceId: Id<"workspaces">;
	projectId: Id<"projects">;
}

/**
 * Result from a single generated image
 */
export interface GenerateImageResult {
	fileId: Id<"files">;
	r2Key: string;
	previewUrl: string;
}

/**
 * Result from image generation (supports multiple images)
 */
export interface GenerateImagesResult {
	images: GenerateImageResult[];
}

/**
 * Image Generation Strategy Interface
 */
export interface ImageGenerationStrategy {
	generate(
		input: GenerateImageInput,
		userId: string,
	): Promise<GenerateImagesResult>;
}
