import { formatDistanceToNow } from "date-fns";

export interface SearchResult {
	_id: string;
	title: string;
	snippet: string;
	categoryName: string | null;
	projectName: string | null;
	projectId: string;
	status: "draft" | "finalized";
	updatedAt: number;
}

export interface SearchResultsProps {
	results: SearchResult[];
	query: string;
	isLoading: boolean;
	onResultClick: (contentPieceId: string, projectId: string) => void;
	showProjectName?: boolean;
}

/**
 * Search results dropdown component.
 * Displays matching content pieces with highlighted search terms and context snippets.
 */
export function SearchResults({
	results,
	query,
	isLoading,
	onResultClick,
	showProjectName = false,
}: SearchResultsProps) {
	/**
	 * Highlight matching text in a string.
	 * Wraps matched terms in a <mark> element.
	 */
	const highlightMatch = (text: string, searchQuery: string): React.ReactNode => {
		if (!searchQuery.trim()) {
			return text;
		}

		const lowerText = text.toLowerCase();
		const lowerQuery = searchQuery.toLowerCase();
		const index = lowerText.indexOf(lowerQuery);

		if (index === -1) {
			return text;
		}

		const before = text.substring(0, index);
		const match = text.substring(index, index + searchQuery.length);
		const after = text.substring(index + searchQuery.length);

		return (
			<>
				{before}
				<mark className="bg-yellow-200 font-semibold">{match}</mark>
				{highlightMatch(after, searchQuery)}
			</>
		);
	};

	const StatusBadge = ({ status }: { status: "draft" | "finalized" }) => {
		const isDraft = status === "draft";
		return (
			<span
				className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
					isDraft
						? "bg-yellow-100 text-yellow-800"
						: "bg-green-100 text-green-800"
				}`}
			>
				{isDraft ? "Draft" : "Finalized"}
			</span>
		);
	};

	if (isLoading) {
		return (
			<div className="absolute z-10 mt-2 w-full bg-white rounded-md shadow-lg border border-gray-200">
				<div className="p-4 text-center">
					<div className="inline-flex items-center text-sm text-gray-500">
						<svg
							className="animate-spin h-5 w-5 mr-2 text-cyan-600"
							fill="none"
							viewBox="0 0 24 24"
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
						Searching...
					</div>
				</div>
			</div>
		);
	}

	if (!query.trim()) {
		return null;
	}

	if (results.length === 0) {
		return (
			<div className="absolute z-10 mt-2 w-full bg-white rounded-md shadow-lg border border-gray-200">
				<div className="p-4 text-center text-sm text-gray-500">
					No results found for "{query}"
				</div>
			</div>
		);
	}

	return (
		<div className="absolute z-10 mt-2 w-full bg-white rounded-md shadow-lg border border-gray-200 max-h-96 overflow-y-auto">
			<div className="py-2">
				{results.map((result) => (
					<button
						key={result._id}
						type="button"
						onClick={() => onResultClick(result._id, result.projectId)}
						className="w-full text-left px-4 py-3 hover:bg-gray-50 focus:outline-none focus:bg-gray-50 border-b border-gray-100 last:border-b-0"
					>
						<div className="flex items-start justify-between">
							<div className="flex-1 min-w-0">
								{/* Title with highlighting */}
								<div className="text-sm font-medium text-gray-900 mb-1">
									{highlightMatch(result.title, query)}
								</div>

								{/* Snippet with highlighting */}
								<div className="text-sm text-gray-600 mb-2 line-clamp-2">
									{highlightMatch(result.snippet, query)}
								</div>

								{/* Metadata */}
								<div className="flex items-center gap-2 text-xs text-gray-500">
									{result.categoryName && (
										<span className="inline-flex items-center px-2 py-0.5 rounded bg-gray-100 text-gray-700">
											{result.categoryName}
										</span>
									)}
									{showProjectName && result.projectName && (
										<span className="inline-flex items-center px-2 py-0.5 rounded bg-blue-100 text-blue-700">
											{result.projectName}
										</span>
									)}
									<StatusBadge status={result.status} />
									<span>
										Updated {formatDistanceToNow(new Date(result.updatedAt), { addSuffix: true })}
									</span>
								</div>
							</div>

							{/* Arrow icon */}
							<div className="ml-3 flex-shrink-0">
								<svg
									className="h-5 w-5 text-gray-400"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={2}
										d="M9 5l7 7-7 7"
									/>
								</svg>
							</div>
						</div>
					</button>
				))}
			</div>
		</div>
	);
}
