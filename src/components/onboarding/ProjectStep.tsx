import { useState } from "react";
import { VALIDATION } from "@/types/entities";

export interface ProjectStepData {
	name: string;
	description?: string;
}

export interface ProjectStepProps {
	onNext: (data: ProjectStepData) => void;
	onSkip: undefined; // Project step cannot be skipped
}

/**
 * First step of onboarding wizard: Create your first project.
 * This step is required and cannot be skipped.
 */
export function ProjectStep({ onNext }: ProjectStepProps) {
	const [name, setName] = useState("");
	const [description, setDescription] = useState("");
	const [error, setError] = useState<string | null>(null);

	const handleSubmit = (e: React.FormEvent) => {
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
			setError(`Instructions must be ${VALIDATION.project.descriptionMaxLength} characters or less`);
			return;
		}

		onNext({
			name: trimmedName,
			description: trimmedDescription || undefined,
		});
	};

	return (
		<div>
			<div className="mb-6">
				<h2 className="text-xl font-semibold text-slate-900 mb-2">
					Create Your First Project
				</h2>
				<p className="text-sm text-slate-600">
					Projects help you organize content for different brands, campaigns, or purposes.
				</p>
			</div>

			{error && (
				<div className="mb-4 bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded">
					{error}
				</div>
			)}

			<form onSubmit={handleSubmit} className="space-y-4">
				<div>
					<label htmlFor="onboarding-project-name" className="block text-sm font-medium text-slate-700 mb-1">
						Project Name <span className="text-red-500">*</span>
					</label>
					<input
						type="text"
						id="onboarding-project-name"
						value={name}
						onChange={(e) => setName(e.target.value)}
						maxLength={VALIDATION.project.nameMaxLength}
						className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 text-slate-900 bg-white"
						placeholder="e.g., Tech Blog, Marketing Campaign"
						required
						autoFocus
					/>
					<p className="mt-1 text-xs text-slate-500">
						{name.length} / {VALIDATION.project.nameMaxLength}
					</p>
				</div>

				<div>
					<label htmlFor="onboarding-project-description" className="block text-sm font-medium text-slate-700 mb-1">
						Project Instructions (optional)
					</label>
					<p className="text-xs text-slate-500 mb-2">
						This information will be used when generating content for this project.
					</p>
					<textarea
						id="onboarding-project-description"
						value={description}
						onChange={(e) => setDescription(e.target.value)}
						maxLength={VALIDATION.project.descriptionMaxLength}
						rows={4}
						className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 text-slate-900 bg-white"
						placeholder="Enter instructions for content generation"
					/>
					<p className="mt-1 text-xs text-slate-500">
						{description.length} / {VALIDATION.project.descriptionMaxLength}
					</p>
				</div>

				<div className="flex justify-end pt-4">
					<button
						type="submit"
						className="inline-flex items-center px-6 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-cyan-600 hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500 transition-colors"
					>
						Continue
						<svg className="ml-2 w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<title>Next</title>
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
						</svg>
					</button>
				</div>
			</form>
		</div>
	);
}
