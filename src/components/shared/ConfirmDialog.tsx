import { type ReactNode } from "react";

export interface ConfirmDialogProps {
	isOpen: boolean;
	title: string;
	message: string | ReactNode;
	confirmLabel?: string;
	cancelLabel?: string;
	confirmVariant?: "danger" | "warning" | "info";
	variant?: "danger" | "warning" | "info"; // Alias for confirmVariant
	onConfirm: () => void;
	onClose?: () => void; // Alias for onCancel
	onCancel?: () => void;
	isLoading?: boolean;
}

/**
 * Reusable confirmation dialog for destructive or important actions.
 * Displays a modal overlay with title, message, and confirm/cancel buttons.
 */
export function ConfirmDialog({
	isOpen,
	title,
	message,
	confirmLabel = "Confirm",
	cancelLabel = "Cancel",
	confirmVariant,
	variant,
	onConfirm,
	onClose,
	onCancel,
	isLoading = false,
}: ConfirmDialogProps) {
	if (!isOpen) {
		return null;
	}

	// Support both onClose and onCancel props
	const handleCancel = onClose || onCancel || (() => { });

	// Support both confirmVariant and variant props
	const activeVariant = confirmVariant || variant || "danger";

	const variantStyles = {
		danger:
			"bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-800 focus:ring-red-500",
		warning:
			"bg-yellow-600 hover:bg-yellow-700 dark:bg-yellow-700 dark:hover:bg-yellow-800 focus:ring-yellow-500",
		info: "bg-cyan-600 hover:bg-cyan-700 dark:bg-cyan-700 dark:hover:bg-cyan-800 focus:ring-cyan-500",
	};

	return (
		<div
			className="fixed inset-0 z-50 overflow-y-auto"
			aria-labelledby="modal-title"
			role="dialog"
			aria-modal="true"
		>
			<div className="flex min-h-screen items-center justify-center p-4 text-center sm:p-0">
				{/* Background overlay */}
				<div
					className="fixed inset-0 bg-black bg-opacity-50 dark:bg-black dark:bg-opacity-90 transition-opacity"
					aria-hidden="true"
					onClick={handleCancel}
				/>

				{/* Modal panel */}
				<div className="relative transform overflow-hidden rounded-lg bg-white dark:bg-slate-900 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg">
					<div className="bg-white dark:bg-slate-900 px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
						<div className="sm:flex sm:items-start">
							{activeVariant === "danger" && (
								<div className="mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-red-100 dark:bg-red-900 sm:mx-0 sm:h-10 sm:w-10">
									<svg
										className="h-6 w-6 text-red-600 dark:text-red-400"
										fill="none"
										viewBox="0 0 24 24"
										strokeWidth="1.5"
										stroke="currentColor"
										aria-hidden="true"
									>
										<title>Warning</title>
										<path
											strokeLinecap="round"
											strokeLinejoin="round"
											d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
										/>
									</svg>
								</div>
							)}
							<div className="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left">
								<h3
									className="text-base font-semibold leading-6 text-slate-900 dark:text-slate-100"
									id="modal-title"
								>
									{title}
								</h3>
								<div className="mt-2">
									{typeof message === "string" ? (
										<p className="text-sm text-slate-500 dark:text-slate-400">
											{message}
										</p>
									) : (
										message
									)}
								</div>
							</div>
						</div>
					</div>
					<div className="bg-slate-50 dark:bg-slate-800 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6 gap-3">
						<button
							type="button"
							onClick={onConfirm}
							disabled={isLoading}
							className={`inline-flex w-full justify-center rounded-md px-3 py-2 text-sm font-semibold text-white shadow-sm sm:w-auto transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${variantStyles[activeVariant]}`}
						>
							{isLoading ? "Processing..." : confirmLabel}
						</button>
						<button
							type="button"
							onClick={handleCancel}
							disabled={isLoading}
							className="mt-3 inline-flex w-full justify-center rounded-md bg-white dark:bg-slate-800 px-3 py-2 text-sm font-semibold text-slate-900 dark:text-slate-100 shadow-sm ring-1 ring-inset ring-slate-300 dark:ring-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 sm:mt-0 sm:w-auto transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
						>
							{cancelLabel}
						</button>
					</div>
				</div>
			</div>
		</div>
	);
}
