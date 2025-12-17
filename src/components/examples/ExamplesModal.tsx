import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/api";
import type { Id, Doc } from "@/convex/dataModel";
import { Modal } from "@/components/shared/Modal";
import { ExamplesList } from "./ExamplesList";
import { ExampleForm } from "./ExampleForm";
import { LoadingState } from "../shared/LoadingState";

export interface ExamplesModalProps {
	isOpen: boolean;
	onClose: () => void;
	projectId: string;
}

const STORAGE_KEY = "examples-last-category";

export function ExamplesModal({ isOpen, onClose, projectId }: ExamplesModalProps) {
	const [selectedCategoryId, setSelectedCategoryId] = useState<Id<"categories"> | null>(null);
	const [isCreating, setIsCreating] = useState(false);
	const [editingExample, setEditingExample] = useState<Doc<"examples"> | null>(null);
	const [isSubmitting, setIsSubmitting] = useState(false);

	const categories = useQuery(api.categories.listCategories, {
		projectId: projectId as Id<"projects">,
	});

	const examples = useQuery(
		api.examples.listExamples,
		selectedCategoryId ? { categoryId: selectedCategoryId } : "skip"
	);

	const createExample = useMutation(api.examples.createExample);
	const updateExample = useMutation(api.examples.updateExample);
	const deleteExample = useMutation(api.examples.deleteExample);

	// Auto-select category on mount (restore from localStorage or use first)
	useEffect(() => {
		if (categories && categories.length > 0 && !selectedCategoryId) {
			// Try to restore from localStorage
			const stored = localStorage.getItem(`${STORAGE_KEY}-${projectId}`);
			if (stored && categories.some(cat => cat._id === stored)) {
				setSelectedCategoryId(stored as Id<"categories">);
			} else {
				// Fallback to first category
				setSelectedCategoryId(categories[0]._id);
			}
		}
	}, [categories, projectId, selectedCategoryId]);

	// Persist selection to localStorage
	const handleCategoryChange = (categoryId: string) => {
		const id = categoryId as Id<"categories">;
		setSelectedCategoryId(id);
		localStorage.setItem(`${STORAGE_KEY}-${projectId}`, id);
	};

	const handleFormSubmit = async (data: { title: string; content?: string; notes?: string }) => {
		if (!selectedCategoryId) return;

		setIsSubmitting(true);
		try {
			if (editingExample) {
				await updateExample({
					exampleId: editingExample._id,
					...data,
				});
			} else {
				await createExample({
					categoryId: selectedCategoryId,
					...data,
				});
			}
			setIsCreating(false);
			setEditingExample(null);
		} catch (error) {
			console.error("Failed to save example:", error);
		} finally {
			setIsSubmitting(false);
		}
	};

	const handleDelete = async (example: Doc<"examples">) => {
		if (confirm("Are you sure you want to delete this example?")) {
			await deleteExample({ exampleId: example._id });
		}
	};

	// Show form if creating or editing
	if (isCreating || editingExample) {
		return (
			<Modal
				isOpen={isOpen}
				onClose={onClose}
				title={editingExample ? "Edit Example" : "Add Example"}
				size="2xl"
			>
				<ExampleForm
					projectId={projectId}
					example={editingExample ?? undefined}
					onSubmit={handleFormSubmit}
					onCancel={() => {
						setIsCreating(false);
						setEditingExample(null);
					}}
					isSubmitting={isSubmitting}
				/>
			</Modal>
		);
	}

	// Show list view with category selector
	return (
		<Modal isOpen={isOpen} onClose={onClose} title="Examples" size="3xl">
			<div className="space-y-4">
				{/* Category Selector */}
				<div className="flex gap-4 items-center justify-between">
					<div className="flex items-center gap-3 flex-1">
						<label htmlFor="examples-category-select" className="text-sm font-medium text-slate-700 dark:text-slate-300 whitespace-nowrap">
							Category:
						</label>
						<select
							id="examples-category-select"
							value={selectedCategoryId ?? ""}
							onChange={(e) => handleCategoryChange(e.target.value)}
							className="flex-1 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm text-slate-900 dark:text-white focus:border-cyan-500 focus:ring-cyan-500"
							disabled={!categories || categories.length === 0}
						>
							{!categories || categories.length === 0 ? (
								<option value="">No categories available</option>
							) : (
								categories.map((cat) => (
									<option key={cat._id} value={cat._id}>
										{cat.name}
									</option>
								))
							)}
						</select>
					</div>

					{selectedCategoryId && (
						<button
							type="button"
							onClick={() => setIsCreating(true)}
							className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-cyan-600 hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500 transition-colors whitespace-nowrap"
						>
							Add Example
						</button>
					)}
				</div>

				{/* List or Empty State */}
				{categories === undefined ? (
					<LoadingState message="Loading categories..." />
				) : !selectedCategoryId ? (
					<p className="text-sm text-slate-500 dark:text-slate-400 text-center py-8">
						Please select a category to view examples.
					</p>
				) : examples === undefined ? (
					<LoadingState message="Loading examples..." />
				) : (
					<ExamplesList
						examples={examples ?? []}
						onEdit={setEditingExample}
						onDelete={handleDelete}
					/>
				)}
			</div>
		</Modal>
	);
}
