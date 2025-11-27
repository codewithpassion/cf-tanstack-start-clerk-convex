import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { KnowledgeBaseList } from "../KnowledgeBaseList";
import type { Doc } from "../../../../convex/_generated/dataModel";

describe("KnowledgeBaseList", () => {
	it("renders empty state when no items", () => {
		render(<KnowledgeBaseList items={[]} />);
		expect(screen.getByText(/no knowledge base items/i)).toBeInTheDocument();
	});

	it("renders list of knowledge base items", () => {
		const mockItems: Doc<"knowledgeBaseItems">[] = [
			{
				_id: "kb1" as any,
				_creationTime: Date.now(),
				categoryId: "cat1" as any,
				projectId: "proj1" as any,
				title: "API Documentation",
				content: "This is the API documentation content",
				createdAt: Date.now(),
				updatedAt: Date.now(),
			},
			{
				_id: "kb2" as any,
				_creationTime: Date.now(),
				categoryId: "cat1" as any,
				projectId: "proj1" as any,
				title: "Style Guide",
				fileId: "file1" as any,
				createdAt: Date.now(),
				updatedAt: Date.now(),
			},
		];

		render(<KnowledgeBaseList items={mockItems} />);
		expect(screen.getByText("API Documentation")).toBeInTheDocument();
		expect(screen.getByText("Style Guide")).toBeInTheDocument();
	});

	it("shows content preview for text items", () => {
		const mockItems: Doc<"knowledgeBaseItems">[] = [
			{
				_id: "kb1" as any,
				_creationTime: Date.now(),
				categoryId: "cat1" as any,
				projectId: "proj1" as any,
				title: "Documentation",
				content: "This is a long piece of content that should be truncated in the preview",
				createdAt: Date.now(),
				updatedAt: Date.now(),
			},
		];

		render(<KnowledgeBaseList items={mockItems} />);
		expect(screen.getByText(/This is a long piece of content/)).toBeInTheDocument();
	});

	it("shows file indicator for items with files", () => {
		const mockItems: Doc<"knowledgeBaseItems">[] = [
			{
				_id: "kb1" as any,
				_creationTime: Date.now(),
				categoryId: "cat1" as any,
				projectId: "proj1" as any,
				title: "Documentation",
				fileId: "file1" as any,
				createdAt: Date.now(),
				updatedAt: Date.now(),
			},
		];

		render(<KnowledgeBaseList items={mockItems} />);
		// Should show file attachment indicator text
		expect(screen.getByText(/file attachment/i)).toBeInTheDocument();
	});
});
