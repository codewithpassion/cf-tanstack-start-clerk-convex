import { useState } from "react";
import { VALIDATION } from "@/types/entities";
import type { Id } from "../../../convex/_generated/dataModel";

export interface BrandVoiceStepData {
	name: string;
	description?: string;
}

export interface BrandVoiceStepProps {
	projectId: Id<"projects">;
	onNext: (data: BrandVoiceStepData) => void;
	onSkip: () => void;
}

/**
 * Second step of onboarding wizard: Add a brand voice (optional).
 * Users can skip this step if they prefer to add brand voices later.
 */
export function BrandVoiceStep({ onNext, onSkip }: BrandVoiceStepProps) {
	const [name, setName] = useState("");
	const [description, setDescription] = useState("");
	const [error, setError] = useState<string | null>(null);

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		setError(null);

		// Validate name
		const trimmedName = name.trim();
		if (!trimmedName) {
			setError("Brand voice name is required");
			return;
		}
		if (trimmedName.length > VALIDATION.brandVoice.nameMaxLength) {
			setError(`Brand voice name must be ${VALIDATION.brandVoice.nameMaxLength} characters or less`);
			return;
		}

		// Validate description
		const trimmedDescription = description.trim();
		if (trimmedDescription.length > VALIDATION.brandVoice.descriptionMaxLength) {
			setError(`Description must be ${VALIDATION.brandVoice.descriptionMaxLength} characters or less`);
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
				<h2 className="text-xl font-semibold text-gray-900 mb-2">
					Define Your Brand Voice
				</h2>
				<p className="text-sm text-gray-600">
					Set the tone and style for your content. This helps maintain consistency across all your posts.
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
					<label htmlFor="onboarding-brand-voice-name" className="block text-sm font-medium text-gray-700 mb-1">
						Brand Voice Name <span className="text-red-500">*</span>
					</label>
					<input
						type="text"
						id="onboarding-brand-voice-name"
						value={name}
						onChange={(e) => setName(e.target.value)}
						maxLength={VALIDATION.brandVoice.nameMaxLength}
						className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
						placeholder="e.g., Professional & Approachable, Technical Expert"
						autoFocus
					/>
					<p className="mt-1 text-xs text-gray-500">
						{name.length} / {VALIDATION.brandVoice.nameMaxLength}
					</p>
				</div>

				<div>
					<label htmlFor="onboarding-brand-voice-description" className="block text-sm font-medium text-gray-700 mb-1">
						Description (optional)
					</label>
					<textarea
						id="onboarding-brand-voice-description"
						value={description}
						onChange={(e) => setDescription(e.target.value)}
						maxLength={VALIDATION.brandVoice.descriptionMaxLength}
						rows={4}
						className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
						placeholder="Describe your brand's tone, style, and personality..."
					/>
					<p className="mt-1 text-xs text-gray-500">
						{description.length} / {VALIDATION.brandVoice.descriptionMaxLength}
					</p>
				</div>

				<div className="flex justify-between pt-4">
					<button
						type="button"
						onClick={onSkip}
						className="inline-flex items-center px-6 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500 transition-colors"
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
