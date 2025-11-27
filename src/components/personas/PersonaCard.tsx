import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Doc } from "../../../convex/_generated/dataModel";
import { ConfirmDialog } from "../shared/ConfirmDialog";

export interface PersonaCardProps {
	persona: Doc<"personas">;
	onEdit: () => void;
	onDelete: () => void;
}

/**
 * Card displaying a single persona with name, description, and file count.
 */
export function PersonaCard({ persona, onEdit, onDelete }: PersonaCardProps) {
	const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

	// Fetch files for this persona to show count
	const files = useQuery(api.personas.getPersonaFiles, {
		personaId: persona._id,
	});

	const fileCount = files?.length ?? 0;

	const handleDeleteConfirm = () => {
		onDelete();
		setShowDeleteConfirm(false);
	};

	return (
		<>
			<div className="bg-white border border-gray-200 rounded-lg p-6 hover:border-gray-300 transition-colors">
				<div className="flex items-start justify-between gap-4">
					<div className="flex-1 min-w-0">
						<h3 className="text-lg font-semibold text-gray-900 mb-2">{persona.name}</h3>

						{persona.description && (
							<p className="text-sm text-gray-600 mb-4 line-clamp-3">{persona.description}</p>
						)}

						<div className="flex items-center gap-4 text-xs text-gray-500">
							<div className="flex items-center gap-1">
								<svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={2}
										d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
									/>
								</svg>
								<span>
									{fileCount} {fileCount === 1 ? "file" : "files"}
								</span>
							</div>

							<div className="flex items-center gap-1">
								<svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={2}
										d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
									/>
								</svg>
								<span>Updated {new Date(persona.updatedAt).toLocaleDateString()}</span>
							</div>
						</div>
					</div>

					<div className="flex items-center gap-2">
						<button
							type="button"
							onClick={onEdit}
							className="p-2 text-gray-400 hover:text-cyan-600 hover:bg-cyan-50 rounded transition-colors"
							title="Edit persona"
							aria-label={`Edit ${persona.name}`}
						>
							<svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
								/>
							</svg>
						</button>

						<button
							type="button"
							onClick={() => setShowDeleteConfirm(true)}
							className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
							title="Delete persona"
							aria-label={`Delete ${persona.name}`}
						>
							<svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
								/>
							</svg>
						</button>
					</div>
				</div>
			</div>

			<ConfirmDialog
				isOpen={showDeleteConfirm}
				onClose={() => setShowDeleteConfirm(false)}
				onConfirm={handleDeleteConfirm}
				title="Delete Persona"
				message={`Are you sure you want to delete "${persona.name}"? This action cannot be undone.`}
				confirmLabel="Delete"
				confirmVariant="danger"
			/>
		</>
	);
}
