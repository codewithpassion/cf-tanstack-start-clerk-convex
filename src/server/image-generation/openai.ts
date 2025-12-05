import OpenAI from "openai";
import { calculateImageBillableTokens } from "@/lib/billing/pricing";
import { getAuthenticatedConvexClient } from "../utils";
import { api } from "@/convex/api";
import { checkImageGenerationRateLimit } from "../utils";
import { processAndSaveImage } from "./storage";
import type {
	GenerateImageInput,
	GenerateImageResult,
	ImageAspectRatio,
	ImageGenerationStrategy,
} from "./types";

/**
 * Maps aspect ratio to DALL-E size parameter
 * Supported sizes: '1024x1024', '1024x1536', '1536x1024', 'auto'
 */
const ASPECT_RATIO_TO_SIZE: Record<
	ImageAspectRatio,
	"1024x1024" | "1536x1024" | "1024x1536"
> = {
	square: "1024x1024",
	landscape: "1536x1024",
	portrait: "1024x1536",
};

/**
 * OpenAI Image Generation Strategy
 * Uses DALL-E 3 via OpenAI SDK
 */
export class OpenAIImageGenerationStrategy implements ImageGenerationStrategy {
	private env: Record<string, string | undefined>;

	constructor(env: Record<string, string | undefined>) {
		this.env = env;
	}

	async generate(
		input: GenerateImageInput,
		userId: string,
	): Promise<GenerateImageResult> {
		// Check rate limit
		checkImageGenerationRateLimit(userId);

		// Get OpenAI API key
		const apiKey = process.env.OPENAI_API_KEY;
		if (!apiKey) {
			throw new Error("OPENAI_API_KEY environment variable is not set");
		}

		// Initialize OpenAI client
		const openai = new OpenAI({ apiKey });

		// Map aspect ratio to DALL-E size
		const aspectRatio = input.aspectRatio || "square";
		const size = ASPECT_RATIO_TO_SIZE[aspectRatio];

		// Get authenticated convex client
		const convex = await getAuthenticatedConvexClient();
		const user = await convex.query(api.users.getMe);
		if (!user) throw new Error("User not authenticated");

		const workspace = await convex.query(api.workspaces.getMyWorkspace);
		if (!workspace) throw new Error("Workspace not found");

		// Calculate fixed cost for DALL-E 3
		// Note: The actual model used is "gpt-image-1-mini" but we bill it as "dall-e-3"
		// The sizes 1536x1024 and 1024x1536 will fall back to 1024x1024 pricing (6000 tokens)
		// since they're not in our IMAGE_COSTS table. We use "dall-e-3" as the billing model name.
		const billing = calculateImageBillableTokens("dall-e-3", size, 1);

		// Pre-flight balance check
		const balanceCheck = await convex.query(api.billing.accounts.checkBalance, {
			userId: user._id,
			requiredTokens: billing.billableTokens,
		});
		if (!balanceCheck.sufficient) {
			throw new Error(
				`Insufficient token balance. You have ${balanceCheck.balance} tokens but need ${billing.billableTokens} tokens for image generation.`,
			);
		}

		// DALL-E 3 has a character prompt limit
		const DALLE_MAX_PROMPT_LENGTH = 10000;
		const prompt =
			input.prompt.length > DALLE_MAX_PROMPT_LENGTH
				? input.prompt.slice(0, DALLE_MAX_PROMPT_LENGTH - 3) + "..."
				: input.prompt;

		console.log("Generating image with DALL-E 3:", {
			originalPromptLength: input.prompt.length,
			truncatedPromptLength: prompt.length,
			size,
		});

		let result: GenerateImageResult;

		try {
			// Generate image with DALL-E 3
			const response = await openai.images.generate({
				model: "gpt-image-1-mini",
				prompt,
				size,
				quality: "auto",
				n: 1,
			});

			// Get image data from response (handles both URL and base64 formats)
			if (!response.data || response.data.length === 0) {
				throw new Error("No image data returned from DALL-E");
			}

			const imageData = response.data[0];
			let imageBuffer: ArrayBuffer;

			if (imageData?.b64_json) {
				// Handle base64 response
				console.log("Image generated, decoding base64 data");
				const binaryString = atob(imageData.b64_json);
				const bytes = new Uint8Array(binaryString.length);
				for (let i = 0; i < binaryString.length; i++) {
					bytes[i] = binaryString.charCodeAt(i);
				}
				imageBuffer = bytes.buffer;
			} else if (imageData?.url) {
				// Handle URL response
				console.log("Image generated, downloading from URL");
				const imageResponse = await fetch(imageData.url);
				if (!imageResponse.ok) {
					throw new Error(
						`Failed to download image: ${imageResponse.statusText}`,
					);
				}
				imageBuffer = await imageResponse.arrayBuffer();
			} else {
				throw new Error("No image URL or base64 data returned from DALL-E");
			}

			result = await processAndSaveImage(
				imageBuffer,
				input.workspaceId,
				"png",
			);

			// Record usage after successful image generation
			await convex.mutation(api.billing.usage.recordUsage, {
				secret: this.env.BILLING_SECRET!,
				userId: user._id,
				workspaceId: workspace._id,
				projectId: input.projectId,
				operationType: "image_generation",
				provider: "openai",
				model: "dall-e-3",
				imageCount: 1,
				imageSize: size,
				billableTokens: billing.billableTokens,
				chargeType: "fixed",
				fixedCost: billing.fixedCost,
				requestMetadata: JSON.stringify({
					prompt: input.prompt.substring(0, 200),
				}),
				success: true,
			});

			return result;
		} catch (error) {
			// If image generation failed, don't record usage
			console.error("Image generation failed:", error);
			throw error;
		}
	}
}
