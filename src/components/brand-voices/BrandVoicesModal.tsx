import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/api";
import type { Id, Doc } from "@/convex/dataModel";
import { Modal } from "@/components/shared/Modal";
import { BrandVoiceList } from "./BrandVoiceList";
import { BrandVoiceForm } from "./BrandVoiceForm";
import { LoadingState } from "../shared/LoadingState";

export interface BrandVoicesModalProps {
	isOpen: boolean;
	onClose: () => void;
	projectId: string;
}

export function BrandVoicesModal({ isOpen, onClose, projectId }: BrandVoicesModalProps) {
	const [isCreating, setIsCreating] = useState(false);
	const [editingBrandVoice, setEditingBrandVoice] = useState<Doc<"brandVoices"> | null>(null);

	const brandVoices = useQuery(api.brandVoices.listBrandVoices, {
		projectId: projectId as Id<"projects">,
	});
	const deleteBrandVoice = useMutation(api.brandVoices.deleteBrandVoice);

	const handleDelete = async (brandVoiceId: Id<"brandVoices">) => {
		if (confirm("Are you sure you want to delete this brand voice?")) {
			await deleteBrandVoice({ brandVoiceId });
		}
	};

	// Show form if creating or editing
	if (isCreating || editingBrandVoice) {
		return (
			<Modal
				isOpen={isOpen}
				onClose={onClose}
				title={editingBrandVoice ? "Edit Brand Voice" : "Create Brand Voice"}
				size="2xl"
			>
				<BrandVoiceForm
					projectId={projectId}
					brandVoice={editingBrandVoice ?? undefined}
					onSuccess={() => {
						setIsCreating(false);
						setEditingBrandVoice(null);
					}}
					onCancel={() => {
						setIsCreating(false);
						setEditingBrandVoice(null);
					}}
				/>
			</Modal>
		);
	}

	// Show list view
	return (
		<Modal isOpen={isOpen} onClose={onClose} title="Brand Voices" size="3xl">
			<div className="space-y-4">
				<div className="flex justify-between items-center">
					<p className="text-sm text-slate-600 dark:text-slate-400">
						Define your brand's unique voice and tone to ensure consistent messaging.
					</p>
					<button
						type="button"
						onClick={() => setIsCreating(true)}
						className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-cyan-600 hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500 transition-colors"
					>
						Create Brand Voice
					</button>
				</div>

				{brandVoices === undefined ? (
					<LoadingState message="Loading brand voices..." />
				) : (
					<BrandVoiceList
						brandVoices={brandVoices ?? []}
						onCreate={() => setIsCreating(true)}
						onEdit={setEditingBrandVoice}
						onDelete={handleDelete}
					/>
				)}
			</div>
		</Modal>
	);
}
