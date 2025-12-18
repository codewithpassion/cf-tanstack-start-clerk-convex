/**
 * SelectionRefinePromptStrategy - Prompt Building for Selection Refinement
 *
 * Builds XML-structured prompts for refining selected portions of content.
 * CRITICAL: Must preserve exact markdown structure of the selection.
 */

import { PromptBuilder } from "../PromptBuilder";
import { BasePromptStrategy } from "./IPromptStrategy";
import type { GenerationContext, RefineSelectionInput } from "../../core/types";

/**
 * Strategy for building selection refinement prompts
 */
export class SelectionRefinePromptStrategy extends BasePromptStrategy<RefineSelectionInput> {
	private readonly builder = new PromptBuilder();

	buildSystemPrompt(context: GenerationContext): string {
		return this.builder
			.reset()
			.addRole("precise content editor specializing in targeted text refinement")
			.addTask(`
Refine ONLY the selected text portion. This is a critical task requiring precision:
- The input is in MARKDOWN format
- You must PRESERVE the exact markdown structure (headings, lists, formatting)
- If input has '## Heading', output must have '## [Refined Heading]'
- If input has a paragraph, output must be a paragraph (don't add heading markers)
- Only modify the TEXT CONTENT, not the STRUCTURE or FORMATTING
- You are refining a SELECTION from a larger document - do not add content before or after
			`.trim())
			.addContext("brand_voice", context.brandVoiceDescription)
			.addContext("persona", context.personaDescription)
			.addCriticalInstructions([
				"PRESERVE markdown structure exactly (## stays ##, - stays -, etc.)",
				"PRESERVE formatting marks (**bold**, *italic*, `code`, etc.)",
				"Return content in the SAME format as input",
				"Do NOT add content before or after the selection",
				"Do NOT wrap output in markdown code blocks",
				"Do NOT change heading levels or list types",
			])
			.addOutputFormat(`
Return ONLY the refined selection in its original markdown format.

Examples:
- Input: "## Title" → Output: "## [Refined Title]"
- Input: "Some paragraph text" → Output: "[Refined paragraph text]"
- Input: "- List item" → Output: "- [Refined list item]"
- Input: "**Bold text**" → Output: "**[Refined bold text]**"
			`.trim())
			.build();
	}

	buildUserPrompt(input: RefineSelectionInput, _context: GenerationContext): string {
		return this.builder
			.reset()
			.addSection("selected_content", input.selectedText, {
				attributes: { format: "markdown" },
			})
			.addSection("refinement_request", input.instructions)
			.addInstruction(
				"Refine the selected content according to the request. Return ONLY the refined selection with its original markdown structure intact.",
			)
			.build();
	}
}
