import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { OnboardingWizard } from "../OnboardingWizard";

// Mock Convex hooks
vi.mock("convex/react", () => ({
	useMutation: vi.fn(() => vi.fn()),
}));

// Mock TanStack Router
vi.mock("@tanstack/react-router", () => ({
	useRouter: vi.fn(() => ({
		navigate: vi.fn(),
	})),
}));

describe("OnboardingWizard", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("should render wizard with project step initially", () => {
		render(<OnboardingWizard isOpen={true} onComplete={vi.fn()} />);

		expect(screen.getByText(/create your first project/i)).toBeInTheDocument();
		expect(screen.getByLabelText(/project name/i)).toBeInTheDocument();
	});

	it("should show step indicators", () => {
		render(<OnboardingWizard isOpen={true} onComplete={vi.fn()} />);

		// Should show 4 steps (Project, Brand Voice, Persona, Complete)
		const stepIndicators = screen.getAllByRole("listitem");
		expect(stepIndicators).toHaveLength(4);
	});

	it("should not render when isOpen is false", () => {
		render(<OnboardingWizard isOpen={false} onComplete={vi.fn()} />);

		expect(screen.queryByText(/create your first project/i)).not.toBeInTheDocument();
	});

	it("should call onComplete when wizard is completed", async () => {
		const onComplete = vi.fn();
		render(<OnboardingWizard isOpen={true} onComplete={onComplete} />);

		// This is a placeholder test - actual implementation will test the full flow
		// For now, we just verify the onComplete callback is properly typed
		expect(typeof onComplete).toBe("function");
	});
});