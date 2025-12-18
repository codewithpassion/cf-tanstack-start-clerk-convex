/**
 * PromptBuilder - XML-Structured Prompt Construction
 *
 * Builder pattern implementation for creating well-structured prompts
 * optimized for Claude's XML parsing capabilities.
 *
 * Claude excels at parsing XML-structured content, making it easier to:
 * - Separate different types of context
 * - Clearly delineate instructions from content
 * - Provide structured examples
 * - Specify output formats unambiguously
 */

import type { KnowledgeItem, ExampleItem } from "../core/types";

/**
 * Options for adding sections
 */
interface SectionOptions {
	/** Skip this section if content is empty/undefined */
	optional?: boolean;
	/** Custom attributes to add to the XML tag */
	attributes?: Record<string, string>;
}

/**
 * Fluent builder for constructing XML-structured prompts
 */
export class PromptBuilder {
	private parts: string[] = [];

	/**
	 * Reset the builder to start a new prompt
	 */
	reset(): this {
		this.parts = [];
		return this;
	}

	/**
	 * Add a role definition
	 *
	 * @example
	 * builder.addRole("expert content writer specializing in B2B marketing")
	 * // <role>You are an expert content writer specializing in B2B marketing.</role>
	 */
	addRole(role: string): this {
		this.parts.push(`<role>\nYou are an ${role}.\n</role>`);
		return this;
	}

	/**
	 * Add the main task description
	 *
	 * @example
	 * builder.addTask("Create compelling content based on the provided context.")
	 */
	addTask(task: string): this {
		this.parts.push(`<task>\n${task.trim()}\n</task>`);
		return this;
	}

	/**
	 * Add a named context section
	 *
	 * @example
	 * builder.addContext("brand_voice", "Professional yet approachable...")
	 */
	addContext(name: string, content?: string): this {
		if (content?.trim()) {
			this.parts.push(`<context name="${name}">\n${content.trim()}\n</context>`);
		}
		return this;
	}

	/**
	 * Add knowledge base items
	 *
	 * @example
	 * builder.addKnowledgeBase([
	 *   { title: "Product Info", content: "..." },
	 *   { title: "Company History", content: "..." }
	 * ])
	 */
	addKnowledgeBase(items: KnowledgeItem[]): this {
		if (items.length > 0) {
			const itemsXml = items
				.map(
					(item) =>
						`  <item title="${this.escapeXml(item.title)}">\n${item.content}\n  </item>`,
				)
				.join("\n");
			this.parts.push(`<knowledge_base>\n${itemsXml}\n</knowledge_base>`);
		}
		return this;
	}

	/**
	 * Add example content for few-shot learning
	 *
	 * @example
	 * builder.addExamples([
	 *   { title: "Good Blog Intro", content: "..." }
	 * ])
	 */
	addExamples(examples: ExampleItem[]): this {
		if (examples.length > 0) {
			const examplesXml = examples
				.map(
					(ex) =>
						`  <example title="${this.escapeXml(ex.title)}">\n${ex.content}\n  </example>`,
				)
				.join("\n");
			this.parts.push(`<examples>\n${examplesXml}\n</examples>`);
		}
		return this;
	}

	/**
	 * Add a generic named section
	 *
	 * @example
	 * builder.addSection("original_content", markdownContent)
	 * builder.addSection("draft", undefined, { optional: true })
	 */
	addSection(name: string, content?: string, opts?: SectionOptions): this {
		if (!content?.trim() && opts?.optional) {
			return this;
		}

		const attrs = opts?.attributes
			? Object.entries(opts.attributes)
				.map(([k, v]) => ` ${k}="${this.escapeXml(v)}"`)
				.join("")
			: "";

		this.parts.push(`<${name}${attrs}>\n${content?.trim() || ""}\n</${name}>`);
		return this;
	}

	/**
	 * Add an instruction
	 *
	 * @example
	 * builder.addInstruction("Improve and expand on the provided draft.")
	 */
	addInstruction(instruction: string): this {
		this.parts.push(`<instruction>\n${instruction.trim()}\n</instruction>`);
		return this;
	}

	/**
	 * Add multiple instructions
	 */
	addInstructions(instructions: string[]): this {
		if (instructions.length > 0) {
			const instructionsXml = instructions
				.map((i) => `  <instruction>${i}</instruction>`)
				.join("\n");
			this.parts.push(`<instructions>\n${instructionsXml}\n</instructions>`);
		}
		return this;
	}

	/**
	 * Add output format specification
	 *
	 * @example
	 * builder.addOutputFormat("Return only the final content in markdown format.")
	 */
	addOutputFormat(format: string): this {
		this.parts.push(`<output_format>\n${format.trim()}\n</output_format>`);
		return this;
	}

	/**
	 * Add constraints/rules the model must follow
	 *
	 * @example
	 * builder.addConstraints([
	 *   "Write in markdown format",
	 *   "Do not include meta-commentary",
	 *   "Preserve factual accuracy"
	 * ])
	 */
	addConstraints(constraints: string[]): this {
		if (constraints.length > 0) {
			const constraintsXml = constraints
				.map((c) => `  <constraint>${c}</constraint>`)
				.join("\n");
			this.parts.push(`<constraints>\n${constraintsXml}\n</constraints>`);
		}
		return this;
	}

	/**
	 * Add critical instructions that must be followed
	 * These are emphasized more strongly than regular constraints
	 */
	addCriticalInstructions(instructions: string[]): this {
		if (instructions.length > 0) {
			const instructionsXml = instructions
				.map((i) => `  <critical>${i}</critical>`)
				.join("\n");
			this.parts.push(
				`<critical_instructions>\n${instructionsXml}\n</critical_instructions>`,
			);
		}
		return this;
	}

	/**
	 * Add raw content without XML wrapping
	 * Use sparingly - prefer structured sections
	 */
	addRaw(content: string): this {
		if (content.trim()) {
			this.parts.push(content.trim());
		}
		return this;
	}

	/**
	 * Build the final prompt string
	 */
	build(): string {
		return this.parts.join("\n\n");
	}

	/**
	 * Escape special XML characters
	 */
	private escapeXml(str: string): string {
		return str
			.replace(/&/g, "&amp;")
			.replace(/</g, "&lt;")
			.replace(/>/g, "&gt;")
			.replace(/"/g, "&quot;")
			.replace(/'/g, "&apos;");
	}
}

/**
 * Create a new PromptBuilder instance
 */
export function createPromptBuilder(): PromptBuilder {
	return new PromptBuilder();
}
