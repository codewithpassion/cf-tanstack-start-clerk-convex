import { useEffect } from "react";
import { X } from "lucide-react";

export interface ModalProps {
	isOpen: boolean;
	onClose: () => void;
	title: string;
	size?: "sm" | "md" | "lg" | "xl" | "2xl" | "3xl";
	children: React.ReactNode;
}

const sizeClasses = {
	sm: "sm:max-w-sm",
	md: "sm:max-w-md",
	lg: "sm:max-w-lg",
	xl: "sm:max-w-xl",
	"2xl": "sm:max-w-2xl",
	"3xl": "sm:max-w-3xl",
};

/**
 * Reusable modal component with frosted glass effect and backdrop blur.
 * Features: Escape key handler, click outside to close, scroll lock, dark mode support.
 */
export function Modal({ isOpen, onClose, title, size = "lg", children }: ModalProps) {
	// Early return if not open
	if (!isOpen) return null;

	// Escape key handler
	useEffect(() => {
		const handleEscape = (e: KeyboardEvent) => {
			if (e.key === "Escape") {
				onClose();
			}
		};

		document.addEventListener("keydown", handleEscape);
		return () => document.removeEventListener("keydown", handleEscape);
	}, [onClose]);

	// Scroll lock
	useEffect(() => {
		// Save original body overflow
		const originalOverflow = document.body.style.overflow;
		document.body.style.overflow = "hidden";

		return () => {
			document.body.style.overflow = originalOverflow;
		};
	}, []);

	return (
		<div className="fixed inset-0 z-50 overflow-y-auto">
			<div className="flex min-h-screen items-center justify-center p-4">
				{/* Backdrop with blur */}
				<div
					className="fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
					onClick={onClose}
					onKeyDown={(e) => {
						if (e.key === "Enter" || e.key === " ") {
							onClose();
						}
					}}
					role="button"
					tabIndex={0}
					aria-label="Close modal"
				/>

				{/* Frosted glass panel */}
				<div
					className={`relative transform overflow-hidden rounded-2xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-white/20 dark:border-slate-700/50 shadow-2xl transition-all w-full ${sizeClasses[size]}`}
					role="dialog"
					aria-modal="true"
					aria-labelledby="modal-title"
				>
					{/* Header */}
					<div className="px-6 py-4 border-b border-slate-200/50 dark:border-slate-700/50 flex items-center justify-between">
						<h2
							id="modal-title"
							className="text-lg font-semibold text-slate-900 dark:text-white"
						>
							{title}
						</h2>
						<button
							type="button"
							onClick={onClose}
							className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors p-1 rounded-lg hover:bg-slate-100/50 dark:hover:bg-slate-800/50"
							aria-label="Close"
						>
							<X className="w-5 h-5" />
						</button>
					</div>

					{/* Content */}
					<div className="px-6 py-4">{children}</div>
				</div>
			</div>
		</div>
	);
}
