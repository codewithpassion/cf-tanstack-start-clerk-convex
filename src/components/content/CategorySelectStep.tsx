import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";

export interface CategorySelectStepProps {
	projectId: Id<"projects">;
	selectedCategoryId: Id<"categories"> | null;
	onNext: (categoryId: Id<"categories">) => void;
	onBack: (() => void) | undefined;
}

/**
 * Step 1: Category selection for content creation.
 * Displays list of project categories and requires selection before proceeding.
 */
export function CategorySelectStep({
	projectId,
	selectedCategoryId,
	onNext,
	onBack,
}: CategorySelectStepProps) {
	const categories = useQuery(api.categories.listCategories, { projectId });
	const [selected, setSelected] = useState<Id<"categories"> | null>(selectedCategoryId);
	const [error, setError] = useState<string | null>(null);

	const handleNext = () => {
		if (!selected) {
			setError("Please select a content category to continue");
			return;
		}
		setError(null);
		onNext(selected);
	};

	if (categories === undefined) {
		return (
			<div className="text-center py-8">
				<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-600 mx-auto" />
				<p className="mt-2 text-slate-500">Loading categories...</p>
			</div>
		);
	}

	if (categories === null || categories.length === 0) {
		return (
			<div className="text-center py-8">
				<p className="text-slate-600 mb-4">No categories available for this project.</p>
				<p className="text-sm text-slate-500">
					Please create a category first in your project settings.
				</p>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			<div>
				<h2 id="wizard-title" className="text-2xl font-bold text-slate-900">
					Select Content Category
				</h2>
				<p className="mt-2 text-slate-600">
					Choose the type of content you want to create.
				</p>
			</div>

			<div className="space-y-3">
				<label htmlFor="category-select" className="block text-sm font-medium text-slate-700">
					Content Category <span className="text-red-500">*</span>
				</label>
				<select
					id="category-select"
					value={selected || ""}
					onChange={(e) => {
						setSelected(e.target.value as Id<"categories">);
						setError(null);
					}}
					className="w-full rounded-lg border-slate-300 shadow-sm focus:border-cyan-500 focus:ring-cyan-500 text-slate-900 bg-white"
					aria-required="true"
					aria-describedby={error ? "category-error" : undefined}
				>
					<option value="">-- Select a category --</option>
					{categories.map((category) => (
						<option key={category._id} value={category._id}>
							{category.name}
							{category.description ? ` - ${category.description}` : ""}
						</option>
					))}
				</select>
				{error && (
					<p id="category-error" className="text-sm text-red-600" role="alert">
						{error}
					</p>
				)}
			</div>

			{selected && (
				<div className="bg-cyan-50 border border-cyan-200 rounded-lg p-4">
					<h3 className="font-medium text-cyan-900 mb-1">Selected Category</h3>
					<p className="text-sm text-cyan-700">
						{categories.find((c) => c._id === selected)?.name}
					</p>
					{categories.find((c) => c._id === selected)?.description && (
						<p className="text-sm text-cyan-600 mt-1">
							{categories.find((c) => c._id === selected)?.description}
						</p>
					)}
				</div>
			)}

			<div className="flex gap-3 justify-end pt-4 border-t">
				{onBack && (
					<button
						type="button"
						onClick={onBack}
						className="px-4 py-2 text-slate-700 hover:bg-slate-100 rounded-lg"
					>
						Back
					</button>
				)}
				<button
					type="button"
					onClick={handleNext}
					className="px-6 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 disabled:opacity-50"
				>
					Next
				</button>
			</div>
		</div>
	);
}
