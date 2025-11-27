import type { Doc, Id } from "../../../convex/_generated/dataModel";
import { PersonaCard } from "./PersonaCard";
import { EmptyState } from "../shared/EmptyState";

export interface PersonaListProps {
	personas: Doc<"personas">[];
	onEdit: (persona: Doc<"personas">) => void;
	onDelete: (personaId: Id<"personas">) => void;
	onCreate: () => void;
}

/**
 * List view of personas with create, edit, and delete actions.
 */
export function PersonaList({ personas, onEdit, onDelete, onCreate }: PersonaListProps) {
	if (personas.length === 0) {
		return (
			<EmptyState
				title="No personas yet"
				description="Create personas to define your target audiences. Upload audience research or describe your personas directly."
				actionLabel="Create Persona"
				onAction={onCreate}
				icon={
					<svg className="h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth={1.5}
							d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
						/>
					</svg>
				}
			/>
		);
	}

	return (
		<div className="space-y-4">
			{personas.map((persona) => (
				<PersonaCard
					key={persona._id}
					persona={persona}
					onEdit={() => onEdit(persona)}
					onDelete={() => onDelete(persona._id)}
				/>
			))}
		</div>
	);
}
