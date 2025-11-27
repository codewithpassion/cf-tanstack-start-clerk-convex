import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { CategoryList } from "../CategoryList";
import type { Category } from "@/types/entities";

describe("CategoryList", () => {
	const mockCategories: Category[] = [
		{
			_id: "cat1" as any,
			_creationTime: Date.now(),
			projectId: "proj1" as any,
			name: "Blog Post",
			description: "Long-form content",
			isDefault: true,
			sortOrder: 1,
			createdAt: Date.now(),
			updatedAt: Date.now(),
		},
		{
			_id: "cat2" as any,
			_creationTime: Date.now(),
			projectId: "proj1" as any,
			name: "LinkedIn Post",
			description: "Professional content",
			isDefault: true,
			sortOrder: 2,
			createdAt: Date.now(),
			updatedAt: Date.now(),
		},
		{
			_id: "cat3" as any,
			_creationTime: Date.now(),
			projectId: "proj1" as any,
			name: "Custom Category",
			description: "Custom content type",
			isDefault: false,
			sortOrder: 3,
			createdAt: Date.now(),
			updatedAt: Date.now(),
		},
	];

	it("should render all categories in order", () => {
		render(
			<CategoryList
				categories={mockCategories}
				onReorder={vi.fn()}
				onEdit={vi.fn()}
				onDelete={vi.fn()}
			/>
		);

		expect(screen.getByText("Blog Post")).toBeInTheDocument();
		expect(screen.getByText("LinkedIn Post")).toBeInTheDocument();
		expect(screen.getByText("Custom Category")).toBeInTheDocument();
	});

	it("should distinguish default and custom categories", () => {
		render(
			<CategoryList
				categories={mockCategories}
				onReorder={vi.fn()}
				onEdit={vi.fn()}
				onDelete={vi.fn()}
			/>
		);

		const defaultBadges = screen.getAllByText("Default");
		expect(defaultBadges).toHaveLength(2);
	});

	it("should render empty state when no categories", () => {
		render(
			<CategoryList
				categories={[]}
				onReorder={vi.fn()}
				onEdit={vi.fn()}
				onDelete={vi.fn()}
			/>
		);

		expect(screen.getByText(/no categories/i)).toBeInTheDocument();
	});
});
