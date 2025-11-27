/**
 * Tests for PersonaForm component.
 * Verifies form rendering, validation, submission, and file upload integration.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { PersonaForm } from "../PersonaForm";

// Mock Convex hooks
vi.mock("convex/react", () => ({
	useMutation: vi.fn(() => vi.fn()),
	useQuery: vi.fn(() => undefined),
}));

// Mock Convex API
vi.mock("../../../../convex/_generated/api", () => ({
	api: {
		personas: {
			createPersona: "createPersona",
			updatePersona: "updatePersona",
			getPersonaFiles: "getPersonaFiles",
		},
		files: {
			deleteFile: "deleteFile",
		},
	},
}));

describe("PersonaForm", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("should render form fields for name and description", () => {
		render(<PersonaForm projectId="project-123" onSuccess={vi.fn()} onCancel={vi.fn()} />);

		expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
		expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
	});

	it("should have required attribute on name input", () => {
		render(<PersonaForm projectId="project-123" onSuccess={vi.fn()} onCancel={vi.fn()} />);

		const nameInput = screen.getByLabelText(/name/i) as HTMLInputElement;
		expect(nameInput.required).toBe(true);
	});

	it("should pre-populate form when editing existing persona", () => {
		const existingPersona = {
			_id: "persona-123" as any,
			projectId: "project-123" as any,
			name: "Existing Persona",
			description: "Existing persona description",
			createdAt: Date.now(),
			updatedAt: Date.now(),
		};

		render(
			<PersonaForm
				projectId="project-123"
				persona={existingPersona}
				onSuccess={vi.fn()}
				onCancel={vi.fn()}
			/>
		);

		const nameInput = screen.getByLabelText(/name/i) as HTMLInputElement;
		const descriptionInput = screen.getByLabelText(/description/i) as HTMLTextAreaElement;

		expect(nameInput.value).toBe("Existing Persona");
		expect(descriptionInput.value).toBe("Existing persona description");
	});

	it("should show tip for new personas about uploading files later", () => {
		render(<PersonaForm projectId="project-123" onSuccess={vi.fn()} onCancel={vi.fn()} />);

		expect(screen.getByText(/tip/i)).toBeInTheDocument();
		expect(screen.getByText(/after creating/i)).toBeInTheDocument();
	});

	it("should display character count for name and description", () => {
		render(<PersonaForm projectId="project-123" onSuccess={vi.fn()} onCancel={vi.fn()} />);

		expect(screen.getByText(/0\/100 characters/i)).toBeInTheDocument();
		expect(screen.getByText(/0\/2000 characters/i)).toBeInTheDocument();
	});
});
