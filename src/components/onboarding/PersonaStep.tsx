import { useState } from "react";
import { VALIDATION } from "@/types/entities";
import type { Id } from "../../../convex/_generated/dataModel";

export interface PersonaStepData {
	name: string;
	description?: string;
}

export interface PersonaStepProps {
	projectId: Id<"projects">;
	onNext: (data: PersonaStepData) => void;
	onSkip: () => void;
}

/**
 * Third step of onboarding wizard: Add a target persona (optional).
 * Users can skip this step if they prefer to add personas later.
 */
export function PersonaStep({ onNext, onSkip }: PersonaStepProps) {
	const [name, setName] = useState("");
	const [description, setDescription] = useState("");
	const [error, setError] = useState<string | null>(null);

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		setError(null);

		// Validate name
		const trimmedName = name.trim();
		if (!trimmedName) {
			setError("Persona name is required");
			return;
		}
		if (trimmedName.length > VALIDATION.persona.nameMaxLength) {
			setError(`Persona name must be ${VALIDATION.persona.nameMaxLength} characters or less`);
			return;
		}

		// Validate description
		const trimmedDescription = description.trim();
		if (trimmedDescription.length > VALIDATION.persona.descriptionMaxLength) {
			setError(`Description must be ${VALIDATION.persona.descriptionMaxLength} characters or less`);
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
					Define Your Target Persona
				</h2>
				<p className="text-sm text-slate-600">
					Who are you writing for? Define your ideal reader or customer to create more targeted content.
					You can skip this step and add it later.
				</p>
			</div>

			{error && (
				<div className="mb-4 bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded">
					{error}
				</div>
			)}

			<form onSubmit={handleSubmit} className="space-y-4">
				<div>
					<label htmlFor="onboarding-persona-name" className="block text-sm font-medium text-slate-700 mb-1">
						Persona Name <span className="text-red-500">*</span>
					</label>
					<input
						type="text"
						id="onboarding-persona-name"
						value={name}
						onChange={(e) => setName(e.target.value)}
						maxLength={VALIDATION.persona.nameMaxLength}
						className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 text-slate-900 bg-white"
						placeholder="e.g., Tech-Savvy Marketing Manager, Early-Career Developer"
						autoFocus
					/>
					<p className="mt-1 text-xs text-slate-500">
						{name.length} / {VALIDATION.persona.nameMaxLength}
					</p>
				</div>

				<div>
					<label htmlFor="onboarding-persona-description" className="block text-sm font-medium text-slate-700 mb-1">
						Description (optional)
					</label>
					<textarea
						id="onboarding-persona-description"
						value={description}
						onChange={(e) => setDescription(e.target.value)}
						maxLength={VALIDATION.persona.descriptionMaxLength}
						rows={4}
						className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 text-slate-900 bg-white"
						placeholder="Describe their role, goals, challenges, and interests..."
					/>
					<p className="mt-1 text-xs text-slate-500">
						{description.length} / {VALIDATION.persona.descriptionMaxLength}
					</p>
				</div>

				<div className="flex justify-between pt-4">
					<button
						type="button"
						onClick={onSkip}
						className="inline-flex items-center px-6 py-2 border border-slate-300 text-sm font-medium rounded-md shadow-sm text-slate-700 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500 transition-colors"
					>
						Skip for Now
					</button>
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
