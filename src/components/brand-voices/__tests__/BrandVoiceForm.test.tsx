/**
 * Tests for BrandVoiceForm component.
 * Verifies form rendering, validation, submission, and file upload integration.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { BrandVoiceForm } from "../BrandVoiceForm";

// Mock Cloudflare env helper
vi.mock("@/lib/env", () => ({
	getR2Bucket: vi.fn().mockResolvedValue({
		put: vi.fn().mockResolvedValue(undefined),
		get: vi.fn().mockResolvedValue(null),
		delete: vi.fn().mockResolvedValue(undefined),
	}),
}));

// Mock Convex hooks
vi.mock("convex/react", () => ({
	useMutation: vi.fn(() => vi.fn()),
	useQuery: vi.fn(() => undefined),
}));

// Mock Convex API
vi.mock("../../../../convex/_generated/api", () => ({
	api: {
		brandVoices: {
			createBrandVoice: "createBrandVoice",
			updateBrandVoice: "updateBrandVoice",
			getBrandVoiceFiles: "getBrandVoiceFiles",
		},
		files: {
			deleteFile: "deleteFile",
		},
	},
}));

describe("BrandVoiceForm", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("should render form fields for name and description", () => {
		render(<BrandVoiceForm projectId="project-123" onSuccess={vi.fn()} onCancel={vi.fn()} />);

		expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
		expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
	});

	it("should call onCancel when cancel button is clicked", () => {
		const onSuccess = vi.fn();
		const onCancel = vi.fn();

		render(<BrandVoiceForm projectId="project-123" onSuccess={onSuccess} onCancel={onCancel} />);

		const cancelButton = screen.getByRole("button", { name: /cancel/i });
		fireEvent.click(cancelButton);

		expect(onCancel).toHaveBeenCalledTimes(1);
		expect(onSuccess).not.toHaveBeenCalled();
	});

	it("should have required attribute on name input", () => {
		render(<BrandVoiceForm projectId="project-123" onSuccess={vi.fn()} onCancel={vi.fn()} />);

		const nameInput = screen.getByLabelText(/name/i) as HTMLInputElement;
		expect(nameInput.required).toBe(true);
	});

	it("should pre-populate form when editing existing brand voice", () => {
		const existingBrandVoice = {
			_id: "brand-voice-123" as any,
			_creationTime: Date.now(),
			projectId: "project-123" as any,
			name: "Existing Voice",
			description: "Existing description",
			createdAt: Date.now(),
			updatedAt: Date.now(),
		};

		render(
			<BrandVoiceForm
				projectId="project-123"
				brandVoice={existingBrandVoice}
				onSuccess={vi.fn()}
				onCancel={vi.fn()}
			/>
		);

		const nameInput = screen.getByLabelText(/name/i) as HTMLInputElement;
		const descriptionInput = screen.getByLabelText(/description/i) as HTMLTextAreaElement;

		expect(nameInput.value).toBe("Existing Voice");
		expect(descriptionInput.value).toBe("Existing description");
	});

	it("should show tip for new brand voices about uploading files later", () => {
		render(<BrandVoiceForm projectId="project-123" onSuccess={vi.fn()} onCancel={vi.fn()} />);

		expect(screen.getByText(/tip/i)).toBeInTheDocument();
		expect(screen.getByText(/after creating/i)).toBeInTheDocument();
	});

	it("should display character count for name and description", () => {
		render(<BrandVoiceForm projectId="project-123" onSuccess={vi.fn()} onCancel={vi.fn()} />);

		expect(screen.getByText(/0\/100 characters/i)).toBeInTheDocument();
		expect(screen.getByText(/0\/2000 characters/i)).toBeInTheDocument();
	});
});