import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";

export interface ReviewStepProps {
	categoryId: Id<"categories">;
	personaId: Id<"personas"> | null;
	brandVoiceId: Id<"brandVoices"> | null;
	title: string;
	topic: string;
	draftContent: string;
	uploadedFileIds: Id<"files">[];
	onGenerate: () => void;
	onEdit: (step: 1 | 2 | 3 | 4 | 5 | 6) => void;
	onBack: () => void;
}

/**
 * Step 5: Review all selections before AI generation.
 * Displays summary of all choices with edit buttons to return to specific steps.
 */
export function ReviewStep({
	categoryId,
	personaId,
	brandVoiceId,
	title,
	topic,
	draftContent,
	uploadedFileIds,
	onGenerate,
	onEdit,
	onBack,
}: ReviewStepProps) {
	const category = useQuery(api.categories.getCategory, { categoryId });
	const persona = useQuery(
		api.personas.getPersona,
		personaId ? { personaId } : "skip"
	);
	const brandVoice = useQuery(
		api.brandVoices.getBrandVoice,
		brandVoiceId ? { brandVoiceId } : "skip"
	);

	const isLoading = category === undefined ||
		(personaId && persona === undefined) ||
		(brandVoiceId && brandVoice === undefined);

	if (isLoading) {
		return (
			<div className="text-center py-8">
				<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-600 mx-auto" />
				<p className="mt-2 text-slate-500">Loading...</p>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			<div>
				<h2 className="text-2xl font-bold text-slate-900">Review Your Selections</h2>
				<p className="mt-2 text-slate-600">
					Review all details before generating your AI draft. You can edit any section.
				</p>
			</div>

			<div className="space-y-4">
				{/* Category */}
				<div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
					<div className="flex justify-between items-start">
						<div className="flex-1">
							<h3 className="text-sm font-medium text-slate-500 mb-1">Content Category</h3>
							<p className="text-slate-900 font-medium">{category?.name || "Unknown"}</p>
							{category?.description && (
								<p className="text-sm text-slate-600 mt-1">{category.description}</p>
							)}
						</div>
						<button
							type="button"
							onClick={() => onEdit(1)}
							className="text-sm text-cyan-600 hover:text-cyan-700 font-medium"
						>
							Edit
						</button>
					</div>
				</div>

				{/* Persona */}
				<div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
					<div className="flex justify-between items-start">
						<div className="flex-1">
							<h3 className="text-sm font-medium text-slate-500 mb-1">Persona</h3>
							{persona ? (
								<>
									<p className="text-slate-900 font-medium">{persona.name}</p>
									{persona.description && (
										<p className="text-sm text-slate-600 mt-1">{persona.description}</p>
									)}
								</>
							) : (
								<p className="text-slate-500 italic">No persona selected</p>
							)}
						</div>
						<button
							type="button"
							onClick={() => onEdit(2)}
							className="text-sm text-cyan-600 hover:text-cyan-700 font-medium"
						>
							Edit
						</button>
					</div>
				</div>

				{/* Brand Voice */}
				<div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
					<div className="flex justify-between items-start">
						<div className="flex-1">
							<h3 className="text-sm font-medium text-slate-500 mb-1">Brand Voice</h3>
							{brandVoice ? (
								<>
									<p className="text-slate-900 font-medium">{brandVoice.name}</p>
									{brandVoice.description && (
										<p className="text-sm text-slate-600 mt-1">{brandVoice.description}</p>
									)}
								</>
							) : (
								<p className="text-slate-500 italic">No brand voice selected</p>
							)}
						</div>
						<button
							type="button"
							onClick={() => onEdit(3)}
							className="text-sm text-cyan-600 hover:text-cyan-700 font-medium"
						>
							Edit
						</button>
					</div>
				</div>

				{/* Content Details */}
				<div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
					<div className="flex justify-between items-start mb-3">
						<h3 className="text-sm font-medium text-slate-500">Content Details</h3>
						<button
							type="button"
							onClick={() => onEdit(4)}
							className="text-sm text-cyan-600 hover:text-cyan-700 font-medium"
						>
							Edit
						</button>
					</div>
					<div className="space-y-2">
						<div>
							<p className="text-xs text-slate-500">Title</p>
							<p className="text-slate-900 font-medium">{title}</p>
						</div>
						{topic && (
							<div>
								<p className="text-xs text-slate-500">Topic</p>
								<p className="text-sm text-slate-700">{topic}</p>
							</div>
						)}
						{draftContent && (
							<div>
								<p className="text-xs text-slate-500">Draft Content</p>
								<p className="text-sm text-slate-700 line-clamp-3">{draftContent}</p>
							</div>
						)}
						{uploadedFileIds.length > 0 && (
							<div>
								<p className="text-xs text-slate-500">Source Materials</p>
								<p className="text-sm text-slate-700">
									{uploadedFileIds.length} file{uploadedFileIds.length !== 1 ? "s" : ""} uploaded
								</p>
							</div>
						)}
					</div>
				</div>
			</div>

			<div className="bg-cyan-50 border border-cyan-200 rounded-lg p-4">
				<p className="text-sm text-cyan-900">
					Ready to generate? Click the button below to start AI content generation based on your selections.
				</p>
			</div>

			<div className="flex gap-3 justify-between pt-4 border-t">
				<button
					type="button"
					onClick={onBack}
					className="px-4 py-2 text-slate-700 hover:bg-slate-100 rounded-lg"
				>
					Back
				</button>
				<button
					type="button"
					onClick={onGenerate}
					className="px-6 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 font-medium"
				>
					Generate Draft
				</button>
			</div>
		</div>
	);
}
