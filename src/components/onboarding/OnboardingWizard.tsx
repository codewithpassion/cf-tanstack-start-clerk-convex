import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { ProjectStep, type ProjectStepData } from "./ProjectStep";
import { BrandVoiceStep, type BrandVoiceStepData } from "./BrandVoiceStep";
import { PersonaStep, type PersonaStepData } from "./PersonaStep";
import { CompleteStep } from "./CompleteStep";
import type { Id } from "../../../convex/_generated/dataModel";

export interface OnboardingWizardProps {
	isOpen: boolean;
	onComplete: (projectId: Id<"projects">) => void;
}

type Step = 1 | 2 | 3 | 4;

interface WizardState {
	currentStep: Step;
	projectId: Id<"projects"> | null;
	projectName: string;
	brandVoiceId: Id<"brandVoices"> | null;
	personaId: Id<"personas"> | null;
}

/**
 * Multi-step onboarding wizard for new users.
 * Guides users through creating their first project, brand voice, and persona.
 * Steps 2-3 (brand voice and persona) are optional and can be skipped.
 */
export function OnboardingWizard({ isOpen, onComplete }: OnboardingWizardProps) {
	const createProject = useMutation(api.projects.createProject);
	const createBrandVoice = useMutation(api.brandVoices.createBrandVoice);
	const createPersona = useMutation(api.personas.createPersona);
	const completeOnboarding = useMutation(api.workspaces.completeOnboarding);

	const [state, setState] = useState<WizardState>({
		currentStep: 1,
		projectId: null,
		projectName: "",
		brandVoiceId: null,
		personaId: null,
	});

	const [isSubmitting, setIsSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);

	// Step 1: Create project
	const handleProjectNext = async (data: ProjectStepData) => {
		setError(null);
		setIsSubmitting(true);

		try {
			const result = await createProject({
				name: data.name,
				description: data.description,
			});

			setState({
				...state,
				currentStep: 2,
				projectId: result.projectId,
				projectName: data.name,
			});
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to create project");
		} finally {
			setIsSubmitting(false);
		}
	};

	// Step 2: Create brand voice or skip
	const handleBrandVoiceNext = async (data: BrandVoiceStepData) => {
		if (!state.projectId) return;

		setError(null);
		setIsSubmitting(true);

		try {
			const result = await createBrandVoice({
				projectId: state.projectId,
				name: data.name,
				description: data.description,
			});

			setState({
				...state,
				currentStep: 3,
				brandVoiceId: result.brandVoiceId,
			});
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to create brand voice");
		} finally {
			setIsSubmitting(false);
		}
	};

	const handleBrandVoiceSkip = () => {
		setState({
			...state,
			currentStep: 3,
		});
	};

	// Step 3: Create persona or skip
	const handlePersonaNext = async (data: PersonaStepData) => {
		if (!state.projectId) return;

		setError(null);
		setIsSubmitting(true);

		try {
			const result = await createPersona({
				projectId: state.projectId,
				name: data.name,
				description: data.description,
			});

			setState({
				...state,
				currentStep: 4,
				personaId: result.personaId,
			});
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to create persona");
		} finally {
			setIsSubmitting(false);
		}
	};

	const handlePersonaSkip = () => {
		setState({
			...state,
			currentStep: 4,
		});
	};

	// Step 4: Complete onboarding
	const handleFinish = async () => {
		if (!state.projectId) return;

		setError(null);
		setIsSubmitting(true);

		try {
			await completeOnboarding();
			onComplete(state.projectId);
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to complete onboarding");
		} finally {
			setIsSubmitting(false);
		}
	};

	if (!isOpen) {
		return null;
	}

	return (
		<div className="fixed inset-0 z-50 overflow-y-auto" role="dialog" aria-modal="true" aria-labelledby="onboarding-title">
			<div className="flex min-h-screen items-center justify-center p-4 text-center sm:p-0">
				{/* Background overlay - non-dismissible during onboarding */}
				<div
					className="fixed inset-0 bg-slate-500 bg-opacity-75 transition-opacity"
					aria-hidden="true"
				/>

				{/* Modal panel */}
				<div className="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-2xl">
					<div className="bg-white px-4 pb-4 pt-5 sm:p-6">
						{/* Step indicators */}
						<div className="mb-8">
							<nav aria-label="Progress">
								<ol role="list" className="flex items-center justify-center">
									{[1, 2, 3, 4].map((step, index) => (
										<li key={step} className={`relative ${index !== 3 ? "pr-8 sm:pr-20" : ""}`}>
											{/* Connector line */}
											{index !== 3 && (
												<div className="absolute inset-0 flex items-center" aria-hidden="true">
													<div className={`h-0.5 w-full ${state.currentStep > step ? "bg-cyan-600" : "bg-slate-200"}`} />
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

						{/* Error message */}
						{error && (
							<div className="mb-4 bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded">
								{error}
							</div>
						)}

						{/* Step content */}
						<div className={isSubmitting ? "opacity-50 pointer-events-none" : ""}>
							{state.currentStep === 1 && (
								<ProjectStep
									onNext={handleProjectNext}
									onSkip={undefined}
								/>
							)}

							{state.currentStep === 2 && state.projectId && (
								<BrandVoiceStep
									projectId={state.projectId}
									onNext={handleBrandVoiceNext}
									onSkip={handleBrandVoiceSkip}
								/>
							)}

							{state.currentStep === 3 && state.projectId && (
								<PersonaStep
									projectId={state.projectId}
									onNext={handlePersonaNext}
									onSkip={handlePersonaSkip}
								/>
							)}

							{state.currentStep === 4 && (
								<CompleteStep
									projectName={state.projectName}
									onFinish={handleFinish}
								/>
							)}
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
