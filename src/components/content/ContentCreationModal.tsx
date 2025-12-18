import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/api";
import { Modal } from "@/components/shared/Modal";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { SelectionStep } from "./wizard-steps/SelectionStep";
import { DetailsStep } from "./wizard-steps/DetailsStep";
import { ReviewStep } from "./ReviewStep";
import type { Id } from "@/convex/dataModel";

export interface ContentCreationModalProps {
	isOpen: boolean;
	onClose: () => void;
	projectId: Id<"projects">;
	onComplete: (contentPieceId: Id<"contentPieces">) => void;
}

interface WizardState {
	currentStep: 1 | 2 | 3;
	categoryId: Id<"categories"> | null;
	personaId: Id<"personas"> | null;
	brandVoiceId: Id<"brandVoices"> | null;
	useAllKnowledgeBase: boolean;
	selectedKnowledgeBaseIds: Id<"knowledgeBaseItems">[];
	title: string;
	topic: string;
	draftContent: string;
	uploadedFileIds: Id<"files">[];
}

/**
 * StepProgressIndicator: Displays the progress through the 3-step wizard.
 * Shows completed, current, and future steps with proper visual states.
 */
function StepProgressIndicator({ currentStep }: { currentStep: 1 | 2 | 3 }) {
	const steps = [1, 2, 3] as const;

	return (
		<div className="flex items-center justify-center gap-2 mb-6" role="progressbar" aria-valuenow={currentStep} aria-valuemin={1} aria-valuemax={3}>
			{steps.map((step, index) => (
				<div key={step} className="flex items-center">
					{/* Step Circle */}
					<div
						className={`
							flex items-center justify-center w-10 h-10 rounded-full text-sm font-semibold transition-all
							${
								currentStep > step
									? "bg-cyan-600 dark:bg-cyan-500 text-white"
									: currentStep === step
										? "border-2 border-cyan-600 dark:border-cyan-400 bg-white dark:bg-slate-900 text-cyan-600 dark:text-cyan-400"
										: "border-2 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-400 dark:text-slate-600"
							}
						`}
						aria-label={`Step ${step}${currentStep > step ? " completed" : currentStep === step ? " current" : " upcoming"}`}
					>
						{currentStep > step ? "✓" : step}
					</div>

					{/* Connecting Line */}
					{index < steps.length - 1 && (
						<div
							className={`
								w-12 h-0.5 transition-colors
								${
									currentStep > step
										? "bg-cyan-600 dark:bg-cyan-500"
										: "bg-slate-300 dark:bg-slate-700"
								}
							`}
							aria-hidden="true"
						/>
					)}
				</div>
			))}
		</div>
	);
}

/**
 * ContentCreationModal: Main wizard component for creating new content pieces.
 * Implements a 3-step process: Selection -> Details -> Review & Generate.
 * Features close confirmation, step navigation, and state persistence.
 * Part of Phase 3.5 of the content creation wizard.
 *
 * Note: The onComplete callback will be used in a future phase to handle
 * successful content creation and navigation to the editor.
 */
