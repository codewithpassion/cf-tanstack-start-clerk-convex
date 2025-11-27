import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { CategoryCard } from "./CategoryCard";
import type { Category } from "@/types/entities";

export interface SortableCategoryCardProps {
	category: Category;
	onEdit: (category: Category) => void;
	onDelete: (category: Category) => void;
}

/**
 * Wrapper component that makes CategoryCard draggable and sortable.
 * Handles drag-and-drop functionality using @dnd-kit.
 */
export function SortableCategoryCard({ category, onEdit, onDelete }: SortableCategoryCardProps) {
	const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
		id: category._id,
	});

	const style = {
		transform: CSS.Transform.toString(transform),
		transition,
	};

	return (
		<div ref={setNodeRef} style={style} {...attributes} {...listeners}>
			<div className="cursor-move">
				<CategoryCard
					category={category}
					onEdit={onEdit}
					onDelete={onDelete}
					isDragging={isDragging}
				/>
			</div>
		</div>
	);
}
