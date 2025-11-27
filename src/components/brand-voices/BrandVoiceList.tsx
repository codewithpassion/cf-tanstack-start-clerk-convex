
import type { Doc, Id } from "../../../convex/_generated/dataModel";
import { BrandVoiceCard } from "./BrandVoiceCard";
import { EmptyState } from "../shared/EmptyState";

export interface BrandVoiceListProps {
	brandVoices: Doc<"brandVoices">[];
	onEdit: (brandVoice: Doc<"brandVoices">) => void;
	onDelete: (brandVoiceId: Id<"brandVoices">) => void;
	onCreate: () => void;
}

/**
 * List view of brand voices with create, edit, and delete actions.
 */
export function BrandVoiceList({ brandVoices, onEdit, onDelete, onCreate }: BrandVoiceListProps) {
	if (brandVoices.length === 0) {
		return (
			<EmptyState
				title="No brand voices yet"
				description="Create a brand voice to define the tone and style for your content. You can upload brand guidelines or describe your voice directly."
				actionLabel="Create Brand Voice"
				onAction={onCreate}
				icon={
					<svg className="h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth={1.5}
							d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
						/>
					</svg>
				}
			/>
		);
	}

	return (
		<div className="space-y-4">
			{brandVoices.map((brandVoice) => (
				<BrandVoiceCard
					key={brandVoice._id}
					brandVoice={brandVoice}
					onEdit={() => onEdit(brandVoice)}
					onDelete={() => onDelete(brandVoice._id)}
				/>
			))}
		</div>
	);
}
