import { useEffect, useState } from "react";

export interface SearchInputProps {
	value: string;
	onChange: (value: string) => void;
	onSearch: (value: string) => void;
	isLoading?: boolean;
	placeholder?: string;
	debounceMs?: number;
}

/**
 * Search input component with debouncing, loading indicator, and clear button.
 * Triggers search after user stops typing for the specified debounce delay.
 */
export function SearchInput({
	value,
	onChange,
	onSearch,
	isLoading = false,
	placeholder = "Search content...",
	debounceMs = 300,
}: SearchInputProps) {
	const [localValue, setLocalValue] = useState(value);

	// Update local value when prop changes
	useEffect(() => {
		setLocalValue(value);
	}, [value]);

	// Debounced search effect
	useEffect(() => {
		const timer = setTimeout(() => {
			if (localValue !== value) {
				onChange(localValue);
				onSearch(localValue);
			}
		}, debounceMs);

		return () => clearTimeout(timer);
	}, [localValue, value, onChange, onSearch, debounceMs]);

	const handleClear = () => {
		setLocalValue("");
		onChange("");
		onSearch("");
	};

	return (
		<div className="relative">
			<div className="relative">
				{/* Search icon */}
				<div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
					<svg
						className="h-5 w-5 text-slate-400"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
						aria-hidden="true"
					>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth={2}
							d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
						/>
					</svg>
				</div>

				{/* Search input */}
				<input
					type="text"
					value={localValue}
					onChange={(e) => setLocalValue(e.target.value)}
					placeholder={placeholder}
					className="block w-full pl-10 pr-20 py-2 border border-slate-300 rounded-md leading-5 bg-white placeholder-slate-500 focus:outline-none focus:placeholder-slate-400 focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500 sm:text-sm"
					aria-label="Search content"
				/>

				{/* Loading indicator and clear button */}
				<div className="absolute inset-y-0 right-0 flex items-center pr-3">
					{isLoading && (
						<svg
							className="animate-spin h-5 w-5 text-slate-400 mr-2"
							fill="none"
							viewBox="0 0 24 24"
							aria-hidden="true"
						>
							<circle
								className="opacity-25"
								cx="12"
								cy="12"
								r="10"
								stroke="currentColor"
								strokeWidth="4"
							/>
							<path
								className="opacity-75"
								fill="currentColor"
								d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
							/>
						</svg>
					)}
					{localValue && (
						<button
							type="button"
							onClick={handleClear}
							className="text-slate-400 hover:text-slate-500 focus:outline-none"
							aria-label="Clear search"
						>
							<svg
								className="h-5 w-5"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M6 18L18 6M6 6l12 12"
								/>
							</svg>
						</button>
					)}
				</div>
			</div>
		</div>
	);
}
