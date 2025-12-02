import { useState } from "react";

export interface FinalizeDialogProps {
	/**
	 * Whether the dialog is open.
	 */
	isOpen: boolean;

	/**
	 * Current finalized version number for default label.
	 */
	nextVersion: number;

	/**
	 * Called when user confirms finalization.
	 */
	onConfirm: (label: string) => void;

	/**
	 * Called when user cancels.
	 */
	onCancel: () => void;

	/**
	 * Whether the finalization is in progress.
	 */
	isLoading?: boolean;
}

/**
 * Confirmation dialog for finalizing content with optional version label.
 */
export function FinalizeDialog({
	isOpen,
	nextVersion,
	onConfirm,
	onCancel,
	isLoading = false,
}: FinalizeDialogProps) {
	const defaultLabel = `Finalized v${nextVersion}`;
	const [label, setLabel] = useState(defaultLabel);

	if (!isOpen) {
		return null;
	}

	const handleConfirm = () => {
		onConfirm(label || defaultLabel);
	};

	return (
		<div
			className="fixed inset-0 z-50 overflow-y-auto"
			aria-labelledby="finalize-dialog-title"
			role="dialog"
			aria-modal="true"
		>
			<div className="flex min-h-screen items-center justify-center p-4 text-center sm:p-0">
				{/* Background overlay */}
				<div
					className="fixed inset-0 bg-slate-500 bg-opacity-75 transition-opacity"
					aria-hidden="true"
					onClick={onCancel}
				/>

				{/* Modal panel */}
				<div className="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg">
					<div className="bg-white px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
						<div className="sm:flex sm:items-start">
							{/* Icon */}
							<div className="mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-cyan-100 sm:mx-0 sm:h-10 sm:w-10">
								<svg
									className="h-6 w-6 text-cyan-600"
									fill="none"
									viewBox="0 0 24 24"
									strokeWidth="1.5"
									stroke="currentColor"
									aria-hidden="true"
								>
									<title>Finalize</title>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
									/>
								</svg>
							</div>

							<div className="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left flex-1">
								<h3
									className="text-base font-semibold leading-6 text-slate-900"
									id="finalize-dialog-title"
								>
									Finalize Content
								</h3>
								<div className="mt-2">
									<p className="text-sm text-slate-500">
										Finalizing this content will lock it for editing. You can unlock it
										later if needed. Add an optional version label to help identify this
										version.
									</p>
								</div>

								{/* Version label input */}
								<div className="mt-4">
									<label
										htmlFor="version-label"
										className="block text-sm font-medium text-slate-700"
									>
										Version Label (optional)
									</label>
									<input
										type="text"
										id="version-label"
										value={label}
										onChange={(e) => setLabel(e.target.value)}
										placeholder={defaultLabel}
										disabled={isLoading}
										className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-cyan-500 focus:ring-cyan-500 sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed px-3 py-2 border"
									/>
									<p className="mt-1 text-xs text-slate-500">
										Leave empty to use default: "{defaultLabel}"
									</p>
								</div>
							</div>
						</div>
					</div>

					{/* Actions */}
					<div className="bg-slate-50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6 gap-3">
						<button
							type="button"
							onClick={handleConfirm}
							disabled={isLoading}
							className="inline-flex w-full justify-center rounded-md bg-cyan-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-cyan-700 sm:w-auto transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
						>
							{isLoading ? "Finalizing..." : "Finalize"}
						</button>
						<button
							type="button"
							onClick={onCancel}
							disabled={isLoading}
							className="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 hover:bg-slate-50 sm:mt-0 sm:w-auto transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
						>
							Cancel
						</button>
					</div>
				</div>
			</div>
		</div>
	);
}
