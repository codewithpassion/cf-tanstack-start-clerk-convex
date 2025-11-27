import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/api";
import { PageHeader } from "@/components/shared/PageHeader";
import { LoadingState } from "@/components/shared/LoadingState";
import { EmptyState } from "@/components/shared/EmptyState";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { CategoryList } from "@/components/categories/CategoryList";
import { CategoryForm } from "@/components/categories/CategoryForm";
import type { Category } from "@/types/entities";

export const Route = createFileRoute("/_authed/projects/$projectId/categories")({
	component: CategoriesPage,
});

function CategoriesPage() {
	const { projectId } = Route.useParams();
	const categories = useQuery(api.categories.listCategories, { projectId });

	const createCategory = useMutation(api.categories.createCategory);
	const updateCategory = useMutation(api.categories.updateCategory);
	const deleteCategory = useMutation(api.categories.deleteCategory);
	const reorderCategories = useMutation(api.categories.reorderCategories);

	const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
	const [editingCategory, setEditingCategory] = useState<Category | null>(null);
	const [deletingCategory, setDeletingCategory] = useState<Category | null>(null);
	const [isSubmitting, setIsSubmitting] = useState(false);

	const handleCreate = async (data: { name: string; description: string; formatGuidelines: string }) => {
		try {
			setIsSubmitting(true);
			await createCategory({
				projectId,
				name: data.name,
				description: data.description || undefined,
				formatGuidelines: data.formatGuidelines || undefined,
			});
			setIsCreateModalOpen(false);
		} catch (error) {
			console.error("Failed to create category:", error);
			alert("Failed to create category. Please try again.");
		} finally {
			setIsSubmitting(false);
		}
	};

	const handleEdit = async (data: { name: string; description: string; formatGuidelines: string }) => {
		if (!editingCategory) return;

		try {
			setIsSubmitting(true);
			await updateCategory({
				categoryId: editingCategory._id,
				name: data.name,
				description: data.description || undefined,
				formatGuidelines: data.formatGuidelines || undefined,
			});
			setEditingCategory(null);
		} catch (error) {
			console.error("Failed to update category:", error);
			alert("Failed to update category. Please try again.");
		} finally {
			setIsSubmitting(false);
		}
	};

	const handleDelete = async () => {
		if (!deletingCategory) return;

		try {
			setIsSubmitting(true);
			await deleteCategory({ categoryId: deletingCategory._id });
			setDeletingCategory(null);
		} catch (error) {
			console.error("Failed to delete category:", error);
			alert("Failed to delete category. Please try again.");
		} finally {
			setIsSubmitting(false);
		}
	};

	const handleReorder = async (categoryIds: string[]) => {
		try {
			await reorderCategories({
				projectId,
				categoryIds: categoryIds as any,
			});
		} catch (error) {
			console.error("Failed to reorder categories:", error);
			alert("Failed to reorder categories. Please try again.");
		}
	};

	if (categories === undefined) {
		return <LoadingState message="Loading categories..." />;
	}

	return (
		<div>
			<PageHeader
				title="Categories"
				description="Organize your content by category. Each category has format guidelines to help you create consistent content."
				action={
					<button
						type="button"
						onClick={() => setIsCreateModalOpen(true)}
						className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-cyan-600 hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500 transition-colors"
					>
						<svg
							className="w-5 h-5 mr-2"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
						>
							<title>Add</title>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={2}
								d="M12 4v16m8-8H4"
							/>
						</svg>
						Add Category
					</button>
				}
			/>

			{categories.length === 0 ? (
				<EmptyState
					title="No categories yet"
					description="Categories help you organize different types of content. Default categories are created when you create a project."
					icon={
						<svg className="w-16 h-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<title>Tags</title>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={1.5}
								d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
							/>
						</svg>
					}
					actionLabel="Create Category"
					onAction={() => setIsCreateModalOpen(true)}
				/>
			) : (
				<>
					<div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-md">
						<p className="text-sm text-blue-700">
							<strong>Tip:</strong> Drag and drop categories to reorder them. The order affects how they appear throughout the app.
						</p>
					</div>
					<CategoryList
						categories={categories}
						onReorder={handleReorder}
						onEdit={setEditingCategory}
						onDelete={setDeletingCategory}
					/>
				</>
			)}

			{/* Create Category Modal */}
			{isCreateModalOpen && (
				<div
					className="fixed inset-0 z-50 overflow-y-auto"
					aria-labelledby="create-category-modal"
					role="dialog"
					aria-modal="true"
				>
					<div className="flex min-h-screen items-center justify-center p-4">
						<div
							className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
							aria-hidden="true"
							onClick={() => !isSubmitting && setIsCreateModalOpen(false)}
						/>
						<div className="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg">
							<div className="bg-white px-6 py-6">
								<h3 className="text-lg font-semibold text-gray-900 mb-4">
									Create New Category
								</h3>
								<CategoryForm
									projectId={projectId}
									onSubmit={handleCreate}
									onCancel={() => setIsCreateModalOpen(false)}
									isLoading={isSubmitting}
								/>
							</div>
						</div>
					</div>
				</div>
			)}

			{/* Edit Category Modal */}
			{editingCategory && (
				<div
					className="fixed inset-0 z-50 overflow-y-auto"
					aria-labelledby="edit-category-modal"
					role="dialog"
					aria-modal="true"
				>
					<div className="flex min-h-screen items-center justify-center p-4">
						<div
							className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
							aria-hidden="true"
							onClick={() => !isSubmitting && setEditingCategory(null)}
						/>
						<div className="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg">
							<div className="bg-white px-6 py-6">
								<h3 className="text-lg font-semibold text-gray-900 mb-4">
									Edit Category
								</h3>
								<CategoryForm
									projectId={projectId}
									category={editingCategory}
									onSubmit={handleEdit}
									onCancel={() => setEditingCategory(null)}
									isLoading={isSubmitting}
								/>
							</div>
						</div>
					</div>
				</div>
			)}

			{/* Delete Confirmation Dialog */}
			<ConfirmDialog
				isOpen={!!deletingCategory}
				title="Delete Category"
				message={
					<p className="text-sm text-gray-500">
						Are you sure you want to delete{" "}
						<strong>{deletingCategory?.name}</strong>? This action cannot be undone.
						{deletingCategory?.isDefault && (
							<span className="block mt-2 text-yellow-700 font-medium">
								Note: This is a default category. Deleting it may affect default workflows.
							</span>
						)}
					</p>
				}
				confirmLabel="Delete"
				variant="danger"
				onConfirm={handleDelete}
				onCancel={() => setDeletingCategory(null)}
				isLoading={isSubmitting}
			/>
		</div>
	);
}
