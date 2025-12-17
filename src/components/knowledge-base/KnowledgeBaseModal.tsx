import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/api";
import type { Id, Doc } from "@/convex/dataModel";
import { Modal } from "@/components/shared/Modal";
import { KnowledgeBaseList } from "./KnowledgeBaseList";
import { KnowledgeBaseItemForm } from "./KnowledgeBaseItemForm";
import { LoadingState } from "../shared/LoadingState";

export interface KnowledgeBaseModalProps {
	isOpen: boolean;
	onClose: () => void;
	projectId: string;
}

const STORAGE_KEY = "kb-last-category";

export function KnowledgeBaseModal({ isOpen, onClose, projectId }: KnowledgeBaseModalProps) {
	const [selectedCategoryId, setSelectedCategoryId] = useState<Id<"categories"> | null>(null);
	const [isCreating, setIsCreating] = useState(false);
	const [editingItem, setEditingItem] = useState<Doc<"knowledgeBaseItems"> | null>(null);
	const [isSubmitting, setIsSubmitting] = useState(false);

	const categories = useQuery(api.categories.listCategories, {
		projectId: projectId as Id<"projects">,
	});

	const items = useQuery(
		api.knowledgeBase.listKnowledgeBaseItems,
		selectedCategoryId ? { categoryId: selectedCategoryId } : "skip"
	);

	const createItem = useMutation(api.knowledgeBase.createKnowledgeBaseItem);
	const updateItem = useMutation(api.knowledgeBase.updateKnowledgeBaseItem);
	const deleteItem = useMutation(api.knowledgeBase.deleteKnowledgeBaseItem);

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
			setIsCreating(false);
			setEditingItem(null);
		} catch (error) {
			console.error("Failed to save knowledge base item:", error);
		} finally {
			setIsSubmitting(false);
		}
	};

	const handleDelete = async (item: Doc<"knowledgeBaseItems">) => {
		if (confirm("Are you sure you want to delete this knowledge base item?")) {
			await deleteItem({ itemId: item._id });
		}
	};

	// Show form if creating or editing
	if (isCreating || editingItem) {
		return (
			<Modal
				isOpen={isOpen}
				onClose={onClose}
				title={editingItem ? "Edit Knowledge Base Item" : "Add Knowledge Base Item"}
				size="2xl"
			>
				<KnowledgeBaseItemForm
					projectId={projectId}
					item={editingItem ?? undefined}
					onSubmit={handleFormSubmit}
					onCancel={() => {
						setIsCreating(false);
						setEditingItem(null);
					}}
					isSubmitting={isSubmitting}
				/>
			</Modal>
		);
	}

	// Show list view with category selector
	return (
		<Modal isOpen={isOpen} onClose={onClose} title="Knowledge Base" size="3xl">
			<div className="space-y-4">
				{/* Category Selector */}
				<div className="flex gap-4 items-center justify-between">
					<div className="flex items-center gap-3 flex-1">
						<label htmlFor="kb-category-select" className="text-sm font-medium text-slate-700 dark:text-slate-300 whitespace-nowrap">
							Category:
						</label>
						<select
							id="kb-category-select"
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
							Add Item
						</button>
					)}
				</div>

				{/* List or Empty State */}
				{categories === undefined ? (
					<LoadingState message="Loading categories..." />
				) : !selectedCategoryId ? (
					<p className="text-sm text-slate-500 dark:text-slate-400 text-center py-8">
						Please select a category to view knowledge base items.
					</p>
				) : items === undefined ? (
					<LoadingState message="Loading knowledge base items..." />
				) : (
					<KnowledgeBaseList
						items={items ?? []}
						onEdit={setEditingItem}
						onDelete={handleDelete}
					/>
				)}
			</div>
		</Modal>
	);
}
