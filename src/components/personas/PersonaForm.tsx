import { useState, type FormEvent } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Doc, Id } from "../../../convex/_generated/dataModel";
import { FileUpload } from "../shared/FileUpload";
import { FileList } from "../shared/FileList";

export interface PersonaFormProps {
	projectId: string;
	persona?: Doc<"personas">;
	onSuccess: () => void;
	onCancel: () => void;
}

/**
 * Form for creating or editing a persona with text input and file upload.
 */
export function PersonaForm({ projectId, persona, onSuccess, onCancel }: PersonaFormProps) {
	const [name, setName] = useState(persona?.name ?? "");
	const [description, setDescription] = useState(persona?.description ?? "");
	const [error, setError] = useState<string | null>(null);
	const [isSubmitting, setIsSubmitting] = useState(false);

	const createPersona = useMutation(api.personas.createPersona);
	const updatePersona = useMutation(api.personas.updatePersona);
	const deleteFile = useMutation(api.files.deleteFile);

	// Fetch files if editing existing persona
	const files = useQuery(
		api.personas.getPersonaFiles,
		persona ? { personaId: persona._id } : "skip"
	);

	const handleSubmit = async (e: FormEvent) => {
		e.preventDefault();
		setError(null);

		const trimmedName = name.trim();
		if (!trimmedName) {
			setError("Name is required");
			return;
		}

		if (trimmedName.length > 100) {
			setError("Name must be 100 characters or less");
			return;
		}

		if (description && description.length > 2000) {
			setError("Description must be 2000 characters or less");
			return;
		}

		setIsSubmitting(true);

		try {
			if (persona) {
				// Update existing persona
				await updatePersona({
					personaId: persona._id,
					name: trimmedName,
					description: description || undefined,
				});
			} else {
				// Create new persona
				await createPersona({
					projectId: projectId as Id<"projects">,
					name: trimmedName,
					description: description || undefined,
				});
			}

			onSuccess();
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to save persona");
			console.error("Persona save error:", err);
		} finally {
			setIsSubmitting(false);
		}
	};

	const handleFileUploadComplete = (fileId: Id<"files">) => {
		// File was uploaded successfully, it will appear in the files list
		console.log("File uploaded:", fileId);
	};

	const handleFileDelete = async (fileId: Id<"files">) => {
		try {
			await deleteFile({ fileId });
		} catch (err) {
			console.error("File delete error:", err);
			setError(err instanceof Error ? err.message : "Failed to delete file");
		}
	};

	return (
		<form onSubmit={handleSubmit} className="space-y-6">
			<div>
				<label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
					Name <span className="text-red-500">*</span>
				</label>
				<input
					type="text"
					id="name"
					value={name}
					onChange={(e) => setName(e.target.value)}
					className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-cyan-500 focus:border-cyan-500"
					placeholder="e.g., Marketing Manager Persona"
					maxLength={100}
					required
				/>
				<p className="text-xs text-gray-500 mt-1">{name.length}/100 characters</p>
			</div>

			<div>
				<label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
					Description
				</label>
				<textarea
					id="description"
					value={description}
					onChange={(e) => setDescription(e.target.value)}
					rows={4}
					className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-cyan-500 focus:border-cyan-500"
					placeholder="Describe your target persona: demographics, pain points, goals, preferences..."
					maxLength={2000}
				/>
				<p className="text-xs text-gray-500 mt-1">{description.length}/2000 characters</p>
			</div>

			{persona && (
				<div>
					<label className="block text-sm font-medium text-gray-700 mb-2">Upload Files</label>
					<FileUpload
						onUploadComplete={handleFileUploadComplete}
						ownerType="persona"
						ownerId={persona._id}
						multiple={true}
					/>

					{files && files.length > 0 && (
						<div className="mt-4">
							<h4 className="text-sm font-medium text-gray-700 mb-2">Attached Files</h4>
							<FileList files={files} onDelete={handleFileDelete} />
						</div>
					)}
				</div>
			)}

			{!persona && (
				<div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
					<p className="text-sm text-blue-800">
						<strong>Tip:</strong> After creating this persona, you'll be able to upload audience
						research, persona documents, or other reference materials.
					</p>
				</div>
			)}

			{error && (
				<div className="bg-red-50 border border-red-200 rounded-lg p-4">
					<p className="text-sm text-red-800">{error}</p>
				</div>
			)}

			<div className="flex items-center justify-end gap-3 pt-4 border-t">
				<button
					type="button"
					onClick={onCancel}
					className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500"
					disabled={isSubmitting}
				>
					Cancel
				</button>

				<button
					type="submit"
					className="px-4 py-2 text-sm font-medium text-white bg-cyan-600 border border-transparent rounded-md hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed"
					disabled={isSubmitting}
				>
					{isSubmitting ? "Saving..." : persona ? "Save Changes" : "Create Persona"}
				</button>
			</div>
		</form>
	);
}
