/**
 * Tests for FileList component.
 * Verifies file display, download links, delete actions, and extracted text preview.
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { FileList } from "../FileList";

describe("FileList", () => {
	const mockFiles = [
		{
			_id: "file-1" as any,
			_creationTime: Date.now(),
			filename: "brand-guide.pdf",
			mimeType: "application/pdf",
			sizeBytes: 524288, // 512KB
			r2Key: "workspace-123/brand-voices/file-1-brand-guide.pdf",
			brandVoiceId: "brand-voice-123" as any,
			extractedText: "Our brand voice is professional yet approachable and focuses on clarity",
			createdAt: Date.now(),
		},
		{
			_id: "file-2" as any,
			_creationTime: Date.now(),
			filename: "tone-examples.docx",
			mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
			sizeBytes: 102400, // 100KB
			r2Key: "workspace-123/brand-voices/file-2-tone-examples.docx",
			brandVoiceId: "brand-voice-123" as any,
			createdAt: Date.now(),
		},
	];

	it("should render list of files with names", () => {
		render(<FileList files={mockFiles} onDelete={vi.fn()} />);

		expect(screen.getByText("brand-guide.pdf")).toBeInTheDocument();
		expect(screen.getByText("tone-examples.docx")).toBeInTheDocument();
	});

	it("should display file sizes in human-readable format", () => {
		render(<FileList files={mockFiles} onDelete={vi.fn()} />);

		// File sizes should be formatted (e.g., "512 KB", "100 KB")
		expect(screen.getByText(/512.*kb/i) || screen.getByText(/kb/i)).toBeInTheDocument();
	});

	it("should show empty state when no files", () => {
		render(<FileList files={[]} onDelete={vi.fn()} />);

		expect(screen.getByText(/no files/i)).toBeInTheDocument();
	});

	it("should call onDelete when delete button is clicked", () => {
		const onDelete = vi.fn();
		render(<FileList files={mockFiles} onDelete={onDelete} />);

		const deleteButtons = screen.getAllByRole("button", { name: /delete/i });
		expect(deleteButtons.length).toBeGreaterThan(0);

		fireEvent.click(deleteButtons[0]);
		expect(onDelete).toHaveBeenCalledWith(mockFiles[0]._id);
	});

	it("should show extracted text toggle button when available", () => {
		render(<FileList files={mockFiles} onDelete={vi.fn()} />);

		// First file has extracted text, so toggle button should be present
		const toggleButton = screen.getByRole("button", { name: /show extracted text/i });
		expect(toggleButton).toBeInTheDocument();
	});

	it("should expand and show extracted text when toggle is clicked", () => {
		render(<FileList files={mockFiles} onDelete={vi.fn()} />);

		const toggleButton = screen.getByRole("button", { name: /show extracted text/i });
		fireEvent.click(toggleButton);

		// After clicking, the text should be visible
		expect(screen.getByText(/professional yet approachable/i)).toBeInTheDocument();
	});

	it("should handle files without extracted text", () => {
		const filesWithoutText = mockFiles.map((file) => {
			const { extractedText, ...rest } = file;
			return rest;
		});

		render(<FileList files={filesWithoutText as any} onDelete={vi.fn()} />);

		expect(screen.getByText("brand-guide.pdf")).toBeInTheDocument();
		expect(screen.getByText("tone-examples.docx")).toBeInTheDocument();

		// Should not show extracted text toggle
		expect(screen.queryByRole("button", { name: /show extracted text/i })).not.toBeInTheDocument();
	});
});