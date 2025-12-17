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
	selectedKnowledgeBaseIds: Id<"knowledgeBaseItems">[];
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
		selectedKnowledgeBaseIds: [],
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

	const handleGenerationComplete = (
		contentPieceId: Id<"contentPieces">,
		content: string,
	) => {
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
		// Show confirmation if user has progressed beyond first step
		if (state.currentStep > 1) {
			setShowCloseConfirmation(true);
		} else {
			onClose();
		}
	};

	const handleConfirmClose = () => {
		setShowCloseConfirmation(false);
		onClose();
	};

	const handleCancelClose = () => {
		setShowCloseConfirmation(false);
	};

	if (!isOpen) return null;

	return (
		<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
			<div className="bg-white dark:bg-slate-900 rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
				{/* Header */}
				<div className="sticky top-0 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 p-6 flex items-center justify-between">
					<div>
						<h2 className="text-2xl font-bold text-slate-900 dark:text-white">
							Create New Content
						</h2>
						<p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
							Step {state.currentStep} of 6
						</p>
					</div>
					<button
						type="button"
						onClick={handleCloseRequest}
						className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
						aria-label="Close wizard"
					>
						<svg
							className="w-6 h-6"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<title>Close</title>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={2}
								d="M6 18L18 6M6 6l12 12"
							/>
						</svg>
					</button>
				</div>

				{/* Progress Indicator */}
				<div className="px-6 py-4 bg-slate-50 dark:bg-slate-900/50">
					<div className="flex items-center justify-between">
						{[1, 2, 3, 4, 5, 6].map((step) => (
							<div key={step} className="flex-1 flex items-center">
								<div
									className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
										state.currentStep === step
											? "bg-cyan-600 text-white"
											: state.currentStep > step
												? "bg-green-500 text-white"
												: "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
									}`}
								>
									{state.currentStep > step ? "✓" : step}
								</div>
								{step < 6 && (
									<div
										className={`flex-1 h-1 mx-2 ${
											state.currentStep > step
												? "bg-green-500"
												: "bg-slate-200 dark:bg-slate-700"
										}`}
									/>
								)}
							</div>
						))}
					</div>
					<div className="flex justify-between text-xs text-slate-600 dark:text-slate-400 mt-2">
						<span>Category</span>
						<span>Persona</span>
						<span>Voice</span>
						<span>Details</span>
						<span>Review</span>
						<span>Generate</span>
					</div>
				</div>

				{/* Step Content */}
				<div className="p-6">
					{state.currentStep === 1 && (
						<CategorySelectStep
							projectId={projectId}
							selectedCategoryId={state.categoryId}
							onNext={handleCategoryNext}
							onBack={() => {}}
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

					{state.currentStep === 5 &&
						state.categoryId &&
						state.title && (
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
							uploadedFileIds={state.uploadedFileIds}
							selectedKnowledgeBaseIds={state.selectedKnowledgeBaseIds}
							onComplete={handleGenerationComplete}
						/>
					)}
				</div>
			</div>

			{/* Close Confirmation Dialog */}
			{showCloseConfirmation && (
				<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60]">
					<div className="bg-white dark:bg-slate-900 rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
						<h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
							Close Wizard?
						</h3>
						<p className="text-slate-600 dark:text-slate-300 mb-6">
							Your progress will be lost if you close the wizard. Are you sure
							you want to continue?
						</p>
						<div className="flex gap-3 justify-end">
							<button
								type="button"
								onClick={handleCancelClose}
								className="px-4 py-2 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
							>
								Cancel
							</button>
							<button
								type="button"
								onClick={handleConfirmClose}
								className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg"
							>
								Close Wizard
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
