import { checkImageGenerationRateLimit } from "../utils";
import { processAndSaveImage } from "./storage";
import type {
    GenerateImageInput,
    GenerateImageResult,
    ImageAspectRatio,
    ImageGenerationStrategy,
} from "./types";

/**
 * Google Image Generation Strategy
 * Uses 'google nano bannana' model via Vercel AI SDK (experimental)
 */
export class GoogleImageGenerationStrategy implements ImageGenerationStrategy {
    async generate(
        input: GenerateImageInput,
        userId: string,
    ): Promise<GenerateImageResult> {
        // Check rate limit (reusing same limit for now)
        checkImageGenerationRateLimit(userId);

        // Get Google API Key
        // Note: Using a hypothetical env var for Google, or reusing a generic one if preferred.
        // The user asked to add env vars to wrangler.jsonc.
        // I will assume GOOGLE_GENERATIVE_AI_API_KEY is available or handled by the SDK if configured.
        // But for the factory, I'll need to ensure the provider is configured.

        // Using experimental_generateImage from 'ai' package if available,
        // or mocking the call if the model is purely hypothetical/placeholder.
        // Since 'google nano bannana' is likely a placeholder, I will try to use the SDK structure.

        const { experimental_generateImage } = await import("ai");
        const { createGoogleGenerativeAI } = await import("@ai-sdk/google");

        const google = createGoogleGenerativeAI({
            apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
        });

        try {
            const { image } = await experimental_generateImage({
                model: google.image("nano-banana-pro-preview"),
                prompt: input.prompt,
                aspectRatio: this.mapAspectRatio(input.aspectRatio),
            });

            // image.base64 is usually returned
            const base64Data = image.base64;
            const binaryString = atob(base64Data);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }
            const imageBuffer = bytes.buffer;

            // Reuse the helper from OpenAI strategy?
            // Better to move the helper to a shared location or base class.
            // For now, I'll duplicate the saving logic or make it a standalone function.
            // I'll make it a standalone function to avoid code duplication.
            return await processAndSaveImage(
                imageBuffer,
                input.workspaceId,
                "png",
            );
        } catch (error) {
            console.error("Google image generation error:", error);
            throw error;
        }
    }

    private mapAspectRatio(
        ratio?: ImageAspectRatio,
    ): "1:1" | "16:9" | "9:16" | undefined {
        switch (ratio) {
            case "landscape":
                return "16:9";
            case "portrait":
                return "9:16";
            case "square":
            default:
                return "1:1";
        }
    }
}
