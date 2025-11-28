/**
 * Image Prompt Wizard Component
 *
 * Multi-step wizard for generating AI image prompts.
 * Guides users through image type, subject, style, mood, composition, and colors.
 * Allows prompt editing and saving as templates.
 */

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { generateImagePrompt } from "@/server/ai";

export interface ImagePromptWizardProps {
	isOpen: boolean;
	projectId?: Id<"projects">;
	onGenerate: (prompt: string, templateName?: string) => void;
	onClose: () => void;
}

type ImageType = "infographic" | "illustration" | "photo" | "diagram";
type Step = 1 | 2 | 3 | 4 | 5 | 6;

interface WizardState {
	currentStep: Step;
	imageType: ImageType | null;
	subject: string;
	style: string;
	mood: string;
	composition: string;
	colors: string;
	generatedPrompt: string;
	saveAsTemplate: boolean;
	templateName: string;
}

/**
 * Wizard for creating detailed image generation prompts
 */
export function ImagePromptWizard({
	isOpen,
	projectId,
	onGenerate,
	onClose,
}: ImagePromptWizardProps) {
	const createTemplate = useMutation(api.imagePromptTemplates.createImagePromptTemplate);

	const [state, setState] = useState<WizardState>({
		currentStep: 1,
		imageType: null,
		subject: "",
		style: "",
		mood: "",
		composition: "",
		colors: "",
		generatedPrompt: "",
		saveAsTemplate: false,
		templateName: "",
	});

	const [isGenerating, setIsGenerating] = useState(false);
	const [error, setError] = useState<string | null>(null);

	// Navigation handlers
	const goToNextStep = () => {
		if (state.currentStep < 6) {
			setState({ ...state, currentStep: (state.currentStep + 1) as Step });
		}
	};

	const goToPreviousStep = () => {
		if (state.currentStep > 1) {
			setState({ ...state, currentStep: (state.currentStep - 1) as Step });
		}
	};

	const skipToGeneration = () => {
		setState({ ...state, currentStep: 6 });
	};

	// Step handlers
	const handleImageTypeSelect = (imageType: ImageType) => {
		setState({ ...state, imageType });
		goToNextStep();
	};

	const handleSubjectNext = () => {
		if (state.subject.trim()) {
			goToNextStep();
		}
	};

	// Generate prompt from wizard inputs
	const handleGeneratePrompt = async () => {
		if (!state.imageType || !state.subject.trim()) {
			setError("Image type and subject are required");
			return;
		}

		setError(null);
		setIsGenerating(true);

		try {
			const result = await generateImagePrompt({
				data: {
					imageType: state.imageType,
					subject: state.subject,
					style: state.style || undefined,
					mood: state.mood || undefined,
					composition: state.composition || undefined,
					colors: state.colors || undefined,
				},
			});

			setState({
				...state,
				generatedPrompt: result.prompt,
			});
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to generate prompt");
			console.error("Prompt generation error:", err);
		} finally {
			setIsGenerating(false);
		}
	};

	// Final generation
	const handleFinalGenerate = async () => {
		if (!state.generatedPrompt.trim()) {
			setError("Please generate or enter a prompt first");
			return;
		}

		setError(null);

		try {
			// Save as template if requested
			if (state.saveAsTemplate && projectId && state.templateName.trim()) {
				await createTemplate({
					projectId,
					name: state.templateName,
					imageType: state.imageType!,
					promptTemplate: state.generatedPrompt,
				});
			}

			// Pass prompt to parent for image generation
			onGenerate(
				state.generatedPrompt,
				state.saveAsTemplate ? state.templateName : undefined
			);

			// Reset wizard
			setState({
				currentStep: 1,
				imageType: null,
				subject: "",
				style: "",
				mood: "",
				composition: "",
				colors: "",
				generatedPrompt: "",
				saveAsTemplate: false,
				templateName: "",
			});
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to save template");
			console.error("Template save error:", err);
		}
	};

	if (!isOpen) {
		return null;
	}

	return (
		<div className="fixed inset-0 z-50 overflow-y-auto" role="dialog" aria-modal="true">
			<div className="flex min-h-screen items-center justify-center p-4">
				{/* Background overlay */}
				<div
					className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
					onClick={onClose}
				/>

				{/* Modal panel */}
				<div className="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-2xl">
					<div className="bg-white px-4 pb-4 pt-5 sm:p-6">
						{/* Header */}
						<div className="mb-6 flex items-center justify-between">
							<h3 className="text-lg font-medium text-gray-900">
								Create Image Prompt
							</h3>
							<button
								type="button"
								onClick={onClose}
								className="text-gray-400 hover:text-gray-500"
								aria-label="Close wizard"
							>
								<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={2}
										d="M6 18L18 6M6 6l12 12"
									/>
								</svg>
							</button>
						</div>

						{/* Step indicators */}
						<div className="mb-8">
							<nav aria-label="Progress">
								<ol className="flex items-center justify-center">
									{[1, 2, 3, 4, 5, 6].map((step, index) => (
										<li key={step} className={`relative ${index !== 5 ? "pr-4 sm:pr-12" : ""}`}>
											{/* Connector line */}
											{index !== 5 && (
												<div className="absolute inset-0 flex items-center" aria-hidden="true">
													<div
														className={`h-0.5 w-full ${state.currentStep > step ? "bg-cyan-600" : "bg-gray-200"}`}
													/>
												</div>
											)}
											{/* Step circle */}
											<div className="relative flex h-6 w-6 items-center justify-center">
												{state.currentStep > step ? (
													<div className="h-6 w-6 rounded-full bg-cyan-600 flex items-center justify-center">
														<svg className="h-4 w-4 text-white" viewBox="0 0 20 20" fill="currentColor">
															<title>Complete</title>
															<path
																fillRule="evenodd"
																d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
																clipRule="evenodd"
															/>
														</svg>
													</div>
												) : state.currentStep === step ? (
													<div className="h-6 w-6 rounded-full border-2 border-cyan-600 bg-white flex items-center justify-center">
														<span className="text-cyan-600 font-semibold text-xs">{step}</span>
													</div>
												) : (
													<div className="h-6 w-6 rounded-full border-2 border-gray-300 bg-white flex items-center justify-center">
														<span className="text-gray-400 font-semibold text-xs">{step}</span>
													</div>
												)}
											</div>
										</li>
									))}
								</ol>
							</nav>
						</div>

						{/* Error message */}
						{error && (
							<div className="mb-4 bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded text-sm">
								{error}
							</div>
						)}

						{/* Step content */}
						<div className="min-h-64">
							{/* Step 1: Image Type */}
							{state.currentStep === 1 && (
								<div className="space-y-4">
									<h4 className="text-md font-medium text-gray-900">Select Image Type</h4>
									<div className="grid grid-cols-2 gap-4">
										{(["infographic", "illustration", "photo", "diagram"] as ImageType[]).map(
											(type) => (
												<button
													key={type}
													type="button"
													onClick={() => handleImageTypeSelect(type)}
													className="p-4 border-2 border-gray-300 rounded-lg hover:border-cyan-500 hover:bg-cyan-50 text-left transition-colors"
													aria-label={type}
												>
													<div className="font-medium text-gray-900 capitalize">{type}</div>
													<div className="text-sm text-gray-500 mt-1">
														{type === "infographic" && "Data visualizations and information graphics"}
														{type === "illustration" && "Artistic drawings and creative designs"}
														{type === "photo" && "Realistic photographic images"}
														{type === "diagram" && "Technical diagrams and flowcharts"}
													</div>
												</button>
											)
										)}
									</div>
								</div>
							)}

							{/* Step 2: Subject */}
							{state.currentStep === 2 && (
								<div className="space-y-4">
									<h4 className="text-md font-medium text-gray-900">Describe the Subject</h4>
									<div>
										<label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-2">
											What should the image depict?
										</label>
										<textarea
											id="subject"
											value={state.subject}
											onChange={(e) => setState({ ...state, subject: e.target.value })}
											className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
											rows={4}
											placeholder="e.g., A modern office workspace with natural lighting..."
											maxLength={500}
										/>
										<p className="mt-1 text-xs text-gray-500">{state.subject.length}/500 characters</p>
									</div>
									<div className="flex gap-3 justify-end">
										<button
											type="button"
											onClick={goToPreviousStep}
											className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
										>
											Back
										</button>
										<button
											type="button"
											onClick={handleSubjectNext}
											disabled={!state.subject.trim()}
											className="px-4 py-2 text-sm font-medium text-white bg-cyan-600 rounded-md hover:bg-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed"
										>
											Next
										</button>
									</div>
								</div>
							)}

							{/* Step 3: Style */}
							{state.currentStep === 3 && (
								<div className="space-y-4">
									<h4 className="text-md font-medium text-gray-900">Art Style (Optional)</h4>
									<div>
										<label htmlFor="style" className="block text-sm font-medium text-gray-700 mb-2">
											What visual style should be used?
										</label>
										<input
											id="style"
											type="text"
											value={state.style}
											onChange={(e) => setState({ ...state, style: e.target.value })}
											className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
											placeholder="e.g., Minimalist, Watercolor, 3D render, Vintage..."
											maxLength={200}
										/>
										<p className="mt-1 text-xs text-gray-500">Examples: Minimalist, Watercolor, 3D, Vintage, Abstract</p>
									</div>
									<div className="flex gap-3 justify-between">
										<button
											type="button"
											onClick={skipToGeneration}
											className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-cyan-600"
										>
											Skip to Generation
										</button>
										<div className="flex gap-3">
											<button
												type="button"
												onClick={goToPreviousStep}
												className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
											>
												Back
											</button>
											<button
												type="button"
												onClick={goToNextStep}
												className="px-4 py-2 text-sm font-medium text-white bg-cyan-600 rounded-md hover:bg-cyan-700"
											>
												Next
											</button>
										</div>
									</div>
								</div>
							)}

							{/* Step 4: Mood */}
							{state.currentStep === 4 && (
								<div className="space-y-4">
									<h4 className="text-md font-medium text-gray-900">Mood & Atmosphere (Optional)</h4>
									<div>
										<label htmlFor="mood" className="block text-sm font-medium text-gray-700 mb-2">
											What mood or feeling should the image convey?
										</label>
										<input
											id="mood"
											type="text"
											value={state.mood}
											onChange={(e) => setState({ ...state, mood: e.target.value })}
											className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
											placeholder="e.g., Calm, Energetic, Professional, Whimsical..."
											maxLength={200}
										/>
										<p className="mt-1 text-xs text-gray-500">Examples: Calm, Energetic, Professional, Mysterious, Playful</p>
									</div>
									<div className="flex gap-3 justify-end">
										<button
											type="button"
											onClick={goToPreviousStep}
											className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
										>
											Back
										</button>
										<button
											type="button"
											onClick={goToNextStep}
											className="px-4 py-2 text-sm font-medium text-white bg-cyan-600 rounded-md hover:bg-cyan-700"
										>
											Next
										</button>
									</div>
								</div>
							)}

							{/* Step 5: Composition & Colors */}
							{state.currentStep === 5 && (
								<div className="space-y-4">
									<div>
										<h4 className="text-md font-medium text-gray-900 mb-2">Composition (Optional)</h4>
										<input
											id="composition"
											type="text"
											value={state.composition}
											onChange={(e) => setState({ ...state, composition: e.target.value })}
											className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
											placeholder="e.g., Centered, Rule of thirds, Wide angle..."
											maxLength={200}
										/>
									</div>
									<div>
										<h4 className="text-md font-medium text-gray-900 mb-2">Color Palette (Optional)</h4>
										<input
											id="colors"
											type="text"
											value={state.colors}
											onChange={(e) => setState({ ...state, colors: e.target.value })}
											className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
											placeholder="e.g., Warm tones, Blue and gold, Pastel colors..."
											maxLength={200}
										/>
									</div>
									<div className="flex gap-3 justify-end">
										<button
											type="button"
											onClick={goToPreviousStep}
											className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
										>
											Back
										</button>
										<button
											type="button"
											onClick={goToNextStep}
											className="px-4 py-2 text-sm font-medium text-white bg-cyan-600 rounded-md hover:bg-cyan-700"
										>
											Review & Generate
										</button>
									</div>
								</div>
							)}

							{/* Step 6: Review & Generate */}
							{state.currentStep === 6 && (
								<div className="space-y-4">
									<h4 className="text-md font-medium text-gray-900 mb-4">Review & Generate Prompt</h4>

									{/* Summary */}
									<div className="bg-gray-50 rounded-lg p-4 text-sm space-y-2">
										<div>
											<span className="font-medium">Type:</span> {state.imageType}
										</div>
										<div>
											<span className="font-medium">Subject:</span> {state.subject}
										</div>
										{state.style && (
											<div>
												<span className="font-medium">Style:</span> {state.style}
											</div>
										)}
										{state.mood && (
											<div>
												<span className="font-medium">Mood:</span> {state.mood}
											</div>
										)}
										{state.composition && (
											<div>
												<span className="font-medium">Composition:</span> {state.composition}
											</div>
										)}
										{state.colors && (
											<div>
												<span className="font-medium">Colors:</span> {state.colors}
											</div>
										)}
									</div>

									{/* Generate or edit prompt */}
									{!state.generatedPrompt ? (
										<button
											type="button"
											onClick={handleGeneratePrompt}
											disabled={isGenerating}
											className="w-full bg-cyan-600 text-white px-4 py-3 rounded-md hover:bg-cyan-700 disabled:opacity-50 font-medium"
										>
											{isGenerating ? (
												<span className="flex items-center justify-center gap-2">
													<span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
													Generating Prompt...
												</span>
											) : (
												"Generate Prompt"
											)}
										</button>
									) : (
										<div className="space-y-4">
											<div>
												<label htmlFor="generated-prompt" className="block text-sm font-medium text-gray-700 mb-2">
													Generated Prompt (editable)
												</label>
												<textarea
													id="generated-prompt"
													value={state.generatedPrompt}
													onChange={(e) => setState({ ...state, generatedPrompt: e.target.value })}
													className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
													rows={6}
													maxLength={4000}
												/>
												<p className="mt-1 text-xs text-gray-500">
													{state.generatedPrompt.length}/4000 characters
												</p>
											</div>

											{/* Save as template option */}
											{projectId && (
												<div className="space-y-2">
													<label className="flex items-center gap-2">
														<input
															type="checkbox"
															checked={state.saveAsTemplate}
															onChange={(e) =>
																setState({ ...state, saveAsTemplate: e.target.checked })
															}
															className="rounded border-gray-300 text-cyan-600 focus:ring-cyan-500"
															aria-label="Save as template"
														/>
														<span className="text-sm text-gray-700">Save as template for reuse</span>
													</label>

													{state.saveAsTemplate && (
														<input
															type="text"
															value={state.templateName}
															onChange={(e) => setState({ ...state, templateName: e.target.value })}
															className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
															placeholder="Template name..."
															maxLength={100}
														/>
													)}
												</div>
											)}

											{/* Action buttons */}
											<div className="flex gap-3 justify-end">
												<button
													type="button"
													onClick={goToPreviousStep}
													className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
												>
													Back
												</button>
												<button
													type="button"
													onClick={handleFinalGenerate}
													className="px-4 py-2 text-sm font-medium text-white bg-cyan-600 rounded-md hover:bg-cyan-700"
												>
													Generate Image
												</button>
											</div>
										</div>
									)}
								</div>
							)}
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
