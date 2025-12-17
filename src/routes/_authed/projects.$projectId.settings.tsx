import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/api";
import type { Id, Doc } from "@/convex/dataModel";
import { PageHeader } from "@/components/shared/PageHeader";
import { LoadingState } from "@/components/shared/LoadingState";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { CategoryList } from "@/components/categories/CategoryList";
import { CategoryForm } from "@/components/categories/CategoryForm";
import { EmptyState } from "@/components/shared/EmptyState";
import { Modal } from "@/components/shared/Modal";
import { useState } from "react";
import { Save, Trash2, AlertTriangle } from "lucide-react";

export const Route = createFileRoute("/_authed/projects/$projectId/settings")({
	component: SettingsPage,
});

function SettingsPage() {
	const { projectId } = Route.useParams();
	const navigate = useNavigate();
	const project = useQuery(api.projects.getProject, {
		projectId: projectId as Id<"projects">,
	});
	const updateProject = useMutation(api.projects.updateProject);
	const deleteProject = useMutation(api.projects.deleteProject);
	const categories = useQuery(api.categories.listCategories, {
		projectId: projectId as Id<"projects">,
	});
	const createCategory = useMutation(api.categories.createCategory);
	const updateCategory = useMutation(api.categories.updateCategory);
	const deleteCategory = useMutation(api.categories.deleteCategory);
	const reorderCategories = useMutation(api.categories.reorderCategories);

	const [isSaving, setIsSaving] = useState(false);
	const [isDeleting, setIsDeleting] = useState(false);
	const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
	const [isCreatingCategory, setIsCreatingCategory] = useState(false);
	const [editingCategory, setEditingCategory] = useState<Doc<"categories"> | null>(null);
	const [showCategoryDeleteConfirm, setShowCategoryDeleteConfirm] = useState(false);
	const [categoryToDelete, setCategoryToDelete] = useState<Doc<"categories"> | null>(null);
	const [isSavingCategory, setIsSavingCategory] = useState(false);
	const [formData, setFormData] = useState({
		name: "",
		description: "",
	});
	const [formErrors, setFormErrors] = useState<{
		name?: string;
		description?: string;
	}>({});
	const [isDirty, setIsDirty] = useState(false);

	// Initialize form data when project loads
	if (project && !isDirty && formData.name === "") {
		setFormData({
			name: project.name,
			description: project.description || "",
		});
	}

	if (project === undefined) {
		return <LoadingState message="Loading settings..." />;
	}

	if (project === null) {
		return (
			<div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
				<h2 className="text-xl font-semibold text-red-900 dark:text-red-200 mb-2">Project not found</h2>
				<p className="text-red-700 dark:text-red-300">
					The project you're looking for doesn't exist or you don't have access to it.
				</p>
			</div>
		);
	}

	const validateForm = (): boolean => {
		const errors: { name?: string; description?: string } = {};

		const trimmedName = formData.name.trim();
		if (!trimmedName) {
			errors.name = "Project name is required";
		} else if (trimmedName.length > 100) {
			errors.name = "Project name must be 100 characters or less";
		}

		if (formData.description && formData.description.length > 2000) {
			errors.description = "Instructions must be 2000 characters or less";
		}

		setFormErrors(errors);
		return Object.keys(errors).length === 0;
	};

	const handleSave = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!validateForm()) {
			return;
		}

		setIsSaving(true);
		try {
			await updateProject({
				projectId: projectId as Id<"projects">,
				name: formData.name.trim(),
				description: formData.description.trim() || undefined,
			});
			setIsDirty(false);
		} catch (error) {
			console.error("Failed to update project:", error);
			setFormErrors({
				name: "Failed to update project. Please try again.",
			});
		} finally {
			setIsSaving(false);
		}
	};

	const handleDelete = async () => {
		setIsDeleting(true);
		try {
			await deleteProject({ projectId: projectId as Id<"projects"> });
			// Navigate to dashboard after successful deletion
			navigate({ to: "/dashboard" });
		} catch (error) {
			console.error("Failed to delete project:", error);
			setShowDeleteConfirm(false);
		} finally {
			setIsDeleting(false);
		}
	};

	const handleChange = (field: string, value: string) => {
		setFormData(prev => ({ ...prev, [field]: value }));
		setIsDirty(true);
		// Clear error when user types
		if (formErrors[field as keyof typeof formErrors]) {
			setFormErrors(prev => ({ ...prev, [field]: undefined }));
		}
	};

	const handleCategorySubmit = async (data: { name: string; description: string; formatGuidelines: string }) => {
		setIsSavingCategory(true);
		try {
			if (editingCategory) {
				await updateCategory({
					categoryId: editingCategory._id,
					name: data.name,
					description: data.description || undefined,
					formatGuidelines: data.formatGuidelines || undefined,
				});
			} else {
				await createCategory({
					projectId: projectId as Id<"projects">,
					name: data.name,
					description: data.description || undefined,
					formatGuidelines: data.formatGuidelines || undefined,
				});
			}
			setIsCreatingCategory(false);
			setEditingCategory(null);
		} catch (error) {
			console.error("Failed to save category:", error);
		} finally {
			setIsSavingCategory(false);
		}
	};

	return (
		<div className="max-w-4xl">
			<PageHeader
				title="Project Settings"
				description="Manage your project details and settings."
			/>

			<div className="space-y-8">
				{/* General Settings Section */}
				<section className="bg-white dark:bg-slate-900 shadow-sm rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
					<div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
						<h3 className="text-lg font-medium text-slate-900 dark:text-white">General Information</h3>
						<p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
							Update your project's name and description.
						</p>
					</div>

					<div className="p-6">
						<form onSubmit={handleSave} className="space-y-6">
							<div>
								<label htmlFor="project-name" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
									Project Name <span className="text-red-500">*</span>
								</label>
								<input
									type="text"
									id="project-name"
									value={formData.name}
									onChange={(e) => handleChange("name", e.target.value)}
									className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm bg-white dark:bg-slate-950 px-3 py-2 border ${formErrors.name
											? "border-red-300 focus:border-red-500 focus:ring-red-500"
											: "border-slate-300 dark:border-slate-700 focus:border-cyan-500 focus:ring-cyan-500"
										} text-slate-900 dark:text-white placeholder-slate-400`}
									placeholder="Enter project name"
									maxLength={100}
									disabled={isSaving}
								/>
								{formErrors.name && (
									<p className="mt-1 text-sm text-red-600 dark:text-red-400">{formErrors.name}</p>
								)}
							</div>

							<div>
								<label htmlFor="project-description" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
									Project Instructions
								</label>
								<p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
									This information will be used when generating content for this project.
								</p>
								<textarea
									id="project-description"
									value={formData.description}
									onChange={(e) => handleChange("description", e.target.value)}
									rows={4}
									className={`mt-2 block w-full rounded-md shadow-sm sm:text-sm bg-white dark:bg-slate-950 px-3 py-2 border ${formErrors.description
											? "border-red-300 focus:border-red-500 focus:ring-red-500"
											: "border-slate-300 dark:border-slate-700 focus:border-cyan-500 focus:ring-cyan-500"
										} text-slate-900 dark:text-white placeholder-slate-400`}
									placeholder="Enter instructions for content generation (optional)"
									maxLength={2000}
									disabled={isSaving}
								/>
								{formErrors.description && (
									<p className="mt-1 text-sm text-red-600 dark:text-red-400">{formErrors.description}</p>
								)}
								<p className="mt-1 text-xs text-slate-500 dark:text-slate-400 text-right">
									{formData.description.length}/2000
								</p>
							</div>

							<div className="flex items-center justify-end pt-4 border-t border-slate-100 dark:border-slate-800">
								<button
									type="submit"
									disabled={isSaving || !isDirty}
									className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-cyan-600 hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
								>
									{isSaving ? (
										<>
											<svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
												<circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
												<path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
											</svg>
											Saving...
										</>
									) : (
										<>
											<Save className="w-4 h-4 mr-2" />
											Save Changes
										</>
									)}
								</button>
							</div>
						</form>
					</div>
				</section>

				{/* Categories Section */}
				<section className="bg-white dark:bg-slate-900 shadow-sm rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
					<div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
						<div className="flex items-center justify-between">
							<div>
								<h3 className="text-lg font-medium text-slate-900 dark:text-white">Content Categories</h3>
								<p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
									Organize your content with custom categories. Drag to reorder.
								</p>
							</div>
							<button
								type="button"
								onClick={() => setIsCreatingCategory(true)}
								className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-cyan-600 hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500 transition-colors"
							>
								Add Category
							</button>
						</div>
					</div>

					<div className="p-6">
						{categories === undefined ? (
							<LoadingState message="Loading categories..." />
						) : categories.length === 0 ? (
							<EmptyState
								title="No categories yet"
								description="Create your first category to start organizing content."
								actionLabel="Add Category"
								onAction={() => setIsCreatingCategory(true)}
							/>
						) : (
							<CategoryList
								categories={categories}
								onEdit={setEditingCategory}
								onDelete={(category) => {
									setCategoryToDelete(category);
									setShowCategoryDeleteConfirm(true);
								}}
								onReorder={async (orderedIds) => {
									await reorderCategories({
										projectId: projectId as Id<"projects">,
										categoryIds: orderedIds as Id<"categories">[],
									});
								}}
							/>
						)}
					</div>
				</section>

				{/* Danger Zone Section */}
				<section className="bg-white dark:bg-slate-900 shadow-sm rounded-xl border border-red-200 dark:border-red-900/30 overflow-hidden">
					<div className="px-6 py-4 border-b border-red-200 dark:border-red-900/30 bg-red-50 dark:bg-red-900/10">
						<h3 className="text-lg font-medium text-red-900 dark:text-red-200 flex items-center gap-2">
							<AlertTriangle className="w-5 h-5" />
							Danger Zone
						</h3>
					</div>

					<div className="p-6">
						<div className="flex items-start justify-between">
							<div className="max-w-xl">
								<h4 className="text-sm font-medium text-slate-900 dark:text-white">Delete Project</h4>
								<p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
									Once you delete a project, there is no going back. This will permanently delete the project and all its associated content, including categories, personas, and brand voices.
								</p>
							</div>
							<button
								type="button"
								onClick={() => setShowDeleteConfirm(true)}
								disabled={isDeleting}
								className="ml-6 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
							>
								<Trash2 className="w-4 h-4 mr-2" />
								Delete Project
							</button>
						</div>
					</div>
				</section>
			</div>

			<ConfirmDialog
				isOpen={showDeleteConfirm}
				title="Delete Project"
				message={
					<div className="space-y-2">
						<p className="text-sm text-slate-500 dark:text-slate-400">
							Are you sure you want to delete <strong>{project.name}</strong>?
						</p>
						<p className="text-sm text-slate-500 dark:text-slate-400">
							This action will permanently delete the project and all its associated content. This cannot be undone.
						</p>
					</div>
				}
				confirmLabel="Delete Project"
				cancelLabel="Cancel"
				variant="danger"
				onConfirm={handleDelete}
				onCancel={() => setShowDeleteConfirm(false)}
				isLoading={isDeleting}
			/>

			{/* Category Create/Edit Modal */}
			{(isCreatingCategory || editingCategory) && (
				<Modal
					isOpen={true}
					onClose={() => {
						setIsCreatingCategory(false);
						setEditingCategory(null);
					}}
					title={editingCategory ? "Edit Category" : "Create Category"}
					size="2xl"
				>
					<CategoryForm
						projectId={projectId}
						category={editingCategory ?? undefined}
						onSubmit={handleCategorySubmit}
						onCancel={() => {
							setIsCreatingCategory(false);
							setEditingCategory(null);
						}}
						isLoading={isSavingCategory}
					/>
				</Modal>
			)}

			{/* Category Delete Confirmation */}
			<ConfirmDialog
				isOpen={showCategoryDeleteConfirm}
				title="Delete Category"
				message="Are you sure you want to delete this category? This will also delete all associated content, knowledge base items, and examples."
				variant="danger"
				confirmLabel="Delete Category"
				cancelLabel="Cancel"
				onConfirm={async () => {
					if (categoryToDelete) {
						await deleteCategory({ categoryId: categoryToDelete._id });
						setShowCategoryDeleteConfirm(false);
						setCategoryToDelete(null);
					}
				}}
				onCancel={() => {
					setShowCategoryDeleteConfirm(false);
					setCategoryToDelete(null);
				}}
			/>
		</div>
	);
}
