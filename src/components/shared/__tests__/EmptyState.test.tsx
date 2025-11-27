import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { EmptyState } from "../EmptyState";

describe("EmptyState", () => {
	it("should render title and description", () => {
		render(
			<EmptyState
				title="No projects found"
				description="Get started by creating your first project"
			/>
		);

		expect(screen.getByText("No projects found")).toBeInTheDocument();
		expect(screen.getByText("Get started by creating your first project")).toBeInTheDocument();
	});

	it("should render action button when provided", () => {
		const handleAction = vi.fn();
		render(
			<EmptyState
				title="No projects"
				description="Create a project"
				actionLabel="Create Project"
				onAction={handleAction}
			/>
		);

		const button = screen.getByRole("button", { name: /create project/i });
		expect(button).toBeInTheDocument();

		fireEvent.click(button);
		expect(handleAction).toHaveBeenCalledTimes(1);
	});

	it("should not render action button when not provided", () => {
		render(
			<EmptyState
				title="No projects"
				description="Create a project"
			/>
		);

		expect(screen.queryByRole("button")).not.toBeInTheDocument();
	});

	it("should render icon when provided", () => {
		const TestIcon = () => <svg data-testid="test-icon" />;
		render(
			<EmptyState
				title="No projects"
				description="Create a project"
				icon={<TestIcon />}
			/>
		);

		expect(screen.getByTestId("test-icon")).toBeInTheDocument();
	});
});
