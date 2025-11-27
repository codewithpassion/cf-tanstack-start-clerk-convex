import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation } from "convex/react";
import { useState } from "react";
import { api } from "@/convex/api";
import type { Id } from "@/convex/dataModel";
import { PageHeader } from "@/components/shared/PageHeader";
import { LoadingState } from "@/components/shared/LoadingState";
import { EmptyState } from "@/components/shared/EmptyState";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { KnowledgeBaseList } from "@/components/knowledge-base/KnowledgeBaseList";
import { KnowledgeBaseItemForm } from "@/components/knowledge-base/KnowledgeBaseItemForm";

export const Route = createFileRoute("/_authed/projects/$projectId/knowledge-base")({
	component: KnowledgeBasePage,
});

function KnowledgeBasePage() {
	const { projectId } = Route.useParams();
	const categories = useQuery(api.categories.listCategories, {
		projectId: projectId as Id<"projects">,
	});

	const [selectedCategoryId, setSelectedCategoryId] = useState<Id<"categories"> | null>(null);
	const [isFormOpen, setIsFormOpen] = useState(false);
	const [editingItem, setEditingItem] = useState<any>(null);
	const [deletingItem, setDeletingItem] = useState<any>(null);

	const items = useQuery(
		api.knowledgeBase.listKnowledgeBaseItems,
		selectedCategoryId ? { categoryId: selectedCategoryId } : "skip"
	);

	const createItem = useMutation(api.knowledgeBase.createKnowledgeBaseItem);
	const updateItem = useMutation(api.knowledgeBase.updateKnowledgeBaseItem);
	const deleteItem = useMutation(api.knowledgeBase.deleteKnowledgeBaseItem);

	const [isSubmitting, setIsSubmitting] = useState(false);

	// Auto-select first category if none selected
	if (categories && categories.length > 0 && !selectedCategoryId) {
		setSelectedCategoryId(categories[0]._id);
	}

	const handleCreate = () => {
		setEditingItem(null);
		setIsFormOpen(true);
	};

	const handleEdit = (item: any) => {
		setEditingItem(item);
		setIsFormOpen(true);
	};

	const handleDelete = (item: any) => {
		setDeletingItem(item);
	};

	const handleFormSubmit = async (data: { title: string; content?: string }) => {
		if (!selectedCategoryId) return;

		setIsSubmitting(true);
		try {
			if (editingItem) {
				await updateItem({
					itemId: editingItem._id,
					...data,
				});
			} else {
				await createItem({
					categoryId: selectedCategoryId,
					...data,
				});
			}
			setIsFormOpen(false);
			setEditingItem(null);
		} catch (error) {
			console.error("Failed to save knowledge base item:", error);
		} finally {
			setIsSubmitting(false);
		}
	};

	const handleDeleteConfirm = async () => {
		if (!deletingItem) return;

		try {
			await deleteItem({ itemId: deletingItem._id });
			setDeletingItem(null);
		} catch (error) {
			console.error("Failed to delete knowledge base item:", error);
		}
	};

	if (categories === undefined) {
		return <LoadingState message="Loading categories..." />;
	}

	if (categories.length === 0) {
		return (
			<div>
				<PageHeader
					title="Knowledge Base"
					description="Store reference materials and documentation to inform your content creation process."
				/>
				<EmptyState
					title="No categories available"
					description="Create categories in your project before adding knowledge base items."
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
				title="Knowledge Base"
				description="Store reference materials and documentation to inform your content creation process."
			/>

			{/* Category Filter */}
			<div className="mb-6 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
				<div className="flex-1">
					<label htmlFor="category-select" className="block text-sm font-medium text-gray-700 mb-2">
						Select Category
					</label>
					<select
						id="category-select"
						value={selectedCategoryId || ""}
						onChange={(e) => setSelectedCategoryId(e.target.value as Id<"categories">)}
						className="w-full sm:w-auto px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500"
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
					Add Item
				</button>
			</div>

			{/* Items List */}
			{items === undefined ? (
				<LoadingState message="Loading knowledge base items..." />
			) : (
				<KnowledgeBaseList
					items={items}
					onEdit={handleEdit}
					onDelete={handleDelete}
				/>
			)}

			{/* Create/Edit Modal */}
			{isFormOpen && (
				<div className="fixed inset-0 z-50 overflow-y-auto" role="dialog" aria-modal="true">
					<div className="flex min-h-screen items-center justify-center p-4">
						<div
							className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
							onClick={() => setIsFormOpen(false)}
						/>
						<div className="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-2xl">
							<div className="bg-white px-4 pb-4 pt-5 sm:p-6">
								<h3 className="text-lg font-semibold text-gray-900 mb-4">
									{editingItem ? "Edit Knowledge Base Item" : "Add Knowledge Base Item"}
								</h3>
								<KnowledgeBaseItemForm
									item={editingItem}
									onSubmit={handleFormSubmit}
									onCancel={() => {
										setIsFormOpen(false);
										setEditingItem(null);
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
				isOpen={!!deletingItem}
				title="Delete Knowledge Base Item"
				message={`Are you sure you want to delete "${deletingItem?.title}"? This action cannot be undone.`}
				confirmLabel="Delete"
				onConfirm={handleDeleteConfirm}
				onCancel={() => setDeletingItem(null)}
				variant="danger"
			/>
		</div>
	);
}
