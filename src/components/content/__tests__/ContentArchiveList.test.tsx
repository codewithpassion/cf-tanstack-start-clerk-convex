import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ContentArchiveList } from "../ContentArchiveList";
import type { ContentPiece } from "@/types/entities";
import type { Id } from "@/convex/dataModel";

describe("ContentArchiveList", () => {
	const mockContentPieces: (ContentPiece & {
		category: { name: string } | null;
		persona: { name: string } | null;
		brandVoice: { name: string } | null;
	})[] = [
			{
				_id: "content1" as Id<"contentPieces">,
				_creationTime: Date.now() - 86400000,
				projectId: "project1" as Id<"projects">,
				categoryId: "category1" as Id<"categories">,
				title: "Test Content 1",
				content: "{}",
				status: "draft",
				createdAt: Date.now() - 86400000,
				updatedAt: Date.now() - 3600000,
				category: { name: "Blog Post" },
				persona: { name: "Marketing Pro" },
				brandVoice: { name: "Professional" },
			},
			{
				_id: "content2" as Id<"contentPieces">,
				_creationTime: Date.now() - 172800000,
				projectId: "project1" as Id<"projects">,
				categoryId: "category2" as Id<"categories">,
				title: "Test Content 2",
				content: "{}",
				status: "finalized",
				currentFinalizedVersion: 1,
				createdAt: Date.now() - 172800000,
				updatedAt: Date.now() - 7200000,
				category: { name: "Social Media" },
				persona: null,
				brandVoice: null,
			},
		];

	it("renders empty state when no content pieces", () => {
		render(
			<ContentArchiveList
				contentPieces={[]}
				onEdit={vi.fn()}
				onSelectionChange={vi.fn()}
				selectedIds={[]}
			/>,
		);

		expect(screen.getByText("No content pieces found")).toBeInTheDocument();
	});

	it("renders archive list with content pieces", () => {
		render(
			<ContentArchiveList
				contentPieces={mockContentPieces}
				onEdit={vi.fn()}
				onSelectionChange={vi.fn()}
				selectedIds={[]}
			/>
		);

		expect(screen.getByText("Test Content 1")).toBeInTheDocument();
		expect(screen.getByText("Test Content 2")).toBeInTheDocument();
		expect(screen.getByText("Blog Post")).toBeInTheDocument();
		expect(screen.getByText("Social Media")).toBeInTheDocument();
	});

	it("displays status badges correctly", () => {
		render(
			<ContentArchiveList
				contentPieces={mockContentPieces}
				onEdit={vi.fn()}
				onSelectionChange={vi.fn()}
				selectedIds={[]}
			/>
		);

		expect(screen.getByText("Draft")).toBeInTheDocument();
		expect(screen.getByText("Finalized")).toBeInTheDocument();
	});

	it("calls onEdit when row is clicked", () => {
		const onEdit = vi.fn();
		render(
			<ContentArchiveList
				contentPieces={mockContentPieces}
				onEdit={onEdit}
				onSelectionChange={vi.fn()}
				selectedIds={[]}
			/>
		);

		const row = screen.getByText("Test Content 1").closest("tr");
		row?.click();

		expect(onEdit).toHaveBeenCalledWith("content1");
	});

	it("handles selection changes for bulk actions", () => {
		const onSelectionChange = vi.fn();
		render(
			<ContentArchiveList
				contentPieces={mockContentPieces}
				onEdit={vi.fn()}
				onSelectionChange={onSelectionChange}
				selectedIds={[]}
			/>
		);

		const checkboxes = screen.getAllByRole("checkbox");
		checkboxes[1].click(); // Click first item checkbox (index 0 is select all)

		expect(onSelectionChange).toHaveBeenCalled();
	});
});
