import type { Doc } from "../../../convex/_generated/dataModel";
import { EmptyState } from "../shared/EmptyState";
import { KnowledgeBaseItemCard } from "./KnowledgeBaseItemCard";

export interface KnowledgeBaseListProps {
	items: Doc<"knowledgeBaseItems">[];
	onEdit?: (item: Doc<"knowledgeBaseItems">) => void;
	onDelete?: (item: Doc<"knowledgeBaseItems">) => void;
}

/**
 * List component for displaying knowledge base items.
 * Shows an empty state when no items exist, otherwise displays items in a list.
 */
export function KnowledgeBaseList({ items, onEdit, onDelete }: KnowledgeBaseListProps) {
	if (items.length === 0) {
		return (
			<EmptyState
				title="No knowledge base items"
				description="Add reference materials, documentation, and resources. You can also upload files after creating items."
				icon={
					<svg className="w-16 h-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<title>Book</title>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth={1.5}
							d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
						/>
					</svg>
				}
			/>
		);
	}

	return (
		<div className="space-y-4">
			{items.map((item) => (
				<KnowledgeBaseItemCard
					key={item._id}
					item={item}
					onEdit={onEdit}
					onDelete={onDelete}
				/>
			))}
		</div>
	);
}
