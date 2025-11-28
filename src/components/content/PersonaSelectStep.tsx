import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";

export interface PersonaSelectStepProps {
	projectId: Id<"projects">;
	selectedPersonaId: Id<"personas"> | null;
	onNext: (personaId: Id<"personas"> | null) => void;
	onSkip: () => void;
	onBack: () => void;
}

/**
 * Step 2: Optional persona selection for content creation.
 * Users can select a persona to influence the content style or skip this step.
 */
export function PersonaSelectStep({
	projectId,
	selectedPersonaId,
	onNext,
	onSkip,
	onBack,
}: PersonaSelectStepProps) {
	const personas = useQuery(api.personas.listPersonas, { projectId });
	const [selected, setSelected] = useState<Id<"personas"> | null>(selectedPersonaId);

	const handleNext = () => {
		onNext(selected);
	};

	const handleSkip = () => {
		onSkip();
	};

	if (personas === undefined) {
		return (
			<div className="text-center py-8">
				<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-600 mx-auto" />
				<p className="mt-2 text-gray-500">Loading personas...</p>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			<div>
				<h2 className="text-2xl font-bold text-gray-900">Select Persona (Optional)</h2>
				<p className="mt-2 text-gray-600">
					Choose a persona to guide the tone and style of your content, or skip to continue without one.
				</p>
			</div>

			{personas === null || personas.length === 0 ? (
				<div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
					<p className="text-gray-600 mb-2">No personas available for this project.</p>
					<p className="text-sm text-gray-500">
						You can create personas later in your project settings.
					</p>
				</div>
			) : (
				<div className="space-y-3">
					<label htmlFor="persona-select" className="block text-sm font-medium text-gray-700">
						Persona (Optional)
					</label>
					<select
						id="persona-select"
						value={selected || ""}
						onChange={(e) => setSelected(e.target.value ? (e.target.value as Id<"personas">) : null)}
						className="w-full rounded-lg border-gray-300 shadow-sm focus:border-cyan-500 focus:ring-cyan-500 text-gray-900 bg-white"
					>
						<option value="">-- No persona --</option>
						{personas.map((persona) => (
							<option key={persona._id} value={persona._id}>
								{persona.name}
								{persona.description ? ` - ${persona.description.substring(0, 50)}...` : ""}
							</option>
						))}
					</select>
				</div>
			)}

			{selected && personas && (
				<div className="bg-cyan-50 border border-cyan-200 rounded-lg p-4">
					<h3 className="font-medium text-cyan-900 mb-1">Selected Persona</h3>
					<p className="text-sm text-cyan-700">
						{personas.find((p) => p._id === selected)?.name}
					</p>
					{personas.find((p) => p._id === selected)?.description && (
						<p className="text-sm text-cyan-600 mt-1">
							{personas.find((p) => p._id === selected)?.description}
						</p>
					)}
				</div>
			)}

			<div className="flex gap-3 justify-between pt-4 border-t">
				<button
					type="button"
					onClick={onBack}
					className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
				>
					Back
				</button>
				<div className="flex gap-3">
					<button
						type="button"
						onClick={handleSkip}
						className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
					>
						Skip
					</button>
					<button
						type="button"
						onClick={handleNext}
						className="px-6 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700"
					>
						Next
					</button>
				</div>
			</div>
		</div>
	);
}
