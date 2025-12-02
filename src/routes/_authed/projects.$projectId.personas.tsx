import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/api";
import type { Doc, Id } from "@/convex/dataModel";
import { PageHeader } from "@/components/shared/PageHeader";
import { LoadingState } from "@/components/shared/LoadingState";
import { PersonaList } from "@/components/personas/PersonaList";
import { PersonaForm } from "@/components/personas/PersonaForm";

export const Route = createFileRoute("/_authed/projects/$projectId/personas")({
	component: PersonasPage,
});

function PersonasPage() {
	const { projectId } = Route.useParams();
	const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
	const [editingPersona, setEditingPersona] = useState<Doc<"personas"> | null>(null);

	const personas = useQuery(api.personas.listPersonas, {
		projectId: projectId as Id<"projects">,
	});
	const deletePersona = useMutation(api.personas.deletePersona);

	const handleCreate = () => {
		setEditingPersona(null);
		setIsCreateModalOpen(true);
	};

	const handleEdit = (persona: Doc<"personas">) => {
		setEditingPersona(persona);
		setIsCreateModalOpen(true);
	};

	const handleDelete = async (personaId: Id<"personas">) => {
		try {
			await deletePersona({ personaId });
		} catch (error) {
			console.error("Failed to delete persona:", error);
		}
	};

	const handleFormSuccess = () => {
		setIsCreateModalOpen(false);
		setEditingPersona(null);
	};

	const handleFormCancel = () => {
		setIsCreateModalOpen(false);
		setEditingPersona(null);
	};

	if (personas === undefined) {
		return <LoadingState message="Loading personas..." />;
	}

	return (
		<div>
			<PageHeader
				title="Personas"
				description="Define your target audience personas to create content that resonates with specific reader segments."
				action={
					<button
						type="button"
						onClick={handleCreate}
						className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-cyan-600 hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500 transition-colors"
					>
						<svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
						</svg>
						Create Persona
					</button>
				}
			/>

			<PersonaList
				personas={personas}
				onCreate={handleCreate}
				onEdit={handleEdit}
				onDelete={handleDelete}
			/>

			{/* Modal for create/edit */}
			{isCreateModalOpen && (
				<div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
					<div className="flex min-h-screen items-center justify-center p-4 text-center sm:p-0">
						{/* Background overlay */}
						<div
							className="fixed inset-0 bg-slate-500 dark:bg-slate-900 bg-opacity-75 dark:bg-opacity-85 transition-opacity"
							aria-hidden="true"
							onClick={handleFormCancel}
						/>

						{/* Modal panel */}
						<div className="relative transform overflow-hidden rounded-lg bg-white dark:bg-slate-900 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-2xl">
							<div className="bg-white dark:bg-slate-900 px-6 pb-6 pt-5">
								<h3 className="text-lg font-semibold leading-6 text-slate-900 dark:text-white mb-4">
									{editingPersona ? "Edit Persona" : "Create Persona"}
								</h3>

								<PersonaForm
									projectId={projectId}
									persona={editingPersona ?? undefined}
									onSuccess={handleFormSuccess}
									onCancel={handleFormCancel}
								/>
							</div>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
