import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { CategoryCard } from "../CategoryCard";
import type { Category } from "@/types/entities";

describe("CategoryCard", () => {
	const mockCategory: Category = {
		_id: "cat123" as any,
		_creationTime: Date.now(),
		projectId: "proj123" as any,
		name: "Blog Post",
		description: "Long-form content for your blog",
		formatGuidelines: "Word count: 800-2000 words\nStructure: Title, introduction, conclusion",
		isDefault: true,
		sortOrder: 1,
		createdAt: Date.now(),
		updatedAt: Date.now(),
	};

	it("should render category name and description", () => {
		render(
			<CategoryCard
				category={mockCategory}
				onEdit={vi.fn()}
				onDelete={vi.fn()}
			/>
		);

		expect(screen.getByText("Blog Post")).toBeInTheDocument();
		expect(screen.getByText("Long-form content for your blog")).toBeInTheDocument();
	});

	it("should display default badge for default categories", () => {
		render(
			<CategoryCard
				category={mockCategory}
				onEdit={vi.fn()}
				onDelete={vi.fn()}
			/>
		);

		expect(screen.getByText("Default")).toBeInTheDocument();
	});

	it("should not display default badge for custom categories", () => {
		const customCategory = { ...mockCategory, isDefault: false };
		render(
			<CategoryCard
				category={customCategory}
				onEdit={vi.fn()}
				onDelete={vi.fn()}
			/>
		);

		expect(screen.queryByText("Default")).not.toBeInTheDocument();
	});

	it("should call onEdit when edit button is clicked", () => {
		const handleEdit = vi.fn();
		render(
			<CategoryCard
				category={mockCategory}
				onEdit={handleEdit}
				onDelete={vi.fn()}
			/>
		);

		const editButton = screen.getByRole("button", { name: /edit/i });
		fireEvent.click(editButton);

		expect(handleEdit).toHaveBeenCalledWith(mockCategory);
	});

	it("should call onDelete when delete button is clicked", () => {
		const handleDelete = vi.fn();
		render(
			<CategoryCard
				category={mockCategory}
				onEdit={vi.fn()}
				onDelete={handleDelete}
			/>
		);

		const deleteButton = screen.getByRole("button", { name: /delete/i });
		fireEvent.click(deleteButton);

		expect(handleDelete).toHaveBeenCalledWith(mockCategory);
	});
});
