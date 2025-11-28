import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ContentFilters } from "../ContentFilters";
import type { Id } from "@/convex/dataModel";

describe("ContentFilters", () => {
	const mockCategories = [
		{ _id: "cat1" as Id<"categories">, name: "Blog Post" },
		{ _id: "cat2" as Id<"categories">, name: "Social Media" },
	];

	const mockPersonas = [
		{ _id: "persona1" as Id<"personas">, name: "Marketing Pro" },
		{ _id: "persona2" as Id<"personas">, name: "Tech Expert" },
	];

	const mockBrandVoices = [
		{ _id: "voice1" as Id<"brandVoices">, name: "Professional" },
		{ _id: "voice2" as Id<"brandVoices">, name: "Casual" },
	];

	it("renders all filter controls", () => {
		render(
			<ContentFilters
				categories={mockCategories}
				personas={mockPersonas}
				brandVoices={mockBrandVoices}
				filters={{}}
				onFiltersChange={vi.fn()}
			/>
		);

		expect(screen.getByText("Category")).toBeInTheDocument();
		expect(screen.getByText("Persona")).toBeInTheDocument();
		expect(screen.getByText("Brand Voice")).toBeInTheDocument();
		expect(screen.getByText("Status")).toBeInTheDocument();
	});

	it("calls onFiltersChange when category is selected", () => {
		const onFiltersChange = vi.fn();
		render(
			<ContentFilters
				categories={mockCategories}
				personas={mockPersonas}
				brandVoices={mockBrandVoices}
				filters={{}}
				onFiltersChange={onFiltersChange}
			/>
		);

		const categorySelect = screen.getByLabelText("Category");
		fireEvent.change(categorySelect, { target: { value: "cat1" } });

		expect(onFiltersChange).toHaveBeenCalledWith(
			expect.objectContaining({
				categoryId: "cat1",
			})
		);
	});

	it("calls onFiltersChange when status is selected", () => {
		const onFiltersChange = vi.fn();
		render(
			<ContentFilters
				categories={mockCategories}
				personas={mockPersonas}
				brandVoices={mockBrandVoices}
				filters={{}}
				onFiltersChange={onFiltersChange}
			/>
		);

		const statusSelect = screen.getByLabelText("Status");
		fireEvent.change(statusSelect, { target: { value: "draft" } });

		expect(onFiltersChange).toHaveBeenCalledWith(
			expect.objectContaining({
				status: "draft",
			})
		);
	});

	it("shows clear filters button when filters are applied", () => {
		render(
			<ContentFilters
				categories={mockCategories}
				personas={mockPersonas}
				brandVoices={mockBrandVoices}
				filters={{ status: "draft" }}
				onFiltersChange={vi.fn()}
			/>
		);

		expect(screen.getByText("Clear Filters")).toBeInTheDocument();
	});
});
