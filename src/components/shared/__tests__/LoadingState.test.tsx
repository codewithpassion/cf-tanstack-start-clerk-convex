import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { LoadingState } from "../LoadingState";

describe("LoadingState", () => {
	it("should render loading skeleton", () => {
		const { container } = render(<LoadingState />);
		expect(container.querySelector('[data-loading="true"]')).toBeInTheDocument();
	});

	it("should render custom message when provided", () => {
		render(<LoadingState message="Loading projects..." />);
		expect(screen.getByText("Loading projects...")).toBeInTheDocument();
	});

	it("should render grid variant for cards", () => {
		const { container } = render(<LoadingState variant="grid" count={3} />);
		const skeletons = container.querySelectorAll('[data-loading="true"]');
		expect(skeletons.length).toBeGreaterThanOrEqual(3);
	});

	it("should render list variant for items", () => {
		const { container } = render(<LoadingState variant="list" count={5} />);
		const skeletons = container.querySelectorAll('[data-loading="true"]');
		expect(skeletons.length).toBeGreaterThanOrEqual(5);
	});
});
