import { GoogleImageGenerationStrategy } from "./google";
import { OpenAIImageGenerationStrategy } from "./openai";
import type { ImageGenerationStrategy } from "./types";

/**
 * Image Generation Factory
 */
export class ImageGenerationFactory {
    static createStrategy(env: Record<string, string | undefined>): ImageGenerationStrategy {
        const model = env.IMAGE_GENERATION_MODEL || "openai";

        switch (model) {
            case "google":
                return new GoogleImageGenerationStrategy();
            case "openai":
            default:
                return new OpenAIImageGenerationStrategy();
        }
    }
}
