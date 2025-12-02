/**
 * Reusable loading skeleton component for displaying loading states.
 * Supports different variants for grids, lists, and custom layouts.
 */
export interface LoadingStateProps {
	message?: string;
	variant?: "grid" | "list" | "card";
	count?: number;
}

export function LoadingState({ message, variant = "card", count = 1 }: LoadingStateProps) {
	if (variant === "grid") {
		return (
			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
				{Array.from({ length: count }).map((_, i) => (
					<div
						key={i}
						data-loading="true"
						className="bg-white shadow-md rounded-lg p-6 animate-pulse"
					>
						<div className="h-6 bg-slate-200 rounded w-3/4 mb-4" />
						<div className="h-4 bg-slate-200 rounded w-full mb-2" />
						<div className="h-4 bg-slate-200 rounded w-5/6 mb-4" />
						<div className="flex gap-4 mt-4">
							<div className="h-4 bg-slate-200 rounded w-16" />
							<div className="h-4 bg-slate-200 rounded w-16" />
							<div className="h-4 bg-slate-200 rounded w-16" />
						</div>
					</div>
				))}
			</div>
		);
	}

	if (variant === "list") {
		return (
			<div className="space-y-4">
				{Array.from({ length: count }).map((_, i) => (
					<div
						key={i}
						data-loading="true"
						className="bg-white shadow-md rounded-lg p-6 animate-pulse"
					>
						<div className="flex items-center gap-4">
							<div className="h-12 w-12 bg-slate-200 rounded" />
							<div className="flex-1">
								<div className="h-5 bg-slate-200 rounded w-1/3 mb-2" />
								<div className="h-4 bg-slate-200 rounded w-2/3" />
							</div>
						</div>
					</div>
				))}
			</div>
		);
	}

	// Default card variant
	return (
		<div className="flex flex-col items-center justify-center py-12">
			<div
				data-loading="true"
				className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-600"
				aria-label="Loading"
			/>
			{message && (
				<p className="mt-4 text-slate-600 text-sm">{message}</p>
			)}
		</div>
	);
}
