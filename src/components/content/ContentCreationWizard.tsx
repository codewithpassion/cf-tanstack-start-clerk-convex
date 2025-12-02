import { useState } from "react";
import type { Id } from "../../../convex/_generated/dataModel";
import { CategorySelectStep } from "./CategorySelectStep";
import { PersonaSelectStep } from "./PersonaSelectStep";
import { BrandVoiceSelectStep } from "./BrandVoiceSelectStep";
import { ContentDetailsStep } from "./ContentDetailsStep";
import { ReviewStep } from "./ReviewStep";
import { GenerationStep } from "./GenerationStep";

export interface ContentCreationWizardProps {
	isOpen: boolean;
	projectId: Id<"projects">;
	onClose: () => void;
	onComplete: (contentPieceId: Id<"contentPieces">) => void;
}

type Step = 1 | 2 | 3 | 4 | 5 | 6;

export interface WizardState {
	currentStep: Step;
	categoryId: Id<"categories"> | null;
	personaId: Id<"personas"> | null;
	brandVoiceId: Id<"brandVoices"> | null;
	title: string;
	topic: string;
	draftContent: string;
	uploadedFileIds: Id<"files">[];
	contentPieceId: Id<"contentPieces"> | null;
	generatedContent: string;
}

/**
 * Multi-step wizard for content creation with AI draft generation.
 * Guides users through selecting category, persona, brand voice, and content details.
 * Steps 2-3 (persona and brand voice) are optional and can be skipped.
 */
