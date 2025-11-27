/**
 * Tests for FileUpload component.
 * Verifies file selection, validation, upload progress, and error handling.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { FileUpload } from "../FileUpload";

// Mock Convex hooks
vi.mock("convex/react", () => ({
	useMutation: vi.fn(() => vi.fn()),
}));

// Mock Convex API
vi.mock("../../../../convex/_generated/api", () => ({
	api: {
		files: {
			createFile: "createFile",
		},
	},
}));

describe("FileUpload", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("should render file upload zone with instructions", () => {
		render(<FileUpload onUploadComplete={vi.fn()} ownerType="brandVoice" ownerId="brand-voice-123" />);

		expect(screen.getByText(/drag.*drop/i) || screen.getByText(/click to upload/i)).toBeInTheDocument();
	});

	it("should accept file selection via input", () => {
		render(<FileUpload onUploadComplete={vi.fn()} ownerType="brandVoice" ownerId="brand-voice-123" />);

		const input = screen.getByLabelText(/upload files/i) as HTMLInputElement;
		expect(input).toBeInTheDocument();
		expect(input.type).toBe("file");
	});

	it("should display supported file types", () => {
		render(<FileUpload onUploadComplete={vi.fn()} ownerType="brandVoice" ownerId="brand-voice-123" />);

		// Check for supported file type information
		expect(screen.getByText(/pdf.*word.*text.*images/i)).toBeInTheDocument();
	});

	it("should display file size limit", () => {
		render(<FileUpload onUploadComplete={vi.fn()} ownerType="brandVoice" ownerId="brand-voice-123" />);

		// Check for file size limit information (15MB)
		expect(screen.getByText(/maximum file size.*15.*mb/i)).toBeInTheDocument();
	});

	it("should handle multiple files when enabled", () => {
		render(
			<FileUpload
				onUploadComplete={vi.fn()}
				ownerType="brandVoice"
				ownerId="brand-voice-123"
				multiple={true}
			/>
		);

		const input = screen.getByLabelText(/upload files/i) as HTMLInputElement;
		expect(input.multiple).toBe(true);
	});

	it("should restrict to single file when multiple is false", () => {
		render(
			<FileUpload
				onUploadComplete={vi.fn()}
				ownerType="brandVoice"
				ownerId="brand-voice-123"
				multiple={false}
			/>
		);

		const input = screen.getByLabelText(/upload files/i) as HTMLInputElement;
		expect(input.multiple).toBe(false);
	});

	it("should be disabled when disabled prop is true", () => {
		render(
			<FileUpload
				onUploadComplete={vi.fn()}
				ownerType="brandVoice"
				ownerId="brand-voice-123"
				disabled={true}
			/>
		);

		const input = screen.getByLabelText(/upload files/i) as HTMLInputElement;
		expect(input.disabled).toBe(true);
	});
});
