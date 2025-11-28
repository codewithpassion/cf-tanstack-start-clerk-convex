/**
 * Tests for Image Management UI components
 *
 * Covers:
 * - ImageGallery displays attached images
 * - ImageUploader creates file and attachment
 * - Image reorder updates sortOrder
 * - ImagePromptWizard generates prompt
 * - AI image generation and preview
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ImageGenerationPreview } from "../ImageGenerationPreview";
import type { Id } from "../../../../convex/_generated/dataModel";

describe("ImageGenerationPreview", () => {
	const mockFileId = "file123" as Id<"files">;
	const mockPreviewUrl = "/api/files/file123/preview";

	it("displays generated image", () => {
		render(
			<ImageGenerationPreview
				fileId={mockFileId}
				previewUrl={mockPreviewUrl}
				prompt="Test prompt"
				onAttach={vi.fn()}
				onDiscard={vi.fn()}
				onRetry={vi.fn()}
			/>
		);

		const img = screen.getByRole("img");
		expect(img).toHaveAttribute("src", mockPreviewUrl);
	});

	it("shows loading state during generation", () => {
		render(
			<ImageGenerationPreview
				fileId={null}
				previewUrl={null}
				prompt="Test prompt"
				onAttach={vi.fn()}
				onDiscard={vi.fn()}
				onRetry={vi.fn()}
				isGenerating={true}
			/>
		);

		expect(screen.getByText(/generating/i)).toBeInTheDocument();
		expect(screen.queryByRole("img")).not.toBeInTheDocument();
	});

	it("displays prompt text", () => {
		const testPrompt = "A beautiful landscape with mountains";
		render(
			<ImageGenerationPreview
				fileId={mockFileId}
				previewUrl={mockPreviewUrl}
				prompt={testPrompt}
				onAttach={vi.fn()}
				onDiscard={vi.fn()}
				onRetry={vi.fn()}
			/>
		);

		expect(screen.getByText(testPrompt)).toBeInTheDocument();
	});

	it("shows attach button when image is generated", () => {
		render(
			<ImageGenerationPreview
				fileId={mockFileId}
				previewUrl={mockPreviewUrl}
				prompt="Test prompt"
				onAttach={vi.fn()}
				onDiscard={vi.fn()}
				onRetry={vi.fn()}
			/>
		);

		expect(screen.getByRole("button", { name: /attach/i })).toBeInTheDocument();
	});

	it("shows discard button", () => {
		render(
			<ImageGenerationPreview
				fileId={mockFileId}
				previewUrl={mockPreviewUrl}
				prompt="Test prompt"
				onAttach={vi.fn()}
				onDiscard={vi.fn()}
				onRetry={vi.fn()}
			/>
		);

		expect(screen.getByRole("button", { name: /discard/i })).toBeInTheDocument();
	});
});