export function ContentCreationWizard({
	isOpen,
	projectId,
	onClose,
	onComplete,
}: ContentCreationWizardProps) {
	const [state, setState] = useState<WizardState>({
		currentStep: 1,
		categoryId: null,
		personaId: null,
		brandVoiceId: null,
		title: "",
		topic: "",
		draftContent: "",
		uploadedFileIds: [],
		contentPieceId: null,
		generatedContent: "",
	});

	const [showCloseConfirmation, setShowCloseConfirmation] = useState(false);

	const handleCategoryNext = (categoryId: Id<"categories">) => {
		setState({
			...state,
			currentStep: 2,
			categoryId,
		});
	};

	const handlePersonaNext = (personaId: Id<"personas"> | null) => {
		setState({
			...state,
			currentStep: 3,
			personaId,
		});
	};

	const handlePersonaSkip = () => {
		setState({
			...state,
			currentStep: 3,
			personaId: null,
		});
	};

	const handleBrandVoiceNext = (brandVoiceId: Id<"brandVoices"> | null) => {
		setState({
			...state,
			currentStep: 4,
			brandVoiceId,
		});
	};

	const handleBrandVoiceSkip = () => {
		setState({
			...state,
			currentStep: 4,
			brandVoiceId: null,
		});
	};

	const handleContentDetailsNext = (data: {
		title: string;
		topic: string;
		draftContent: string;
		uploadedFileIds: Id<"files">[];
	}) => {
		setState({
			...state,
			currentStep: 5,
			title: data.title,
			topic: data.topic,
			draftContent: data.draftContent,
			uploadedFileIds: data.uploadedFileIds,
		});
	};

	const handleReviewGenerate = () => {
		setState({
			...state,
			currentStep: 6,
		});
	};

	const handleEditStep = (step: Step) => {
		setState({
			...state,
			currentStep: step,
		});
	};

	const handleGenerationComplete = (contentPieceId: Id<"contentPieces">, content: string) => {
		setState({
			...state,
			contentPieceId,
			generatedContent: content,
		});
		onComplete(contentPieceId);
	};

	const handleBack = () => {
		if (state.currentStep > 1) {
			setState({
				...state,
				currentStep: (state.currentStep - 1) as Step,
			});
		}
	};

	const handleCloseRequest = () => {
		// Show confirmation if user has made progress
		if (state.currentStep > 1) {
			setShowCloseConfirmation(true);
		} else {
			onClose();
		}
	};

	const handleCloseConfirm = () => {
		setShowCloseConfirmation(false);
		onClose();
	};

	const handleCloseCancel = () => {
		setShowCloseConfirmation(false);
	};

	if (!isOpen) {
		return null;
	}

	return (
		<div
			className="fixed inset-0 z-50 overflow-y-auto"
			role="dialog"
			aria-modal="true"
			aria-labelledby="wizard-title"
		>
			<div className="flex min-h-screen items-center justify-center p-4 text-center sm:p-0">
				{/* Background overlay */}
				<div
					className="fixed inset-0 bg-slate-500 bg-opacity-75 transition-opacity"
					aria-hidden="true"
					onClick={handleCloseRequest}
				/>

				{/* Modal panel */}
				<div className="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-3xl">
					{/* Close button */}
					<button
						type="button"
						onClick={handleCloseRequest}
						className="absolute right-4 top-4 text-slate-400 hover:text-slate-500"
						aria-label="Close wizard"
					>
						<svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={2}
								d="M6 18L18 6M6 6l12 12"
							/>
						</svg>
					</button>

					<div className="bg-white px-4 pb-4 pt-5 sm:p-6">
						{/* Step indicators */}
						<div className="mb-8">
							<nav aria-label="Progress">
								<ol role="list" className="flex items-center justify-center">
									{[1, 2, 3, 4, 5, 6].map((step, index) => (
										<li key={step} className={`relative ${index !== 5 ? "pr-4 sm:pr-12" : ""}`}>
											{/* Connector line */}
											{index !== 5 && (
												<div className="absolute inset-0 flex items-center" aria-hidden="true">
													<div
														className={`h-0.5 w-full ${state.currentStep > step ? "bg-cyan-600" : "bg-slate-200"}`}
													/>
												</div>
											)}
											{/* Step circle */}
											<div className="relative flex h-8 w-8 items-center justify-center">
												{state.currentStep > step ? (
													<div className="h-8 w-8 rounded-full bg-cyan-600 flex items-center justify-center">
														<svg className="h-5 w-5 text-white" viewBox="0 0 20 20" fill="currentColor">
															<title>Complete</title>
															<path
																fillRule="evenodd"
																d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
																clipRule="evenodd"
															/>
														</svg>
													</div>
												) : state.currentStep === step ? (
													<div className="h-8 w-8 rounded-full border-2 border-cyan-600 bg-white flex items-center justify-center">
														<span className="text-cyan-600 font-semibold text-sm">{step}</span>
													</div>
												) : (
													<div className="h-8 w-8 rounded-full border-2 border-slate-300 bg-white flex items-center justify-center">
														<span className="text-slate-400 font-semibold text-sm">{step}</span>
													</div>
												)}
											</div>
										</li>
									))}
								</ol>
							</nav>
						</div>

						{/* Step content */}
						<div>
							{state.currentStep === 1 && (
								<CategorySelectStep
									projectId={projectId}
									selectedCategoryId={state.categoryId}
									onNext={handleCategoryNext}
									onBack={undefined}
								/>
							)}

							{state.currentStep === 2 && (
								<PersonaSelectStep
									projectId={projectId}
									selectedPersonaId={state.personaId}
									onNext={handlePersonaNext}
									onSkip={handlePersonaSkip}
									onBack={handleBack}
								/>
							)}

							{state.currentStep === 3 && (
								<BrandVoiceSelectStep
									projectId={projectId}
									selectedBrandVoiceId={state.brandVoiceId}
									onNext={handleBrandVoiceNext}
									onSkip={handleBrandVoiceSkip}
									onBack={handleBack}
								/>
							)}

							{state.currentStep === 4 && (
								<ContentDetailsStep
									projectId={projectId}
									title={state.title}
									topic={state.topic}
									draftContent={state.draftContent}
									uploadedFileIds={state.uploadedFileIds}
									onNext={handleContentDetailsNext}
									onBack={handleBack}
								/>
							)}

							{state.currentStep === 5 && state.categoryId && (
								<ReviewStep
									categoryId={state.categoryId}
									personaId={state.personaId}
									brandVoiceId={state.brandVoiceId}
									title={state.title}
									topic={state.topic}
									draftContent={state.draftContent}
									uploadedFileIds={state.uploadedFileIds}
									onGenerate={handleReviewGenerate}
									onEdit={handleEditStep}
									onBack={handleBack}
								/>
							)}

							{state.currentStep === 6 && state.categoryId && (
								<GenerationStep
									projectId={projectId}
									categoryId={state.categoryId}
									personaId={state.personaId}
									brandVoiceId={state.brandVoiceId}
									title={state.title}
									topic={state.topic}
									draftContent={state.draftContent}
									onComplete={handleGenerationComplete}
								/>
							)}
						</div>
					</div>
				</div>
			</div>

			{/* Close confirmation dialog */}
			{showCloseConfirmation && (
				<div className="fixed inset-0 z-[60] overflow-y-auto">
					<div className="flex min-h-screen items-center justify-center p-4">
						<div className="fixed inset-0 bg-slate-500 bg-opacity-75" aria-hidden="true" />
						<div className="relative bg-white rounded-lg p-6 max-w-md">
							<h3 className="text-lg font-semibold mb-2 text-slate-900">Close wizard?</h3>
							<p className="text-slate-600 mb-4">
								Your progress will be lost. Are you sure you want to close this wizard?
							</p>
							<div className="flex gap-3 justify-end">
								<button
									type="button"
									onClick={handleCloseCancel}
									className="px-4 py-2 text-slate-700 hover:bg-slate-100 rounded-lg"
								>
									Cancel
								</button>
								<button
									type="button"
									onClick={handleCloseConfirm}
									className="px-4 py-2 bg-red-600 text-white hover:bg-red-700 rounded-lg"
								>
									Close Wizard
								</button>
							</div>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
