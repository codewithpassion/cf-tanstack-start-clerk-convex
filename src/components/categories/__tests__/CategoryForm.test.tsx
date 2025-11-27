import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { CategoryForm } from "../CategoryForm";
import type { Category } from "@/types/entities";

describe("CategoryForm", () => {
	const mockCategory: Category = {
		_id: "cat123" as any,
		_creationTime: Date.now(),
		projectId: "proj123" as any,
		name: "Blog Post",
		description: "Long-form content",
		formatGuidelines: "800-2000 words",
		isDefault: true,
		sortOrder: 1,
		createdAt: Date.now(),
		updatedAt: Date.now(),
	};

	it("should render empty form for create mode", () => {
		render(
			<CategoryForm
				projectId="proj123"
				onSubmit={vi.fn()}
				onCancel={vi.fn()}
			/>
		);

		expect(screen.getByLabelText(/name/i)).toHaveValue("");
		expect(screen.getByRole("button", { name: /create category/i })).toBeInTheDocument();
	});

	it("should render populated form for edit mode", () => {
		render(
			<CategoryForm
				projectId="proj123"
				category={mockCategory}
				onSubmit={vi.fn()}
				onCancel={vi.fn()}
			/>
		);

		expect(screen.getByLabelText(/name/i)).toHaveValue("Blog Post");
		expect(screen.getByLabelText(/description/i)).toHaveValue("Long-form content");
		expect(screen.getByLabelText(/format guidelines/i)).toHaveValue("800-2000 words");
		expect(screen.getByRole("button", { name: /update category/i })).toBeInTheDocument();
	});

	it("should validate required name field", async () => {
		render(
			<CategoryForm
				projectId="proj123"
				onSubmit={vi.fn()}
				onCancel={vi.fn()}
			/>
		);

		const submitButton = screen.getByRole("button", { name: /create category/i });
		fireEvent.click(submitButton);

		await waitFor(() => {
			expect(screen.getByText(/name is required/i)).toBeInTheDocument();
		});
	});

	it("should call onSubmit with form data", async () => {
		const handleSubmit = vi.fn();
		render(
			<CategoryForm
				projectId="proj123"
				onSubmit={handleSubmit}
				onCancel={vi.fn()}
			/>
		);

		fireEvent.change(screen.getByLabelText(/name/i), {
			target: { value: "Custom Category" },
		});
		fireEvent.change(screen.getByLabelText(/description/i), {
			target: { value: "Custom description" },
		});

		const submitButton = screen.getByRole("button", { name: /create category/i });
		fireEvent.click(submitButton);

		await waitFor(() => {
			expect(handleSubmit).toHaveBeenCalledWith({
				name: "Custom Category",
				description: "Custom description",
				formatGuidelines: "",
			});
		});
	});

	it("should call onCancel when cancel button is clicked", () => {
		const handleCancel = vi.fn();
		render(
			<CategoryForm
				projectId="proj123"
				onSubmit={vi.fn()}
				onCancel={handleCancel}
			/>
		);

		const cancelButton = screen.getByRole("button", { name: /cancel/i });
		fireEvent.click(cancelButton);

		expect(handleCancel).toHaveBeenCalled();
	});
});
