import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ContentCard } from "../ContentCard";
import type { ContentPiece } from "@/types/entities";
import type { Id } from "@/convex/dataModel";

describe("ContentCard", () => {
	const mockContentPiece: ContentPiece & {
		category: { name: string } | null;
		persona: { name: string } | null;
		brandVoice: { name: string } | null;
	} = {
		_id: "content1" as Id<"contentPieces">,
		_creationTime: Date.now() - 86400000,
		projectId: "project1" as Id<"projects">,
		categoryId: "category1" as Id<"categories">,
		title: "Test Content",
		content: "{}",
		status: "draft",
		createdAt: Date.now() - 86400000,
		updatedAt: Date.now() - 3600000,
		category: { name: "Blog Post" },
		persona: { name: "Marketing Pro" },
		brandVoice: { name: "Professional" },
	};

	it("renders content card with title and category", () => {
		render(<ContentCard contentPiece={mockContentPiece} onClick={vi.fn()} />);

		expect(screen.getByText("Test Content")).toBeInTheDocument();
		expect(screen.getByText("Blog Post")).toBeInTheDocument();
	});

	it("displays status badge", () => {
		render(<ContentCard contentPiece={mockContentPiece} onClick={vi.fn()} />);

		expect(screen.getByText("Draft")).toBeInTheDocument();
	});

	it("displays timestamps", () => {
		render(<ContentCard contentPiece={mockContentPiece} onClick={vi.fn()} />);

		expect(screen.getByText(/Created/)).toBeInTheDocument();
		expect(screen.getByText(/Updated/)).toBeInTheDocument();
	});

	it("calls onClick when card is clicked", () => {
		const onClick = vi.fn();
		render(<ContentCard contentPiece={mockContentPiece} onClick={onClick} />);

		const card = screen.getByRole("article");
		card.click();

		expect(onClick).toHaveBeenCalledWith("content1");
	});
});
