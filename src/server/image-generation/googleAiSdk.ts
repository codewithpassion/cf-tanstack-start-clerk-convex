import { calculateImageBillableTokens } from "@/lib/billing/pricing";
import { getAuthenticatedConvexClient } from "../utils";
import { api } from "@/convex/api";
import { checkImageGenerationRateLimit } from "../utils";
import { processAndSaveImage } from "./storage";
import type {
	GenerateImageInput,
	GenerateImageResult,
	GenerateImagesResult,
	ImageAspectRatio,
	ImageGenerationStrategy,
} from "./types";

/**
 * Google Image Generation Strategy
 * Uses 'google nano bannana' model via Vercel AI SDK (experimental)
 */
export class GoogleImageGenerationStrategy implements ImageGenerationStrategy {
	private env: Record<string, string | undefined>;

	constructor(env: Record<string, string | undefined>) {
		this.env = env;
	}

	async generate(
		input: GenerateImageInput,
		userId: string,
	): Promise<GenerateImagesResult> {
		// Check rate limit (reusing same limit for now)
		checkImageGenerationRateLimit(userId);

		// Get authenticated convex client
		const convex = await getAuthenticatedConvexClient();
		const user = await convex.query(api.users.getMe);
		if (!user) throw new Error("User not authenticated");

		const workspace = await convex.query(api.workspaces.getMyWorkspace);
		if (!workspace) throw new Error("Workspace not found");

		// Map aspect ratio for billing purposes (Google generates 1024x1024 for all aspect ratios)
		const size = "1024x1024";

		// Default to 1 image if not specified
		const requestedImageCount = input.imageCount ?? 1;

		// Calculate fixed cost for requested number of images (pre-flight check)
		// Actual billing will be based on number of images returned
		const estimatedBilling = calculateImageBillableTokens("google", size, requestedImageCount);

		// Pre-flight balance check for requested number of images
		const balanceCheck = await convex.query(api.billing.accounts.checkBalance, {
			userId: user._id,
			requiredTokens: estimatedBilling.billableTokens,
		});
		if (!balanceCheck.sufficient) {
			throw new Error(
				`Insufficient token balance. You have ${balanceCheck.balance} tokens but need ${estimatedBilling.billableTokens} tokens for generating ${requestedImageCount} image${requestedImageCount > 1 ? "s" : ""}.`,
			);
		}

		const { experimental_generateImage } = await import("ai");
		const { createGoogleGenerativeAI } = await import("@ai-sdk/google");

		const google = createGoogleGenerativeAI({
			apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
		});

		try {
			// Default to 1 image if not specified
			const numberOfImages = input.imageCount ?? 1;

			// The AI SDK returns an `images` array (may contain 1 or more images)
			const { images } = await experimental_generateImage({
				model: google.image("nano-banana-pro-preview"),
				prompt: input.prompt,
				aspectRatio: this.mapAspectRatio(input.aspectRatio),
				n: numberOfImages,
			});

			// Process all returned images
			const results: GenerateImageResult[] = [];
			for (const image of images) {
				// Use uint8Array directly if available, otherwise decode base64
				let imageBuffer: ArrayBuffer;
				if (image.uint8Array) {
					// Create a new ArrayBuffer from the Uint8Array to ensure proper type
					imageBuffer = image.uint8Array.slice().buffer;
				} else {
					const base64Data = image.base64;
					const binaryString = atob(base64Data);
					const bytes = new Uint8Array(binaryString.length);
					for (let i = 0; i < binaryString.length; i++) {
						bytes[i] = binaryString.charCodeAt(i);
					}
					imageBuffer = bytes.buffer;
				}

				const result = await processAndSaveImage(
					imageBuffer,
					input.workspaceId,
					"png",
				);
				results.push(result);
			}

			// Calculate billing based on actual number of images returned
			const imageCount = results.length;
			const billing = calculateImageBillableTokens("google", size, imageCount);

			// Record usage after successful image generation
			await convex.mutation(api.billing.usage.recordUsage, {
				secret: this.env.BILLING_SECRET!,
				userId: user._id,
				workspaceId: workspace._id,
				projectId: input.projectId,
				operationType: "image_generation",
				provider: "google",
				model: "google",
				imageCount,
				imageSize: size,
				billableTokens: billing.billableTokens,
				chargeType: "fixed",
				fixedCost: billing.fixedCost,
				requestMetadata: JSON.stringify({
					prompt: input.prompt.substring(0, 200),
					imageCount,
				}),
				success: true,
			});

			return { images: results };
		} catch (error) {
			// If image generation failed, don't record usage
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
