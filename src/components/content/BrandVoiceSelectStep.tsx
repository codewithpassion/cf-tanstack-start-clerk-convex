import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";

export interface BrandVoiceSelectStepProps {
	projectId: Id<"projects">;
	selectedBrandVoiceId: Id<"brandVoices"> | null;
	onNext: (brandVoiceId: Id<"brandVoices"> | null) => void;
	onSkip: () => void;
	onBack: () => void;
}

/**
 * Step 3: Optional brand voice selection for content creation.
 * Users can select a brand voice to influence the content tone or skip this step.
 */
export function BrandVoiceSelectStep({
	projectId,
	selectedBrandVoiceId,
	onNext,
	onSkip,
	onBack,
}: BrandVoiceSelectStepProps) {
	const brandVoices = useQuery(api.brandVoices.listBrandVoices, { projectId });
	const [selected, setSelected] = useState<Id<"brandVoices"> | null>(selectedBrandVoiceId);

	const handleNext = () => {
		onNext(selected);
	};

	const handleSkip = () => {
		onSkip();
	};

	if (brandVoices === undefined) {
		return (
			<div className="text-center py-8">
				<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-600 mx-auto" />
				<p className="mt-2 text-gray-500">Loading brand voices...</p>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			<div>
				<h2 className="text-2xl font-bold text-gray-900">Select Brand Voice (Optional)</h2>
				<p className="mt-2 text-gray-600">
					Choose a brand voice to set the tone and style of your content, or skip to continue without one.
				</p>
			</div>

			{brandVoices === null || brandVoices.length === 0 ? (
				<div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
					<p className="text-gray-600 mb-2">No brand voices available for this project.</p>
					<p className="text-sm text-gray-500">
						You can create brand voices later in your project settings.
					</p>
				</div>
			) : (
				<div className="space-y-3">
					<label htmlFor="brandVoice-select" className="block text-sm font-medium text-gray-700">
						Brand Voice (Optional)
					</label>
					<select
						id="brandVoice-select"
						value={selected || ""}
						onChange={(e) =>
							setSelected(e.target.value ? (e.target.value as Id<"brandVoices">) : null)
						}
						className="w-full rounded-lg border-gray-300 shadow-sm focus:border-cyan-500 focus:ring-cyan-500 text-gray-900 bg-white"
					>
						<option value="">-- No brand voice --</option>
						{brandVoices.map((voice) => (
							<option key={voice._id} value={voice._id}>
								{voice.name}
								{voice.description ? ` - ${voice.description.substring(0, 50)}...` : ""}
							</option>
						))}
					</select>
				</div>
			)}

			{selected && brandVoices && (
				<div className="bg-cyan-50 border border-cyan-200 rounded-lg p-4">
					<h3 className="font-medium text-cyan-900 mb-1">Selected Brand Voice</h3>
					<p className="text-sm text-cyan-700">
						{brandVoices.find((v) => v._id === selected)?.name}
					</p>
					{brandVoices.find((v) => v._id === selected)?.description && (
						<p className="text-sm text-cyan-600 mt-1">
							{brandVoices.find((v) => v._id === selected)?.description}
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
