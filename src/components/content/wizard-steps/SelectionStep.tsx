import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/api";
import type { Id } from "@/convex/dataModel";
import { LoadingState } from "@/components/shared/LoadingState";
import { KnowledgeBaseSelector } from "./KnowledgeBaseSelector";

export interface SelectionStepProps {
	projectId: Id<"projects">;
	categoryId: Id<"categories"> | null;
	personaId: Id<"personas"> | null;
	brandVoiceId: Id<"brandVoices"> | null;
	useAllKnowledgeBase: boolean;
	selectedKnowledgeBaseIds: Id<"knowledgeBaseItems">[];
	onNext: (data: {
		categoryId: Id<"categories">;
		personaId: Id<"personas"> | null;
		brandVoiceId: Id<"brandVoices"> | null;
		useAllKnowledgeBase: boolean;
		selectedKnowledgeBaseIds: Id<"knowledgeBaseItems">[];
	}) => void;
}

/**
 * Selection Step: Collects all content generation selections in a single step.
 * Includes category (required), persona, brand voice, and knowledge base selection.
 * Part of the content creation wizard (Phase 3.2).
 */
export function SelectionStep({
	projectId,
	categoryId: initialCategoryId,
	personaId: initialPersonaId,
	brandVoiceId: initialBrandVoiceId,
	useAllKnowledgeBase: initialUseAllKnowledgeBase,
	selectedKnowledgeBaseIds: initialSelectedKnowledgeBaseIds,
	onNext,
}: SelectionStepProps) {
	// Local state for selections
	const [categoryId, setCategoryId] = useState<Id<"categories"> | null>(initialCategoryId);
	const [personaId, setPersonaId] = useState<Id<"personas"> | null>(initialPersonaId);
	const [brandVoiceId, setBrandVoiceId] = useState<Id<"brandVoices"> | null>(
		initialBrandVoiceId,
	);
	const [useAllKnowledgeBase, setUseAllKnowledgeBase] = useState(initialUseAllKnowledgeBase);
	const [selectedKnowledgeBaseIds, setSelectedKnowledgeBaseIds] = useState<
		Id<"knowledgeBaseItems">[]
	>(initialSelectedKnowledgeBaseIds);
	const [error, setError] = useState<string | null>(null);

	// Query categories, personas, and brand voices
	const categories = useQuery(api.categories.listCategories, { projectId });
	const personas = useQuery(api.personas.listPersonas, { projectId });
	const brandVoices = useQuery(api.brandVoices.listBrandVoices, { projectId });

	// Handle category change - reset KB selection when category changes
	const handleCategoryChange = (newCategoryId: string) => {
		const typedCategoryId = newCategoryId as Id<"categories">;
		setCategoryId(typedCategoryId);
		setError(null);

		// Reset KB selection when category changes
		setUseAllKnowledgeBase(true);
		setSelectedKnowledgeBaseIds([]);
	};

	// Handle persona change
	const handlePersonaChange = (newPersonaId: string) => {
		if (newPersonaId === "") {
			setPersonaId(null);
		} else {
			setPersonaId(newPersonaId as Id<"personas">);
		}
	};

	// Handle brand voice change
	const handleBrandVoiceChange = (newBrandVoiceId: string) => {
		if (newBrandVoiceId === "") {
			setBrandVoiceId(null);
		} else {
			setBrandVoiceId(newBrandVoiceId as Id<"brandVoices">);
		}
	};

	// Handle next button click
	const handleNext = () => {
		if (!categoryId) {
			setError("Please select a category to continue");
			return;
		}

		setError(null);
		onNext({
			categoryId,
			personaId,
			brandVoiceId,
			useAllKnowledgeBase,
			selectedKnowledgeBaseIds,
		});
	};

	// Show loading state while data is being fetched
	if (categories === undefined || personas === undefined || brandVoices === undefined) {
		return <LoadingState message="Loading options..." />;
	}

	return (
		<div className="space-y-6">
			{/* Category Selector (Required) */}
			<div>
				<label
					htmlFor="category-select"
					className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1"
				>
					Category <span className="text-red-500 dark:text-red-400">*</span>
				</label>
				<select
					id="category-select"
					value={categoryId || ""}
					onChange={(e) => handleCategoryChange(e.target.value)}
					className="w-full rounded-md border bg-white dark:bg-slate-950 text-slate-900 dark:text-white border-slate-300 dark:border-slate-700 px-3 py-2 focus:border-cyan-500 focus:ring-cyan-500"
					aria-required="true"
					aria-describedby="category-help"
				>
					<option value="">Select a category</option>
					{categories.map((category) => (
						<option key={category._id} value={category._id}>
							{category.name}
						</option>
					))}
				</select>
				<p id="category-help" className="mt-1 text-sm text-slate-500 dark:text-slate-400">
					Select the type of content you want to create
				</p>
			</div>

			{/* Persona Selector (Optional) */}
			<div>
				<label
					htmlFor="persona-select"
					className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1"
				>
					Persona
				</label>
				<select
					id="persona-select"
					value={personaId || ""}
					onChange={(e) => handlePersonaChange(e.target.value)}
					className="w-full rounded-md border bg-white dark:bg-slate-950 text-slate-900 dark:text-white border-slate-300 dark:border-slate-700 px-3 py-2 focus:border-cyan-500 focus:ring-cyan-500"
					aria-describedby="persona-help"
				>
					<option value="">No persona</option>
					{personas.map((persona) => (
						<option key={persona._id} value={persona._id}>
							{persona.name}
						</option>
					))}
				</select>
				<p id="persona-help" className="mt-1 text-sm text-slate-500 dark:text-slate-400">
					Optionally select a persona to guide the content style
				</p>
			</div>

			{/* Brand Voice Selector (Optional) */}
			<div>
				<label
					htmlFor="brand-voice-select"
					className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1"
				>
					Brand Voice
				</label>
				<select
					id="brand-voice-select"
					value={brandVoiceId || ""}
					onChange={(e) => handleBrandVoiceChange(e.target.value)}
					className="w-full rounded-md border bg-white dark:bg-slate-950 text-slate-900 dark:text-white border-slate-300 dark:border-slate-700 px-3 py-2 focus:border-cyan-500 focus:ring-cyan-500"
					aria-describedby="brand-voice-help"
				>
					<option value="">No brand voice</option>
					{brandVoices.map((brandVoice) => (
						<option key={brandVoice._id} value={brandVoice._id}>
							{brandVoice.name}
						</option>
					))}
				</select>
				<p id="brand-voice-help" className="mt-1 text-sm text-slate-500 dark:text-slate-400">
					Optionally select a brand voice to influence the tone
				</p>
			</div>

			{/* Knowledge Base Selector */}
			{categoryId && (
				<div>
					<label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
						Knowledge Base
					</label>
					<KnowledgeBaseSelector
						categoryId={categoryId}
						useAllKnowledgeBase={useAllKnowledgeBase}
						selectedKnowledgeBaseIds={selectedKnowledgeBaseIds}
						onToggleChange={setUseAllKnowledgeBase}
						onSelectionChange={setSelectedKnowledgeBaseIds}
					/>
					<p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
						Choose which knowledge base items to include in content generation
					</p>
				</div>
			)}

			{/* Error Message */}
			{error && (
				<div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-md p-3">
					<p className="text-sm text-red-600 dark:text-red-400" role="alert">
						{error}
					</p>
				</div>
			)}

			{/* Next Button */}
			<div className="flex justify-end pt-4 border-t border-slate-200 dark:border-slate-700">
				<button
					type="button"
					onClick={handleNext}
					className="px-6 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg font-medium transition-colors"
				>
					Next
				</button>
			</div>
		</div>
	);
}
