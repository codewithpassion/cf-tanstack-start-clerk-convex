/**
 * Image Generation Server Function
 *
 * Re-exports the existing image generation functionality.
 * This module uses the strategy pattern implemented in image-generation/.
 */

import { createServerFn } from "@tanstack/react-start";
import { auth } from "@clerk/tanstack-react-start/server";
import { ImageGenerationFactory } from "../../image-generation/factory";
import type {
	GenerateImageInput,
	GenerateImagesResult,
} from "../../image-generation/types";

/**
 * Generate image using configured strategy
 */
export const generateImage = createServerFn({ method: "POST" })
	.inputValidator((input: GenerateImageInput) => input)
	.handler(async ({ data }): Promise<GenerateImagesResult> => {
		try {
			const { userId } = await auth();
			if (!userId) {
				throw new Error("Authentication required");
			}

			const env = process.env;
			const strategy = ImageGenerationFactory.createStrategy(env);

			return await strategy.generate(data, userId);
		} catch (error) {
			console.error("Image generation error:", error);

			let errorMessage =
				error instanceof Error ? error.message : "Unknown error occurred";

			if (errorMessage.includes("rate limit")) {
				throw error;
			}

			if (
				errorMessage.includes("content policy") ||
				errorMessage.includes("safety")
			) {
				errorMessage =
					"Image prompt violates content policy. Please modify your prompt and try again.";
			} else if (
				errorMessage.includes("quota") ||
				errorMessage.includes("billing")
			) {
				errorMessage = "API quota exceeded. Please contact support.";
			} else if (errorMessage.includes("download")) {
				errorMessage = `${errorMessage}. The image was generated but could not be downloaded. Please try again.`;
			}

			throw new Error(`Failed to generate image: ${errorMessage}`);
		}
	});

// Re-export types
export type { GenerateImageInput, GenerateImagesResult };
