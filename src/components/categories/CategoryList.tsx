import { useState } from "react";
import {
	DndContext,
	closestCenter,
	KeyboardSensor,
	PointerSensor,
	useSensor,
	useSensors,
	type DragEndEvent,
} from "@dnd-kit/core";
import {
	arrayMove,
	SortableContext,
	sortableKeyboardCoordinates,
	verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { SortableCategoryCard } from "./SortableCategoryCard";
import type { Category } from "@/types/entities";

export interface CategoryListProps {
	categories: Category[];
	onReorder: (categoryIds: string[]) => void;
	onEdit: (category: Category) => void;
	onDelete: (category: Category) => void;
}

/**
 * Category list component with drag-and-drop reordering.
 * Displays categories in sortable grid with edit/delete actions.
 */
export function CategoryList({ categories, onReorder, onEdit, onDelete }: CategoryListProps) {
	const [items, setItems] = useState(categories);

	// Update items when categories prop changes
	if (categories !== items) {
		setItems(categories);
	}

	const sensors = useSensors(
		useSensor(PointerSensor, {
			activationConstraint: {
				distance: 8, // Require 8px movement before drag starts
			},
		}),
		useSensor(KeyboardSensor, {
			coordinateGetter: sortableKeyboardCoordinates,
		})
	);

	const handleDragEnd = (event: DragEndEvent) => {
		const { active, over } = event;

		if (over && active.id !== over.id) {
			const oldIndex = items.findIndex((item) => item._id === active.id);
			const newIndex = items.findIndex((item) => item._id === over.id);

			const newItems = arrayMove(items, oldIndex, newIndex);
			setItems(newItems);

			// Call onReorder with the new order of category IDs
			onReorder(newItems.map((item) => item._id));
		}
	};

	if (categories.length === 0) {
		return (
			<div className="text-center py-12 text-slate-500">
				<p>No categories found. Default categories are created when you create a project.</p>
			</div>
		);
	}

	return (
		<DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
			<SortableContext items={items.map((c) => c._id)} strategy={verticalListSortingStrategy}>
				<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
					{items.map((category) => (
						<SortableCategoryCard
							key={category._id}
							category={category}
							onEdit={onEdit}
							onDelete={onDelete}
						/>
					))}
				</div>
			</SortableContext>
		</DndContext>
	);
}
