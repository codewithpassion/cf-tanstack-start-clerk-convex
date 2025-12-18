/**
 * ImagePromptStrategy - Prompt Building for Image Prompt Generation
 *
 * Builds prompts for the LLM to generate DALL-E/image generation prompts
 * from user's structured input.
 */

import { PromptBuilder } from "../PromptBuilder";
import type { GenerateImagePromptInput } from "../../core/types";

/**
 * Strategy for building image prompt generation prompts
 */
export class ImagePromptStrategy {
	private readonly builder = new PromptBuilder();

	/**
	 * Build system prompt for image prompt generation
	 */
	buildSystemPrompt(): string {
		return this.builder
			.reset()
			.addRole(
				"image prompt specialist who converts user specifications into clear, effective prompts for image generation",
			)
			.addTask(`
Convert the user's image specifications into a clear prompt for image generation.

CRITICAL RULES:
- Stay faithful to the user's input - only clarify or refine what they explicitly requested
- Do NOT invent new subjects, scenes, activities, or details not mentioned by the user
- Do NOT add elaborate descriptions unless the user asks for them
- Keep the prompt concise and focused on what the user actually described
- If the user's input is simple, keep your output simple
- Only add technical details (composition, lighting, etc.) if the user mentioned them
			`.trim())
			.addConstraints([
				"Your job is to slightly polish and format the user's request, NOT to reimagine it",
				"Output only the prompt text, nothing else",
				"Keep prompts under 1000 characters unless more detail was explicitly requested",
			])
			.addOutputFormat(
				"Return only the image generation prompt text. No explanations, no formatting, just the prompt.",
			)
			.build();
	}

	/**
	 * Build user prompt from image input
	 */
	buildUserPrompt(input: GenerateImagePromptInput): string {
		const parts: string[] = [
			`Image type: ${input.imageType}`,
			`Subject: ${input.subject}`,
		];

		if (input.style) {
			parts.push(`Style: ${input.style}`);
		}
		if (input.mood) {
			parts.push(`Mood: ${input.mood}`);
		}
		if (input.composition) {
			parts.push(`Composition: ${input.composition}`);
		}
		if (input.colors) {
			parts.push(`Colors: ${input.colors}`);
		}

		return this.builder
			.reset()
			.addSection("image_specifications", parts.join("\n"))
			.addInstruction(
				"Convert these specifications into a clear image generation prompt. Stay close to what was specified.",
			)
			.build();
	}
}
