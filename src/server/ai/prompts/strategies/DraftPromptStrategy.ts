/**
 * DraftPromptStrategy - Prompt Building for Draft Generation
 *
 * Builds XML-structured prompts optimized for Claude to generate
 * high-quality content drafts.
 */

import { PromptBuilder } from "../PromptBuilder";
import { BasePromptStrategy } from "./IPromptStrategy";
import type { GenerationContext, GenerateDraftInput } from "../../core/types";

/**
 * Strategy for building draft generation prompts
 */
export class DraftPromptStrategy extends BasePromptStrategy<GenerateDraftInput> {
	private readonly builder = new PromptBuilder();

	buildSystemPrompt(context: GenerationContext): string {
		return this.builder
			.reset()
			.addRole(
				"expert content writer who creates engaging, high-quality content tailored to specific audiences and formats",
			)
			.addTask(`
Create compelling content based on the provided context. Your content should:
- Follow the format guidelines precisely
- Match the brand voice and persona if provided
- Incorporate relevant knowledge naturally
- Be ready for publication without further editing
- Engage the target audience effectively
			`.trim())
			.addContext("brand_voice", context.brandVoiceDescription)
			.addContext(
				"brand_voice_reference_materials",
				context.brandVoiceFileContent,
			)
			.addContext("persona", context.personaDescription)
			.addContext("persona_reference_materials", context.personaFileContent)
			.addContext("format_guidelines", context.formatGuidelines)
			.addContext("source_materials", context.uploadedFileContent)
			.addKnowledgeBase(context.knowledgeBase)
			.addExamples(context.examples)
			.addConstraints([
				"Write in markdown format",
				"Do not include meta-commentary or explanations about what you're writing",
				"Ensure factual accuracy based on provided knowledge",
				"Match the style and tone of the examples if provided",
				"Create complete, publication-ready content",
			])
			.addOutputFormat(
				"Return only the final content in markdown format. Do not wrap in code blocks or add any prefix/suffix text.",
			)
			.build();
	}

	buildUserPrompt(input: GenerateDraftInput, _context: GenerationContext): string {
		const builder = this.builder.reset();

		builder.addSection("title", input.title);
		builder.addSection("topic", input.topic);

		if (input.draftContent) {
			builder.addSection("existing_draft", input.draftContent);
			builder.addInstruction(
				"Improve and expand on the existing draft while maintaining its core message and direction.",
			);
		} else {
			builder.addInstruction(
				"Create complete content following the format guidelines and incorporating the provided context.",
			);
		}

		return builder.build();
	}
}
