import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ProjectStep } from "../ProjectStep";

describe("ProjectStep", () => {
	it("should render project creation form", () => {
		render(
			<ProjectStep
				onNext={vi.fn()}
				onSkip={undefined}
			/>
		);

		expect(screen.getByLabelText(/project name/i)).toBeInTheDocument();
		expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
		expect(screen.getByRole("button", { name: /continue/i })).toBeInTheDocument();
	});

	it("should validate project name length", () => {
		const onNext = vi.fn();
		render(
			<ProjectStep
				onNext={onNext}
				onSkip={undefined}
			/>
		);

		const nameInput = screen.getByLabelText(/project name/i);
		const continueButton = screen.getByRole("button", { name: /continue/i });

		// Try to submit with overly long name
		const longName = "a".repeat(101);
		fireEvent.change(nameInput, { target: { value: longName } });
		fireEvent.click(continueButton);

		// Should show validation error
		expect(screen.getByText(/project name must be 100 characters or less/i)).toBeInTheDocument();
		expect(onNext).not.toHaveBeenCalled();
	});

	it("should call onNext with project data when form is valid", () => {
		const onNext = vi.fn();
		render(
			<ProjectStep
				onNext={onNext}
				onSkip={undefined}
			/>
		);

		const nameInput = screen.getByLabelText(/project name/i);
		const descriptionInput = screen.getByLabelText(/description/i);

		fireEvent.change(nameInput, { target: { value: "Test Project" } });
		fireEvent.change(descriptionInput, { target: { value: "Test description" } });

		const continueButton = screen.getByRole("button", { name: /continue/i });
		fireEvent.click(continueButton);

		// Should call onNext with form data
		expect(onNext).toHaveBeenCalledWith({
			name: "Test Project",
			description: "Test description",
		});
	});

	it("should not show skip button for project step", () => {
		render(
			<ProjectStep
				onNext={vi.fn()}
				onSkip={undefined}
			/>
		);

		expect(screen.queryByRole("button", { name: /skip/i })).not.toBeInTheDocument();
	});
});
