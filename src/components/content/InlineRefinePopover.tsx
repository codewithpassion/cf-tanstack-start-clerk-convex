import { useState, useEffect, useRef } from "react";
import { Sparkles, X } from "lucide-react";

/**
 * Props for InlineRefinePopover component
 */
export interface InlineRefinePopoverProps {
	/**
	 * Whether the popover is open
	 */
	isOpen: boolean;

	/**
	 * Callback when popover should close
	 */
	onClose: () => void;

	/**
	 * Callback when user submits refinement instructions
	 */
	onSubmit: (instructions: string) => void;

	/**
	 * Position to display the popover
	 */
	position: { x: number; y: number };
}

/**
 * Inline popover for entering refinement instructions for selected text.
 *
 * Features:
 * - Small floating card positioned near the selection
 * - Textarea for refinement instructions
 * - Send button + Ctrl+Enter keyboard shortcut
 * - Auto-focus on open
 * - Click outside to close
 *
 * @example
 * ```tsx
 * <InlineRefinePopover
 *   isOpen={showPopover}
 *   onClose={() => setShowPopover(false)}
 *   onSubmit={(instructions) => handleRefine(instructions)}
 *   position={{ x: 100, y: 200 }}
 * />
 * ```
 */
export function InlineRefinePopover({
	isOpen,
	onClose,
	onSubmit,
	position,
}: InlineRefinePopoverProps) {
	const [instructions, setInstructions] = useState("");
	const popoverRef = useRef<HTMLDivElement>(null);
	const textareaRef = useRef<HTMLTextAreaElement>(null);

	// Reset state when popover opens
	useEffect(() => {
		if (isOpen) {
			setInstructions("");
			// Auto-focus textarea when opened
			setTimeout(() => {
				textareaRef.current?.focus();
			}, 0);
		}
	}, [isOpen]);

	// Handle click outside to close
	useEffect(() => {
		if (!isOpen) return;

		const handleClickOutside = (event: MouseEvent) => {
			if (
				popoverRef.current &&
				!popoverRef.current.contains(event.target as Node)
			) {
				onClose();
			}
		};

		document.addEventListener("mousedown", handleClickOutside);
		return () => {
			document.removeEventListener("mousedown", handleClickOutside);
		};
	}, [isOpen, onClose]);

	// Handle submit
	const handleSubmit = () => {
		if (!instructions.trim()) {
			return; // Don't submit empty instructions
		}

		onSubmit(instructions);
		setInstructions("");
	};

	// Handle keyboard shortcut (Ctrl+Enter to submit)
	const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
		if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
			e.preventDefault();
			handleSubmit();
		}
		// Close on Escape
		if (e.key === "Escape") {
			e.preventDefault();
			onClose();
		}
	};

	// Don't render if not open
	if (!isOpen) {
		return null;
	}

	return (
		<div
			ref={popoverRef}
			className="fixed z-50 bg-white rounded-lg shadow-xl border border-gray-200 dark:bg-gray-800 dark:border-gray-700"
			style={{
				left: `${position.x}px`,
				top: `${position.y}px`,
				width: "320px",
			}}
		>
			{/* Header */}
			<div className="flex items-center justify-between px-3 py-2 border-b border-gray-200 dark:border-gray-700">
				<div className="flex items-center gap-2">
					<Sparkles className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
					<h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
						Refine Selection
					</h3>
				</div>
				<button
					type="button"
					onClick={onClose}
					className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
				>
					<X className="w-4 h-4" />
				</button>
			</div>

			{/* Content */}
			<div className="p-3 space-y-3">
				<div>
					<label
						htmlFor="inline-refine-instructions"
						className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5"
					>
						How would you like to refine this?
					</label>
					<textarea
						ref={textareaRef}
						id="inline-refine-instructions"
						value={instructions}
						onChange={(e) => setInstructions(e.target.value)}
						onKeyDown={handleKeyDown}
						placeholder="e.g., Make this more concise..."
						className="w-full h-24 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500 dark:focus:ring-cyan-400 resize-none placeholder:text-gray-400 dark:placeholder:text-gray-500"
					/>
					<p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
						Press{" "}
						<kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-xs">
							Ctrl
						</kbd>{" "}
						+{" "}
						<kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-xs">
							Enter
						</kbd>{" "}
						to send
					</p>
				</div>

				{/* Actions */}
				<div className="flex items-center justify-end gap-2">
					<button
						type="button"
						onClick={onClose}
						className="px-3 py-1.5 text-xs text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500 transition-colors"
					>
						Cancel
					</button>
					<button
						type="button"
						onClick={handleSubmit}
						disabled={!instructions.trim()}
						className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs bg-cyan-600 text-white rounded-md hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
					>
						<Sparkles className="w-3 h-3" />
						Send
					</button>
				</div>
			</div>
		</div>
	);
}
