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
 * Result from image generation
 */
export interface GenerateImageResult {
	fileId: Id<"files">;
	r2Key: string;
	previewUrl: string;
}

/**
 * Image Generation Strategy Interface
 */
export interface ImageGenerationStrategy {
	generate(
		input: GenerateImageInput,
		userId: string,
	): Promise<GenerateImageResult>;
}
