export interface CompleteStepProps {
	projectName: string;
	onFinish: () => void;
}

/**
 * Final step of onboarding wizard: Completion message.
 * Shows success message and redirects to the newly created project.
 */
export function CompleteStep({ projectName, onFinish }: CompleteStepProps) {
	return (
		<div className="text-center py-8">
			<div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-6">
				<svg
					className="h-8 w-8 text-green-600"
					fill="none"
					viewBox="0 0 24 24"
					stroke="currentColor"
					aria-hidden="true"
				>
					<title>Success</title>
					<path
						strokeLinecap="round"
						strokeLinejoin="round"
						strokeWidth={2}
						d="M5 13l4 4L19 7"
					/>
				</svg>
			</div>

			<h2 className="text-2xl font-semibold text-slate-900 mb-2">
				You're All Set!
			</h2>
			<p className="text-slate-600 mb-8">
				Your project <strong>{projectName}</strong> is ready. Let's start creating amazing content.
			</p>

			<button
				type="button"
				onClick={onFinish}
				className="inline-flex items-center px-8 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-cyan-600 hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500 transition-colors"
			>
				Go to Project
				<svg className="ml-2 w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<title>Go</title>
					<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
				</svg>
			</button>
		</div>
	);
}
