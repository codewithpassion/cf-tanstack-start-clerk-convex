import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/api";
import type { Id, Doc } from "@/convex/dataModel";
import { Modal } from "@/components/shared/Modal";
import { PersonaList } from "./PersonaList";
import { PersonaForm } from "./PersonaForm";
import { LoadingState } from "../shared/LoadingState";

export interface PersonasModalProps {
	isOpen: boolean;
	onClose: () => void;
	projectId: string;
}

export function PersonasModal({ isOpen, onClose, projectId }: PersonasModalProps) {
	const [isCreating, setIsCreating] = useState(false);
	const [editingPersona, setEditingPersona] = useState<Doc<"personas"> | null>(null);

	const personas = useQuery(api.personas.listPersonas, {
		projectId: projectId as Id<"projects">,
	});
	const deletePersona = useMutation(api.personas.deletePersona);

	const handleDelete = async (personaId: Id<"personas">) => {
		if (confirm("Are you sure you want to delete this persona?")) {
			await deletePersona({ personaId });
		}
	};

	// Show form if creating or editing
	if (isCreating || editingPersona) {
		return (
			<Modal
				isOpen={isOpen}
				onClose={onClose}
				title={editingPersona ? "Edit Persona" : "Create Persona"}
				size="2xl"
			>
				<PersonaForm
					projectId={projectId}
					persona={editingPersona ?? undefined}
					onSuccess={() => {
						setIsCreating(false);
						setEditingPersona(null);
					}}
					onCancel={() => {
						setIsCreating(false);
						setEditingPersona(null);
					}}
				/>
			</Modal>
		);
	}

	// Show list view
	return (
		<Modal isOpen={isOpen} onClose={onClose} title="Personas" size="3xl">
			<div className="space-y-4">
				<div className="flex justify-between items-center">
					<p className="text-sm text-slate-600 dark:text-slate-400">
						Define target audience personas to tailor your content effectively.
					</p>
					<button
						type="button"
						onClick={() => setIsCreating(true)}
						className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-cyan-600 hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500 transition-colors"
					>
						Create Persona
					</button>
				</div>

				{personas === undefined ? (
					<LoadingState message="Loading personas..." />
				) : (
					<PersonaList
						personas={personas ?? []}
						onCreate={() => setIsCreating(true)}
						onEdit={setEditingPersona}
						onDelete={handleDelete}
					/>
				)}
			</div>
		</Modal>
	);
}
