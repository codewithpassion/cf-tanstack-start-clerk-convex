import type { Doc } from "../../../convex/_generated/dataModel";
import { EmptyState } from "../shared/EmptyState";
import { ExampleCard } from "./ExampleCard";

export interface ExamplesListProps {
	examples: Doc<"examples">[];
	onEdit?: (example: Doc<"examples">) => void;
	onDelete?: (example: Doc<"examples">) => void;
}

/**
 * List component for displaying examples.
 * Shows an empty state when no examples exist, otherwise displays examples in a grid.
 */
export function ExamplesList({ examples, onEdit, onDelete }: ExamplesListProps) {
	if (examples.length === 0) {
		return (
			<EmptyState
				title="No examples"
				description="Add successful content samples to guide the style and quality of future content."
				icon={
					<svg className="w-16 h-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<title>Document</title>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth={1.5}
							d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
						/>
					</svg>
				}
			/>
		);
	}

	return (
		<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
			{examples.map((example) => (
				<ExampleCard
					key={example._id}
					example={example}
					onEdit={onEdit}
					onDelete={onDelete}
				/>
			))}
		</div>
	);
}
