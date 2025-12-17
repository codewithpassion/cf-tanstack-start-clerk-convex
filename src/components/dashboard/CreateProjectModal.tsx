import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useRouter } from "@tanstack/react-router";
import { VALIDATION } from "@/types/entities";

export interface CreateProjectModalProps {
	isOpen: boolean;
	onClose: () => void;
}

/**
 * Modal form for creating a new project.
 * Validates input and creates project with default categories.
 */
export function CreateProjectModal({ isOpen, onClose }: CreateProjectModalProps) {
	const router = useRouter();
	const createProject = useMutation(api.projects.createProject);

	const [name, setName] = useState("");
	const [description, setDescription] = useState("");
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setError(null);

		// Validate name
		const trimmedName = name.trim();
		if (!trimmedName) {
			setError("Project name is required");
			return;
		}
		if (trimmedName.length > VALIDATION.project.nameMaxLength) {
			setError(`Project name must be ${VALIDATION.project.nameMaxLength} characters or less`);
			return;
		}

		// Validate description
		const trimmedDescription = description.trim();
		if (trimmedDescription.length > VALIDATION.project.descriptionMaxLength) {
			setError(`Description must be ${VALIDATION.project.descriptionMaxLength} characters or less`);
			return;
		}

		setIsSubmitting(true);

		try {
			const result = await createProject({
				name: trimmedName,
				description: trimmedDescription || undefined,
			});

			// Navigate to the new project
			router.navigate({
				to: "/projects/$projectId",
				params: { projectId: result.projectId },
			});

			// Reset form
			setName("");
			setDescription("");
			onClose();
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to create project");
		} finally {
			setIsSubmitting(false);
		}
	};

	const handleClose = () => {
		if (!isSubmitting) {
			setName("");
			setDescription("");
			setError(null);
			onClose();
		}
	};

	if (!isOpen) {
		return null;
	}

	return (
		<div className="fixed inset-0 z-50 overflow-y-auto" role="dialog" aria-modal="true" aria-labelledby="create-project-title">
			<div className="flex min-h-screen items-center justify-center p-4 text-center sm:p-0">
				{/* Background overlay */}
				<div
					className="fixed inset-0 bg-slate-500 dark:bg-slate-900 bg-opacity-75 dark:bg-opacity-85 transition-opacity"
					aria-hidden="true"
					onClick={handleClose}
				/>

				{/* Modal panel */}
				<div className="relative transform overflow-hidden rounded-lg bg-white dark:bg-slate-900 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg">
					<form onSubmit={handleSubmit}>
						<div className="bg-white dark:bg-slate-900 px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
							<h3 className="text-lg font-semibold leading-6 text-slate-900 dark:text-white mb-4" id="create-project-title">
								Create New Project
							</h3>

							{error && (
								<div className="mb-4 bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded">
									{error}
								</div>
							)}

							<div className="space-y-4">
								<div>
									<label htmlFor="project-name" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
										Project Name <span className="text-red-500">*</span>
									</label>
									<input
										type="text"
										id="project-name"
										value={name}
										onChange={(e) => setName(e.target.value)}
										maxLength={VALIDATION.project.nameMaxLength}
										className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
										placeholder="e.g., Tech Blog, Marketing Campaign"
										required
										autoFocus
									/>
									<p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
										{name.length} / {VALIDATION.project.nameMaxLength}
									</p>
								</div>

								<div>
									<label htmlFor="project-description" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
										Description (optional)
									</label>
									<textarea
										id="project-description"
										value={description}
										onChange={(e) => setDescription(e.target.value)}
										maxLength={VALIDATION.project.descriptionMaxLength}
										rows={4}
										className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
										placeholder="Describe the purpose and goals of this project"
									/>
									<p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
										{description.length} / {VALIDATION.project.descriptionMaxLength}
									</p>
								</div>
							</div>
						</div>

						<div className="bg-slate-50 dark:bg-slate-800 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6 gap-3">
							<button
								type="submit"
								disabled={isSubmitting}
								className="inline-flex w-full justify-center rounded-md bg-cyan-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-cyan-700 sm:w-auto transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed"
							>
								{isSubmitting ? "Creating..." : "Create Project"}
							</button>
							<button
								type="button"
								onClick={handleClose}
								disabled={isSubmitting}
								className="mt-3 inline-flex w-full justify-center rounded-md bg-white dark:bg-slate-800 px-3 py-2 text-sm font-semibold text-slate-900 dark:text-white shadow-sm ring-1 ring-inset ring-slate-300 dark:ring-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 sm:mt-0 sm:w-auto transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
							>
								Cancel
							</button>
						</div>
					</form>
				</div>
			</div>
		</div>
	);
}
