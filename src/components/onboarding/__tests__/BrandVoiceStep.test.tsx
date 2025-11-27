import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { BrandVoiceStep } from "../BrandVoiceStep";

describe("BrandVoiceStep", () => {
	const mockProjectId = "test-project-id" as any;

	it("should render brand voice creation form", () => {
		render(
			<BrandVoiceStep
				projectId={mockProjectId}
				onNext={vi.fn()}
				onSkip={vi.fn()}
			/>
		);

		expect(screen.getByLabelText(/brand voice name/i)).toBeInTheDocument();
		expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
		expect(screen.getByRole("button", { name: /continue/i })).toBeInTheDocument();
	});

	it("should show skip button", () => {
		render(
			<BrandVoiceStep
				projectId={mockProjectId}
				onNext={vi.fn()}
				onSkip={vi.fn()}
			/>
		);

		expect(screen.getByRole("button", { name: /skip/i })).toBeInTheDocument();
	});

	it("should call onSkip when skip button is clicked", () => {
		const onSkip = vi.fn();
		render(
			<BrandVoiceStep
				projectId={mockProjectId}
				onNext={vi.fn()}
				onSkip={onSkip}
			/>
		);

		const skipButton = screen.getByRole("button", { name: /skip/i });
		fireEvent.click(skipButton);

		expect(onSkip).toHaveBeenCalledTimes(1);
	});

	it("should allow optional fields and call onNext with data", () => {
		const onNext = vi.fn();
		render(
			<BrandVoiceStep
				projectId={mockProjectId}
				onNext={onNext}
				onSkip={vi.fn()}
			/>
		);

		const nameInput = screen.getByLabelText(/brand voice name/i);
		fireEvent.change(nameInput, { target: { value: "Professional Voice" } });

		const continueButton = screen.getByRole("button", { name: /continue/i });
		fireEvent.click(continueButton);

		expect(onNext).toHaveBeenCalledWith({
			name: "Professional Voice",
			description: undefined,
		});
	});
});
