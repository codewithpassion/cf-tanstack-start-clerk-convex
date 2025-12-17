import { useState } from "react";
import type { Category } from "@/types/entities";

export interface CategoryFormProps {
	projectId: string;
	category?: Category;
	onSubmit: (data: { name: string; description: string; formatGuidelines: string }) => void;
	onCancel: () => void;
	isLoading?: boolean;
}

/**
 * Category form component for creating and editing categories.
 * Validates input and displays error messages.
 */
export function CategoryForm({ category, onSubmit, onCancel, isLoading = false }: CategoryFormProps) {
	const [name, setName] = useState(category?.name || "");
	const [description, setDescription] = useState(category?.description || "");
	const [formatGuidelines, setFormatGuidelines] = useState(category?.formatGuidelines || "");
	const [errors, setErrors] = useState<Record<string, string>>({});

	const isEditMode = !!category;

	const validateForm = (): boolean => {
		const newErrors: Record<string, string> = {};

		if (!name.trim()) {
			newErrors.name = "Name is required";
		} else if (name.trim().length > 50) {
			newErrors.name = "Name must be 50 characters or less";
		}

		if (description && description.trim().length > 2000) {
			newErrors.description = "Description must be 2000 characters or less";
		}

		if (formatGuidelines && formatGuidelines.trim().length > 5000) {
			newErrors.formatGuidelines = "Format guidelines must be 5000 characters or less";
		}

		setErrors(newErrors);
		return Object.keys(newErrors).length === 0;
	};

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		if (validateForm()) {
			onSubmit({
				name: name.trim(),
				description: description.trim(),
				formatGuidelines: formatGuidelines.trim(),
			});
		}
	};

	return (
		<form onSubmit={handleSubmit} className="space-y-4">
			<div>
				<label htmlFor="category-name" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
					Name <span className="text-red-500">*</span>
				</label>
				<input
					id="category-name"
					type="text"
					value={name}
					onChange={(e) => setName(e.target.value)}
					maxLength={50}
					disabled={isLoading}
					className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-md shadow-sm focus:outline-none focus:ring-cyan-500 focus:border-cyan-500 disabled:bg-slate-100 dark:disabled:bg-slate-800 disabled:cursor-not-allowed text-slate-900 dark:text-white bg-white dark:bg-slate-950"
					placeholder="e.g., Newsletter, Product Update"
					aria-invalid={!!errors.name}
					aria-describedby={errors.name ? "name-error" : undefined}
				/>
				{errors.name && (
					<p id="name-error" className="mt-1 text-sm text-red-600 dark:text-red-400">
						{errors.name}
					</p>
				)}
				<p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{name.length}/50 characters</p>
			</div>

			<div>
				<label htmlFor="category-description" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
					Description
				</label>
				<textarea
					id="category-description"
					value={description}
					onChange={(e) => setDescription(e.target.value)}
					maxLength={2000}
					rows={3}
					disabled={isLoading}
					className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-md shadow-sm focus:outline-none focus:ring-cyan-500 focus:border-cyan-500 disabled:bg-slate-100 dark:disabled:bg-slate-800 disabled:cursor-not-allowed text-slate-900 dark:text-white bg-white dark:bg-slate-950"
					placeholder="Describe the purpose of this category"
					aria-invalid={!!errors.description}
					aria-describedby={errors.description ? "description-error" : undefined}
				/>
				{errors.description && (
					<p id="description-error" className="mt-1 text-sm text-red-600 dark:text-red-400">
						{errors.description}
					</p>
				)}
				<p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{description.length}/2000 characters</p>
			</div>

			<div>
				<label htmlFor="category-guidelines" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
					Format Guidelines
				</label>
				<textarea
					id="category-guidelines"
					value={formatGuidelines}
					onChange={(e) => setFormatGuidelines(e.target.value)}
					maxLength={5000}
					rows={6}
					disabled={isLoading}
					className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-md shadow-sm focus:outline-none focus:ring-cyan-500 focus:border-cyan-500 font-mono text-sm disabled:bg-slate-100 disabled:cursor-not-allowed text-slate-900 dark:text-white bg-white dark:bg-slate-950"
					placeholder="Word count: 500-1000 words&#10;Structure: Title, introduction, body, conclusion&#10;Tone: Professional yet conversational"
					aria-invalid={!!errors.formatGuidelines}
					aria-describedby={errors.formatGuidelines ? "guidelines-error" : undefined}
				/>
				{errors.formatGuidelines && (
					<p id="guidelines-error" className="mt-1 text-sm text-red-600 dark:text-red-400">
						{errors.formatGuidelines}
					</p>
				)}
				<p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{formatGuidelines.length}/5000 characters</p>
			</div>

			<div className="flex justify-end gap-3 pt-4">
				<button
					type="button"
					onClick={onCancel}
					disabled={isLoading}
					className="px-4 py-2 border border-slate-300 dark:border-slate-700 text-sm font-medium rounded-md text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
				>
					Cancel
				</button>
				<button
					type="submit"
					disabled={isLoading}
					className="px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-cyan-600 hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
				>
					{isLoading ? "Saving..." : isEditMode ? "Update Category" : "Create Category"}
				</button>
			</div>
		</form>
	);
}
