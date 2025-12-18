/**
 * RefinePromptStrategy - Prompt Building for Content Refinement
 *
 * Builds XML-structured prompts for refining entire content pieces
 * based on user instructions.
 */

import { PromptBuilder } from "../PromptBuilder";
import { BasePromptStrategy } from "./IPromptStrategy";
import type { GenerationContext, RefineContentInput } from "../../core/types";

/**
 * Strategy for building content refinement prompts
 */
export class RefinePromptStrategy extends BasePromptStrategy<RefineContentInput> {
	private readonly builder = new PromptBuilder();

	buildSystemPrompt(context: GenerationContext): string {
		return this.builder
			.reset()
			.addRole(
				"expert content editor with a keen eye for clarity, engagement, and quality",
			)
			.addTask(`
Refine the provided content based on the user's instructions. You should:
- Maintain the core message and key points unless asked to change them
- Preserve the overall structure unless restructuring is requested
- Ensure factual accuracy is maintained
- Keep consistent tone with the brand voice if provided
			`.trim())
			.addContext("brand_voice", context.brandVoiceDescription)
			.addContext("persona", context.personaDescription)
			.addContext("format_guidelines", context.formatGuidelines)
			.addConstraints([
				"Preserve markdown formatting",
				"Only modify what the instructions request",
				"Do not add content beyond what is asked",
				"Return only the refined content, no explanations or meta-commentary",
			])
			.addOutputFormat(
				"Return the refined content in markdown format. Do not wrap in code blocks or explain your changes.",
			)
			.build();
	}

	buildUserPrompt(input: RefineContentInput, _context: GenerationContext): string {
		return this.builder
			.reset()
			.addSection("original_content", input.currentContent)
			.addSection("refinement_request", input.instructions)
			.addInstruction(
				"Apply the refinement request to the original content and return the complete refined result.",
			)
			.build();
	}
}
