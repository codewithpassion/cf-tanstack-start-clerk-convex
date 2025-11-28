import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ContentArchiveView } from "../ContentArchiveView";
import type { Id } from "@/convex/dataModel";

describe("ContentArchiveView", () => {
	const mockContentPieces = [
		{
			_id: "content1" as Id<"contentPieces">,
			_creationTime: Date.now() - 86400000,
			projectId: "project1" as Id<"projects">,
			categoryId: "category1" as Id<"categories">,
			title: "Test Content 1",
			content: "{}",
			status: "draft" as const,
			createdAt: Date.now() - 86400000,
			updatedAt: Date.now() - 3600000,
			category: { name: "Blog Post" },
			persona: null,
			brandVoice: null,
		},
		{
			_id: "content2" as Id<"contentPieces">,
			_creationTime: Date.now() - 172800000,
			projectId: "project1" as Id<"projects">,
			categoryId: "category2" as Id<"categories">,
			title: "Test Content 2",
			content: "{}",
			status: "finalized" as const,
			currentFinalizedVersion: 1,
			createdAt: Date.now() - 172800000,
			updatedAt: Date.now() - 7200000,
			category: { name: "Social Media" },
			persona: null,
			brandVoice: null,
		},
	];

	it("renders with pagination controls", () => {
		render(
			<ContentArchiveView
				contentPieces={mockContentPieces}
				totalCount={50}
				categories={[]}
				personas={[]}
				brandVoices={[]}
				onFiltersChange={vi.fn()}
				onPageChange={vi.fn()}
				onPageSizeChange={vi.fn()}
				onNavigateToContent={vi.fn()}
				onBulkDelete={vi.fn()}
				currentPage={1}
				pageSize={25}
				filters={{}}
			/>
		);

		// Check for pagination buttons (Previous/Next) - there may be multiple (mobile/desktop)
		const prevButtons = screen.getAllByText("Previous");
		expect(prevButtons.length).toBeGreaterThan(0);
		const nextButtons = screen.getAllByText("Next");
		expect(nextButtons.length).toBeGreaterThan(0);
		// Check for page indicator
		expect(screen.getByText(/Page 1 of/)).toBeInTheDocument();
	});

	it("displays select all checkbox for bulk actions", () => {
		render(
			<ContentArchiveView
				contentPieces={mockContentPieces}
				totalCount={2}
				categories={[]}
				personas={[]}
				brandVoices={[]}
				onFiltersChange={vi.fn()}
				onPageChange={vi.fn()}
				onPageSizeChange={vi.fn()}
				onNavigateToContent={vi.fn()}
				onBulkDelete={vi.fn()}
				currentPage={1}
				pageSize={25}
				filters={{}}
			/>
		);

		const checkboxes = screen.getAllByRole("checkbox");
		expect(checkboxes.length).toBeGreaterThan(0);
	});

	it("enables bulk delete when items are selected", () => {
		render(
			<ContentArchiveView
				contentPieces={mockContentPieces}
				totalCount={2}
				categories={[]}
				personas={[]}
				brandVoices={[]}
				onFiltersChange={vi.fn()}
				onPageChange={vi.fn()}
				onPageSizeChange={vi.fn()}
				onNavigateToContent={vi.fn()}
				onBulkDelete={vi.fn()}
				currentPage={1}
				pageSize={25}
				filters={{}}
			/>
		);

		const checkboxes = screen.getAllByRole("checkbox");
		fireEvent.click(checkboxes[1]); // Click first item

		const deleteButton = screen.getByText("Delete Selected");
		expect(deleteButton).not.toBeDisabled();
	});
});
