/**
 * ContextRepository - Data Access for AI Context
 *
 * Repository pattern implementation for fetching context data from Convex.
 * Provides efficient parallel fetching and consistent data access patterns.
 */

import type { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/api";
import type { Id } from "@/convex/dataModel";
import type {
	GenerationContext,
	AssembleContextParams,
	KnowledgeItem,
	ExampleItem,
} from "../core/types";
import { TOKEN_LIMITS } from "../core/constants";
import { ResourceNotFoundError } from "../core/errors";

/**
 * Repository for fetching AI generation context from Convex
 */
export class ContextRepository {
	constructor(private readonly convex: ConvexHttpClient) {}

	/**
	 * Get a single file by ID
	 */
	async getFile(fileId: Id<"files">) {
		return this.convex.query(api.files.getFile, { fileId });
	}

	/**
	 * Get multiple files by IDs
	 */
	async getFiles(fileIds: Id<"files">[]) {
		return Promise.all(fileIds.map((fileId) => this.getFile(fileId)));
	}

	/**
	 * Get files attached to a persona
	 */
	async getPersonaFiles(personaId: Id<"personas">) {
		return this.convex.query(api.personas.getPersonaFiles, { personaId });
	}

	/**
	 * Get files attached to a brand voice
	 */
	async getBrandVoiceFiles(brandVoiceId: Id<"brandVoices">) {
		return this.convex.query(api.brandVoices.getBrandVoiceFiles, {
			brandVoiceId,
		});
	}

	/**
	 * Get category with format guidelines
	 */
	async getCategory(categoryId: Id<"categories">) {
		const category = await this.convex.query(api.categories.getCategory, {
			categoryId,
		});
		return category;
	}

	/**
	 * Get category or throw if not found
	 */
	async getCategoryOrThrow(categoryId: Id<"categories">) {
		const category = await this.getCategory(categoryId);
		if (!category) {
			throw new ResourceNotFoundError("Category", categoryId);
		}
		return category;
	}

	/**
	 * Get persona description
	 */
	async getPersona(personaId: Id<"personas">) {
		const persona = await this.convex.query(api.personas.getPersona, {
			personaId,
		});
		return persona;
	}

	/**
	 * Get brand voice description
	 */
	async getBrandVoice(brandVoiceId: Id<"brandVoices">) {
		const brandVoice = await this.convex.query(api.brandVoices.getBrandVoice, {
			brandVoiceId,
		});
		return brandVoice;
	}

	/**
	 * Get knowledge base items for a category
	 *
	 * @param categoryId - Category to fetch knowledge for
	 * @param selectedIds - Optional specific IDs to filter by
	 * @param limit - Maximum items to return
	 */
	async getKnowledgeBase(
		categoryId: Id<"categories">,
		selectedIds?: Id<"knowledgeBaseItems">[],
		limit = TOKEN_LIMITS.MAX_KNOWLEDGE_BASE_ITEMS,
	): Promise<KnowledgeItem[]> {
		const items = await this.convex.query(
			api.knowledgeBase.listKnowledgeBaseItems,
			{ categoryId },
		);

		let filtered = items;
		if (selectedIds && selectedIds.length > 0) {
			filtered = items.filter((item) => selectedIds.includes(item._id));
		}

		const limitedItems = filtered.slice(0, limit);

		// Fetch file content for items with attached files
		const itemsWithFiles = await Promise.all(
			limitedItems.map(async (item) => {
				let fileContent: string | undefined;
				let fileName: string | undefined;
				if (item.fileId) {
					const file = await this.getFile(item.fileId);
					if (file?.extractedText) {
						fileContent = file.extractedText;
						fileName = file.filename;
					}
				}
				return {
					title: item.title,
					content: item.content || "",
					fileContent,
					fileName,
				};
			}),
		);

		return itemsWithFiles;
	}

	/**
	 * Get example content for a category
	 */
	async getExamples(
		categoryId: Id<"categories">,
		limit = TOKEN_LIMITS.MAX_EXAMPLES,
	): Promise<ExampleItem[]> {
		const examples = await this.convex.query(api.examples.listExamples, {
			categoryId,
		});

		const limitedExamples = examples.slice(0, limit);

		// Fetch file content for examples with attached files
		const examplesWithFiles = await Promise.all(
			limitedExamples.map(async (example) => {
				let fileContent: string | undefined;
				let fileName: string | undefined;
				if (example.fileId) {
					const file = await this.getFile(example.fileId);
					if (file?.extractedText) {
						fileContent = file.extractedText;
						fileName = file.filename;
					}
				}
				return {
					title: example.title,
					content: example.content || "",
					fileContent,
					fileName,
				};
			}),
		);

		return examplesWithFiles;
	}

	/**
	 * Get content piece by ID
	 */
	async getContentPiece(contentPieceId: Id<"contentPieces">) {
		const contentPiece = await this.convex.query(
			api.contentPieces.getContentPiece,
			{ contentPieceId },
		);
		return contentPiece;
	}

	/**
	 * Get content piece or throw if not found
	 */
	async getContentPieceOrThrow(contentPieceId: Id<"contentPieces">) {
		const contentPiece = await this.getContentPiece(contentPieceId);
		if (!contentPiece) {
			throw new ResourceNotFoundError("Content piece", contentPieceId);
		}
		return contentPiece;
	}

	/**
	 * Get project by ID
	 */
	async getProject(projectId: Id<"projects">) {
		const project = await this.convex.query(api.projects.getProject, {
			projectId,
		});
		return project;
	}

	/**
	 * Get project or throw if not found
	 */
	async getProjectOrThrow(projectId: Id<"projects">) {
		const project = await this.getProject(projectId);
		if (!project) {
			throw new ResourceNotFoundError("Project", projectId);
		}
		return project;
	}

	/**
	 * Get chat messages for a content piece
	 */
	async getChatMessages(contentPieceId: Id<"contentPieces">) {
		const messages = await this.convex.query(
			api.contentChatMessages.listChatMessages,
			{ contentPieceId },
		);
		return messages;
	}

	/**
	 * Save generated prompt to content piece
	 */
	async saveGeneratedPrompt(
		contentPieceId: Id<"contentPieces">,
		prompt: string,
	): Promise<void> {
		await this.convex.mutation(api.contentPieces.updateGeneratedPrompt, {
			contentPieceId,
			prompt,
		});
	}

	/**
	 * Add chat message to content piece
	 */
	async addChatMessage(
		contentPieceId: Id<"contentPieces">,
		role: "user" | "assistant",
		content: string,
	): Promise<void> {
		await this.convex.mutation(api.contentChatMessages.addChatMessage, {
			contentPieceId,
			role,
			content,
		});
	}

	/**
	 * Assemble full generation context from all sources
	 *
	 * Fetches all context data in parallel for efficiency.
	 */
	async assembleContext(
		params: AssembleContextParams,
	): Promise<GenerationContext> {
		const {
			categoryId,
			personaId,
			brandVoiceId,
			selectedKnowledgeBaseIds,
			uploadedFileIds,
		} = params;

		// Fetch all context in parallel
		const [
			category,
			persona,
			brandVoice,
			knowledgeBase,
			examples,
			personaFiles,
			brandVoiceFiles,
			uploadedFiles,
		] = await Promise.all([
			this.getCategory(categoryId),
			personaId ? this.getPersona(personaId) : null,
			brandVoiceId ? this.getBrandVoice(brandVoiceId) : null,
			this.getKnowledgeBase(categoryId, selectedKnowledgeBaseIds),
			this.getExamples(categoryId),
			personaId ? this.getPersonaFiles(personaId) : [],
			brandVoiceId ? this.getBrandVoiceFiles(brandVoiceId) : [],
			uploadedFileIds && uploadedFileIds.length > 0
				? this.getFiles(uploadedFileIds)
				: [],
		]);

		// Concatenate persona file content
		const personaFileContent = personaFiles
			.filter((f) => f.extractedText)
			.map((f) => `[${f.filename}]\n${f.extractedText}`)
			.join("\n\n");

		// Concatenate brand voice file content
		const brandVoiceFileContent = brandVoiceFiles
			.filter((f) => f.extractedText)
			.map((f) => `[${f.filename}]\n${f.extractedText}`)
			.join("\n\n");

		// Concatenate uploaded file content
		const uploadedFileContent = uploadedFiles
			.filter((f) => f?.extractedText)
			.map((f) => `[${f!.filename}]\n${f!.extractedText}`)
			.join("\n\n");

		return {
			formatGuidelines: category?.formatGuidelines,
			personaDescription: persona?.description,
			brandVoiceDescription: brandVoice?.description,
			personaFileContent: personaFileContent || undefined,
			brandVoiceFileContent: brandVoiceFileContent || undefined,
			uploadedFileContent: uploadedFileContent || undefined,
			knowledgeBase,
			examples,
		};
	}
}
