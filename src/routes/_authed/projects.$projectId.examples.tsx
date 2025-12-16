import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation } from "convex/react";
import { useState } from "react";
import { api } from "@/convex/api";
import type { Id } from "@/convex/dataModel";
import { PageHeader } from "@/components/shared/PageHeader";
import { LoadingState } from "@/components/shared/LoadingState";
import { EmptyState } from "@/components/shared/EmptyState";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { ExamplesList } from "@/components/examples/ExamplesList";
import { ExampleForm } from "@/components/examples/ExampleForm";

export const Route = createFileRoute("/_authed/projects/$projectId/examples")({
	component: ExamplesPage,
});

function ExamplesPage() {
	const { projectId } = Route.useParams();
	const categories = useQuery(api.categories.listCategories, {
		projectId: projectId as Id<"projects">,
	});

	const [selectedCategoryId, setSelectedCategoryId] = useState<Id<"categories"> | null>(null);
	const [isFormOpen, setIsFormOpen] = useState(false);
	const [editingExample, setEditingExample] = useState<any>(null);
	const [deletingExample, setDeletingExample] = useState<any>(null);

	const examples = useQuery(
		api.examples.listExamples,
		selectedCategoryId ? { categoryId: selectedCategoryId } : "skip"
	);

	const createExample = useMutation(api.examples.createExample);
	const updateExample = useMutation(api.examples.updateExample);
	const deleteExample = useMutation(api.examples.deleteExample);

	const [isSubmitting, setIsSubmitting] = useState(false);

	// Auto-select first category if none selected
	if (categories && categories.length > 0 && !selectedCategoryId) {
		setSelectedCategoryId(categories[0]._id);
	}

	const handleCreate = () => {
		setEditingExample(null);
		setIsFormOpen(true);
	};

	const handleEdit = (example: any) => {
		setEditingExample(example);
		setIsFormOpen(true);
	};

	const handleDelete = (example: any) => {
		setDeletingExample(example);
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
			setIsFormOpen(false);
			setEditingExample(null);
		} catch (error) {
			console.error("Failed to save example:", error);
		} finally {
			setIsSubmitting(false);
		}
	};

	const handleDeleteConfirm = async () => {
		if (!deletingExample) return;

		try {
			await deleteExample({ exampleId: deletingExample._id });
			setDeletingExample(null);
		} catch (error) {
			console.error("Failed to delete example:", error);
		}
	};

	if (categories === undefined) {
		return <LoadingState message="Loading categories..." />;
	}

	if (categories.length === 0) {
		return (
			<div>
				<PageHeader
					title="Examples"
					description="Store successful content samples to guide the style and quality of future content."
				/>
				<EmptyState
					title="No categories available"
					description="Create categories in your project before adding examples."
					icon={
						<svg className="w-16 h-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<title>Folder</title>
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
						</svg>
					}
				/>
			</div>
		);
	}

	return (
		<div>
			<PageHeader
				title="Examples"
				description="Store successful content samples to guide the style and quality of future content."
			/>

			{/* Category Filter */}
			<div className="mb-6 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
				<div className="flex-1">
					<label htmlFor="category-select" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
						Select Category
					</label>
					<select
						id="category-select"
						value={selectedCategoryId || ""}
						onChange={(e) => setSelectedCategoryId(e.target.value as Id<"categories">)}
						className="w-full sm:w-auto px-4 py-2 text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
					>
						{categories.map((category) => (
							<option key={category._id} value={category._id}>
								{category.name}
							</option>
						))}
					</select>
				</div>

				<button
					type="button"
					onClick={handleCreate}
					disabled={!selectedCategoryId}
					className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-cyan-600 hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
				>
					<svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<title>Add</title>
						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
					</svg>
					Add Example
				</button>
			</div>

			{/* Examples List */}
			{examples === undefined ? (
				<LoadingState message="Loading examples..." />
			) : (
				<ExamplesList
					examples={examples}
					onEdit={handleEdit}
					onDelete={handleDelete}
				/>
			)}

			{/* Create/Edit Modal */}
			{isFormOpen && (
				<div className="fixed inset-0 z-50 overflow-y-auto" role="dialog" aria-modal="true">
					<div className="flex min-h-screen items-center justify-center p-4">
						<div
							className="fixed inset-0 bg-slate-500 dark:bg-slate-900 bg-opacity-75 dark:bg-opacity-85 transition-opacity"
							onClick={() => setIsFormOpen(false)}
						/>
						<div className="relative transform overflow-hidden rounded-lg bg-white dark:bg-slate-900 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-2xl">
							<div className="bg-white dark:bg-slate-900 px-6 py-6">
								<h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
									{editingExample ? "Edit Example" : "Add Example"}
								</h3>
								<ExampleForm
									example={editingExample}
									onSubmit={handleFormSubmit}
									onCancel={() => {
										setIsFormOpen(false);
										setEditingExample(null);
									}}
									isSubmitting={isSubmitting}
								/>
							</div>
						</div>
					</div>
				</div>
			)}

			{/* Delete Confirmation */}
			<ConfirmDialog
				isOpen={!!deletingExample}
				title="Delete Example"
				message={`Are you sure you want to delete "${deletingExample?.title}"? This action cannot be undone.`}
				confirmLabel="Delete"
				onConfirm={handleDeleteConfirm}
				onCancel={() => setDeletingExample(null)}
				variant="danger"
			/>
		</div>
	);
}
