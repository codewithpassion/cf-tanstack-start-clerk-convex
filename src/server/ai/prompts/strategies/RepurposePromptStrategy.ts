/**
 * RepurposePromptStrategy - Prompt Building for Content Repurposing
 *
 * Builds XML-structured prompts for transforming content from one format
 * to another while preserving the core message.
 */

import { PromptBuilder } from "../PromptBuilder";
import { BasePromptStrategy } from "./IPromptStrategy";
import type { GenerationContext, RepurposeContentInput } from "../../core/types";

/**
 * Additional data needed for repurposing prompts
 */
export interface RepurposePromptData {
	sourceContent: string;
	sourceCategoryName: string;
	targetCategoryName: string;
}

/**
 * Strategy for building content repurposing prompts
 */
export class RepurposePromptStrategy extends BasePromptStrategy<
	RepurposeContentInput,
	RepurposePromptData
> {
	private readonly builder = new PromptBuilder();

	buildSystemPrompt(
		context: GenerationContext,
		data?: RepurposePromptData,
	): string {
		const sourceFormat = data?.sourceCategoryName ?? "original";
		const targetFormat = data?.targetCategoryName ?? "new";

		return this.builder
			.reset()
			.addRole(
				"content transformation specialist who excels at adapting content across different formats and platforms",
			)
			.addTask(`
Transform content from "${sourceFormat}" format into "${targetFormat}" format.

Your transformation should:
- Preserve the core message, key facts, and valuable insights
- Adapt structure and style appropriately for the new format
- Maintain engagement appropriate to the target format
- Follow the target format guidelines precisely
			`.trim())
			.addContext("target_format_guidelines", context.formatGuidelines)
			.addContext("target_brand_voice", context.brandVoiceDescription)
			.addContext("target_persona", context.personaDescription)
			.addExamples(context.examples)
			.addConstraints([
				"Preserve factual accuracy from source content",
				"Adapt length and structure for target format",
				"Maintain brand voice consistency",
				"Return only the repurposed content, no explanations",
			])
			.addOutputFormat(
				"Return the repurposed content in markdown format, ready for the target platform. Do not include meta-commentary.",
			)
			.build();
	}

	buildUserPrompt(
		input: RepurposeContentInput,
		_context: GenerationContext,
		data?: RepurposePromptData,
	): string {
		const builder = this.builder.reset();

		builder.addSection("new_title", input.title);
		builder.addSection("source_content", data?.sourceContent ?? "");

		if (input.additionalInstructions) {
			builder.addSection("additional_instructions", input.additionalInstructions);
		}

		builder.addInstruction(
			"Transform the source content into the new format, using the new title provided.",
		);

		return builder.build();
	}
}
