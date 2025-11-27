import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/api";
import type { Doc, Id } from "@/convex/dataModel";
import { PageHeader } from "@/components/shared/PageHeader";
import { LoadingState } from "@/components/shared/LoadingState";
import { BrandVoiceList } from "@/components/brand-voices/BrandVoiceList";
import { BrandVoiceForm } from "@/components/brand-voices/BrandVoiceForm";

export const Route = createFileRoute("/_authed/projects/$projectId/brand-voices")({
	component: BrandVoicesPage,
});

function BrandVoicesPage() {
	const { projectId } = Route.useParams();
	const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
	const [editingBrandVoice, setEditingBrandVoice] = useState<Doc<"brandVoices"> | null>(null);

	const brandVoices = useQuery(api.brandVoices.listBrandVoices, {
		projectId: projectId as Id<"projects">,
	});
	const deleteBrandVoice = useMutation(api.brandVoices.deleteBrandVoice);

	const handleCreate = () => {
		setEditingBrandVoice(null);
		setIsCreateModalOpen(true);
	};

	const handleEdit = (brandVoice: Doc<"brandVoices">) => {
		setEditingBrandVoice(brandVoice);
		setIsCreateModalOpen(true);
	};

	const handleDelete = async (brandVoiceId: Id<"brandVoices">) => {
		try {
			await deleteBrandVoice({ brandVoiceId });
		} catch (error) {
			console.error("Failed to delete brand voice:", error);
		}
	};

	const handleFormSuccess = () => {
		setIsCreateModalOpen(false);
		setEditingBrandVoice(null);
	};

	const handleFormCancel = () => {
		setIsCreateModalOpen(false);
		setEditingBrandVoice(null);
	};

	if (brandVoices === undefined) {
		return <LoadingState message="Loading brand voices..." />;
	}

	return (
		<div>
			<PageHeader
				title="Brand Voices"
				description="Define your brand's unique voice and tone to ensure consistent messaging across all content."
				action={
					<button
						type="button"
						onClick={handleCreate}
						className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-cyan-600 hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500 transition-colors"
					>
						<svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
						</svg>
						Create Brand Voice
					</button>
				}
			/>

			<BrandVoiceList
				brandVoices={brandVoices}
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
							className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
							aria-hidden="true"
							onClick={handleFormCancel}
						/>

						{/* Modal panel */}
						<div className="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-2xl">
							<div className="bg-white px-6 pb-6 pt-5">
								<h3 className="text-lg font-semibold leading-6 text-gray-900 mb-4">
									{editingBrandVoice ? "Edit Brand Voice" : "Create Brand Voice"}
								</h3>

								<BrandVoiceForm
									projectId={projectId}
									brandVoice={editingBrandVoice ?? undefined}
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