export function ContentCreationModal({
	isOpen,
	onClose,
	projectId,
	onComplete, // Will be used in future phase for completion handling
}: ContentCreationModalProps) {
	// Wizard state management
	const [state, setState] = useState<WizardState>({
		currentStep: 1,
		categoryId: null,
		personaId: null,
		brandVoiceId: null,
		useAllKnowledgeBase: true,
		selectedKnowledgeBaseIds: [],
		title: "",
		topic: "",
		draftContent: "",
		uploadedFileIds: [],
	});

	// Close confirmation state
	const [showCloseConfirmation, setShowCloseConfirmation] = useState(false);

	// Mutation for creating content
	const createContentPiece = useMutation(api.contentPieces.createContentPiece);
	const [isCreating, setIsCreating] = useState(false);

	// Handle close with confirmation if progress beyond step 1
	const handleClose = () => {
		if (state.currentStep > 1) {
			setShowCloseConfirmation(true);
		} else {
			onClose();
		}
	};

	// Confirm close and reset state
	const handleConfirmClose = () => {
		setShowCloseConfirmation(false);
		setState({
			currentStep: 1,
			categoryId: null,
			personaId: null,
			brandVoiceId: null,
			useAllKnowledgeBase: true,
			selectedKnowledgeBaseIds: [],
			title: "",
			topic: "",
			draftContent: "",
			uploadedFileIds: [],
		});
		onClose();
	};

	// Cancel close confirmation
	const handleCancelClose = () => {
		setShowCloseConfirmation(false);
	};

	// Step 1: Handle selection step completion
	const handleStep1Next = (data: {
		categoryId: Id<"categories">;
		personaId: Id<"personas"> | null;
		brandVoiceId: Id<"brandVoices"> | null;
		useAllKnowledgeBase: boolean;
		selectedKnowledgeBaseIds: Id<"knowledgeBaseItems">[];
	}) => {
		setState({
			...state,
			currentStep: 2,
			categoryId: data.categoryId,
			personaId: data.personaId,
			brandVoiceId: data.brandVoiceId,
			useAllKnowledgeBase: data.useAllKnowledgeBase,
			selectedKnowledgeBaseIds: data.selectedKnowledgeBaseIds,
		});
	};

	// Step 2: Handle details step completion
	const handleStep2Next = (data: {
		title: string;
		topic: string;
		draftContent: string;
		uploadedFileIds: Id<"files">[];
	}) => {
		setState({
			...state,
			currentStep: 3,
			title: data.title,
			topic: data.topic,
			draftContent: data.draftContent,
			uploadedFileIds: data.uploadedFileIds,
		});
	};

	// Navigate back to step 1 from review
	const handleEditStep1 = () => {
		setState({ ...state, currentStep: 1 });
	};

	// Navigate back to step 2 from review
	const handleEditStep2 = () => {
		setState({ ...state, currentStep: 2 });
	};

	// Navigate back from step 2 to step 1
	const handleBackToStep1 = () => {
		setState({ ...state, currentStep: 1 });
	};

	// Navigate back from step 3 to step 2
	const handleBackToStep2 = () => {
		setState({ ...state, currentStep: 2 });
	};

	// Handle generation - create content piece and navigate to editor
	const handleGenerate = async () => {
		if (!state.categoryId) return;

		setIsCreating(true);
		try {
			const result = await createContentPiece({
				projectId,
				categoryId: state.categoryId,
				personaId: state.personaId ?? undefined,
				brandVoiceId: state.brandVoiceId ?? undefined,
				selectedKnowledgeBaseIds: state.selectedKnowledgeBaseIds.length > 0
					? state.selectedKnowledgeBaseIds
					: undefined,
				title: state.title,
				content: state.draftContent || "",
			});

			// Reset state and complete
			setState({
				currentStep: 1,
				categoryId: null,
				personaId: null,
				brandVoiceId: null,
				useAllKnowledgeBase: true,
				selectedKnowledgeBaseIds: [],
				title: "",
				topic: "",
				draftContent: "",
				uploadedFileIds: [],
			});

			onComplete(result.contentPieceId);
		} catch (error) {
			console.error("Failed to create content piece:", error);
			alert("Failed to create content. Please try again.");
		} finally {
			setIsCreating(false);
		}
	};

	// Handle edit navigation from ReviewStep (uses old step numbers)
	const handleEditFromReview = (step: 1 | 2 | 3 | 4 | 5 | 6) => {
		// Map old step numbers to new 3-step flow
		// Old steps 1-3 (category, persona, brand voice) -> new step 1 (selection)
		// Old step 4 (content details) -> new step 2 (details)
		if (step <= 3) {
			handleEditStep1();
		} else if (step === 4) {
			handleEditStep2();
		}
	};

	return (
		<>
			<Modal isOpen={isOpen} onClose={handleClose} title="Create Content" size="3xl">
				{/* Progress Indicator */}
				<StepProgressIndicator currentStep={state.currentStep} />

				{/* Step Content */}
				<div className="mt-6">
					{state.currentStep === 1 && (
						<SelectionStep
							projectId={projectId}
							categoryId={state.categoryId}
							personaId={state.personaId}
							brandVoiceId={state.brandVoiceId}
							useAllKnowledgeBase={state.useAllKnowledgeBase}
							selectedKnowledgeBaseIds={state.selectedKnowledgeBaseIds}
							onNext={handleStep1Next}
						/>
					)}

					{state.currentStep === 2 && (
						<DetailsStep
							title={state.title}
							topic={state.topic}
							draftContent={state.draftContent}
							uploadedFileIds={state.uploadedFileIds}
							onBack={handleBackToStep1}
							onNext={handleStep2Next}
						/>
					)}

					{state.currentStep === 3 && state.categoryId && (
						<ReviewStep
							categoryId={state.categoryId}
							personaId={state.personaId}
							brandVoiceId={state.brandVoiceId}
							title={state.title}
							topic={state.topic}
							draftContent={state.draftContent}
							uploadedFileIds={state.uploadedFileIds}
							onGenerate={handleGenerate}
							onEdit={handleEditFromReview}
							onBack={handleBackToStep2}
							isGenerating={isCreating}
						/>
					)}
				</div>
			</Modal>

			{/* Confirmation Dialog */}
			{showCloseConfirmation && (
				<ConfirmDialog
					isOpen={showCloseConfirmation}
					title="Cancel Content Creation?"
					message="Are you sure you want to cancel? Your progress will be lost."
					confirmLabel="Yes, Cancel"
					cancelLabel="Keep Editing"
					variant="warning"
					onConfirm={handleConfirmClose}
					onCancel={handleCancelClose}
				/>
			)}
		</>
	);
}
