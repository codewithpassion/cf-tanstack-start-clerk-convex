import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ExamplesList } from "../ExamplesList";
import type { Doc } from "../../../../convex/_generated/dataModel";

describe("ExamplesList", () => {
	it("renders empty state when no examples", () => {
		render(<ExamplesList examples={[]} />);
		expect(screen.getByText(/no examples/i)).toBeInTheDocument();
	});

	it("renders list of examples", () => {
		const mockExamples: Doc<"examples">[] = [
			{
				_id: "ex1" as any,
				_creationTime: Date.now(),
				categoryId: "cat1" as any,
				projectId: "proj1" as any,
				title: "Great LinkedIn Post",
				content: "This is an example of a great post",
				notes: "Generated 10k impressions",
				createdAt: Date.now(),
				updatedAt: Date.now(),
			},
			{
				_id: "ex2" as any,
				_creationTime: Date.now(),
				categoryId: "cat1" as any,
				projectId: "proj1" as any,
				title: "Blog Post Example",
				fileId: "file1" as any,
				createdAt: Date.now(),
				updatedAt: Date.now(),
			},
		];

		render(<ExamplesList examples={mockExamples} />);
		expect(screen.getByText("Great LinkedIn Post")).toBeInTheDocument();
		expect(screen.getByText("Blog Post Example")).toBeInTheDocument();
	});

	it("displays notes when available", () => {
		const mockExamples: Doc<"examples">[] = [
			{
				_id: "ex1" as any,
				_creationTime: Date.now(),
				categoryId: "cat1" as any,
				projectId: "proj1" as any,
				title: "Example Post",
				content: "Content here",
				notes: "Performed exceptionally well",
				createdAt: Date.now(),
				updatedAt: Date.now(),
			},
		];

		render(<ExamplesList examples={mockExamples} />);
		expect(screen.getByText(/Performed exceptionally well/i)).toBeInTheDocument();
	});

	it("shows content preview", () => {
		const mockExamples: Doc<"examples">[] = [
			{
				_id: "ex1" as any,
				_creationTime: Date.now(),
				categoryId: "cat1" as any,
				projectId: "proj1" as any,
				title: "Example",
				content: "This is a sample content that should be previewed in the card",
				createdAt: Date.now(),
				updatedAt: Date.now(),
			},
		];

		render(<ExamplesList examples={mockExamples} />);
		expect(screen.getByText(/This is a sample content/)).toBeInTheDocument();
	});
});
