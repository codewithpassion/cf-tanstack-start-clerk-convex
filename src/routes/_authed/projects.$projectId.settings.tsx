import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/api";
import type { Id } from "@/convex/dataModel";
import { PageHeader } from "@/components/shared/PageHeader";
import { LoadingState } from "@/components/shared/LoadingState";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { useState } from "react";

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

	const [isEditing, setIsEditing] = useState(false);
	const [isSaving, setIsSaving] = useState(false);
	const [isDeleting, setIsDeleting] = useState(false);
	const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
	const [formData, setFormData] = useState({
		name: "",
		description: "",
	});
	const [formErrors, setFormErrors] = useState<{
		name?: string;
		description?: string;
	}>({});

	// Initialize form data when project loads
	if (project && !isEditing && formData.name === "") {
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
			<div className="bg-red-50 border border-red-200 rounded-lg p-6">
				<h2 className="text-xl font-semibold text-red-900 mb-2">Project not found</h2>
				<p className="text-red-700">
					The project you're looking for doesn't exist or you don't have access to it.
				</p>
			</div>
		);
	}

	const formatDate = (timestamp: number) => {
		return new Date(timestamp).toLocaleDateString("en-US", {
			year: "numeric",
			month: "long",
			day: "numeric",
			hour: "2-digit",
			minute: "2-digit",
		});
	};

	const validateForm = (): boolean => {
		const errors: { name?: string; description?: string } = {};

		const trimmedName = formData.name.trim();
		if (!trimmedName) {
			errors.name = "Project name is required";
		} else if (trimmedName.length > 100) {
			errors.name = "Project name must be 100 characters or less";
		}

		if (formData.description && formData.description.length > 2000) {
			errors.description = "Description must be 2000 characters or less";
		}

		setFormErrors(errors);
		return Object.keys(errors).length === 0;
	};

	const handleEdit = () => {
		setIsEditing(true);
		setFormData({
			name: project.name,
			description: project.description || "",
		});
		setFormErrors({});
	};

	const handleCancel = () => {
		setIsEditing(false);
		setFormData({
			name: project.name,
			description: project.description || "",
		});
		setFormErrors({});
	};

	const handleSave = async () => {
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
			setIsEditing(false);
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

	return (
		<div>
			<PageHeader
				title="Project Settings"
				description="Manage your project details and settings."
			/>

			<div className="bg-white shadow-md rounded-lg p-6 space-y-6">
				<div>
					<div className="flex items-center justify-between mb-4">
						<h3 className="text-lg font-semibold text-slate-900">Project Information</h3>
						{!isEditing && (
							<button
								type="button"
								onClick={handleEdit}
								className="inline-flex items-center px-3 py-2 border border-slate-300 shadow-sm text-sm leading-4 font-medium rounded-md text-slate-700 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500 transition-colors"
							>
								<svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
									<title>Edit</title>
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
								</svg>
								Edit Project
							</button>
						)}
					</div>

					{isEditing ? (
						<form className="space-y-4" onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
							<div>
								<label htmlFor="project-name" className="block text-sm font-medium text-slate-700">
									Project Name <span className="text-red-500">*</span>
								</label>
								<input
									type="text"
									id="project-name"
									value={formData.name}
									onChange={(e) => setFormData({ ...formData, name: e.target.value })}
									className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm ${formErrors.name
											? "border-red-300 focus:border-red-500 focus:ring-red-500"
											: "border-slate-300 focus:border-cyan-500 focus:ring-cyan-500"
										}`}
									placeholder="Enter project name"
									maxLength={100}
									disabled={isSaving}
								/>
								{formErrors.name && (
									<p className="mt-1 text-sm text-red-600">{formErrors.name}</p>
								)}
								<p className="mt-1 text-xs text-slate-500">{formData.name.length}/100 characters</p>
							</div>

							<div>
								<label htmlFor="project-description" className="block text-sm font-medium text-slate-700">
									Description
								</label>
								<textarea
									id="project-description"
									value={formData.description}
									onChange={(e) => setFormData({ ...formData, description: e.target.value })}
									rows={4}
									className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm ${formErrors.description
											? "border-red-300 focus:border-red-500 focus:ring-red-500"
											: "border-slate-300 focus:border-cyan-500 focus:ring-cyan-500"
										}`}
									placeholder="Enter project description (optional)"
									maxLength={2000}
									disabled={isSaving}
								/>
								{formErrors.description && (
									<p className="mt-1 text-sm text-red-600">{formErrors.description}</p>
								)}
								<p className="mt-1 text-xs text-slate-500">{formData.description.length}/2000 characters</p>
							</div>

							<div className="flex items-center gap-3 pt-4">
								<button
									type="submit"
									disabled={isSaving}
									className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-cyan-600 hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
								>
									{isSaving ? "Saving..." : "Save Changes"}
								</button>
								<button
									type="button"
									onClick={handleCancel}
									disabled={isSaving}
									className="inline-flex items-center px-4 py-2 border border-slate-300 text-sm font-medium rounded-md text-slate-700 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
								>
									Cancel
								</button>
							</div>
						</form>
					) : (
						<dl className="space-y-4">
							<div>
								<dt className="text-sm font-medium text-slate-500">Project Name</dt>
								<dd className="mt-1 text-sm text-slate-900">{project.name}</dd>
							</div>
							{project.description && (
								<div>
									<dt className="text-sm font-medium text-slate-500">Description</dt>
									<dd className="mt-1 text-sm text-slate-900">{project.description}</dd>
								</div>
							)}
							<div>
								<dt className="text-sm font-medium text-slate-500">Created</dt>
								<dd className="mt-1 text-sm text-slate-900">{formatDate(project.createdAt)}</dd>
							</div>
							<div>
								<dt className="text-sm font-medium text-slate-500">Last Updated</dt>
								<dd className="mt-1 text-sm text-slate-900">{formatDate(project.updatedAt)}</dd>
							</div>
						</dl>
					)}
				</div>

				<div className="pt-6 border-t border-slate-200">
					<h3 className="text-lg font-semibold text-slate-900 mb-4">Danger Zone</h3>
					<div className="bg-red-50 border border-red-200 rounded-lg p-4">
						<div className="flex items-start justify-between">
							<div className="flex-1">
								<h4 className="text-sm font-medium text-red-900 mb-1">Delete this project</h4>
								<p className="text-sm text-red-700">
									Once you delete a project, there is no going back. This will archive the project and all its content.
								</p>
							</div>
							<button
								type="button"
								onClick={() => setShowDeleteConfirm(true)}
								disabled={isEditing || isDeleting}
								className="ml-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
							>
								Delete Project
							</button>
						</div>
					</div>
				</div>
			</div>

			<ConfirmDialog
				isOpen={showDeleteConfirm}
				title="Delete Project"
				message={
					<div className="space-y-2">
						<p className="text-sm text-slate-500">
							Are you sure you want to delete <strong>{project.name}</strong>?
						</p>
						<p className="text-sm text-slate-500">
							This action will archive the project and all its associated content. This cannot be undone.
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
		</div>
	);
}
