import type { ContentPiece } from "@/types/entities";
import { formatDistanceToNow } from "date-fns";

export interface ContentCardProps {
	contentPiece: ContentPiece & {
		category: { name: string } | null;
		persona: { name: string } | null;
		brandVoice: { name: string } | null;
	};
	onClick: (contentPieceId: string) => void;
	isSelected?: boolean;
	onSelect?: (contentPieceId: string, selected: boolean) => void;
}

/**
 * Card variant for displaying content pieces in the archive view.
 * Shows title, category badge, status badge, timestamps, and quick actions.
 */
export function ContentCard({
	contentPiece,
	onClick,
	isSelected = false,
	onSelect,
}: ContentCardProps) {
	const handleCardClick = () => {
		onClick(contentPiece._id);
	};

	const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		e.stopPropagation();
		if (onSelect) {
			onSelect(contentPiece._id, e.target.checked);
		}
	};

	const StatusBadge = ({ status }: { status: "draft" | "finalized" }) => {
		const isDraft = status === "draft";
		return (
			<span
				className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
					isDraft
						? "bg-yellow-100 text-yellow-800"
						: "bg-green-100 text-green-800"
				}`}
			>
				{isDraft ? "Draft" : "Finalized"}
			</span>
		);
	};

	const CategoryBadge = ({ name }: { name: string }) => (
		<span className="inline-flex rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-800">
			{name}
		</span>
	);

	return (
		<article
			className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow cursor-pointer relative"
			onClick={handleCardClick}
		>
			{onSelect && (
				<div className="absolute top-4 left-4">
					<input
						type="checkbox"
						checked={isSelected}
						onChange={handleCheckboxChange}
						onClick={(e) => e.stopPropagation()}
						className="h-4 w-4 rounded border-gray-300 text-cyan-600 focus:ring-cyan-500"
						aria-label={`Select ${contentPiece.title}`}
					/>
				</div>
			)}

			<div className={onSelect ? "ml-8" : ""}>
				{/* Title and Status */}
				<div className="flex items-start justify-between gap-2 mb-2">
					<h3 className="text-lg font-semibold text-gray-900 line-clamp-2">
						{contentPiece.title}
					</h3>
					<StatusBadge status={contentPiece.status} />
				</div>

				{/* Category and Metadata */}
				<div className="flex flex-wrap items-center gap-2 mb-3">
					{contentPiece.category && (
						<CategoryBadge name={contentPiece.category.name} />
					)}
					{contentPiece.persona && (
						<span className="text-xs text-gray-500">
							{contentPiece.persona.name}
						</span>
					)}
					{contentPiece.brandVoice && (
						<span className="text-xs text-gray-500">
							{contentPiece.brandVoice.name}
						</span>
					)}
				</div>

				{/* Timestamps */}
				<div className="text-xs text-gray-500 space-y-1">
					<div>
						<span className="font-medium">Created:</span>{" "}
						{formatDistanceToNow(new Date(contentPiece.createdAt), {
							addSuffix: true,
						})}
					</div>
					<div>
						<span className="font-medium">Updated:</span>{" "}
						{formatDistanceToNow(new Date(contentPiece.updatedAt), {
							addSuffix: true,
						})}
					</div>
				</div>

				{/* Finalized Version Info */}
				{contentPiece.status === "finalized" &&
					contentPiece.currentFinalizedVersion && (
						<div className="mt-3 pt-3 border-t border-gray-100">
							<span className="text-xs font-medium text-gray-700">
								Version: v{contentPiece.currentFinalizedVersion}
							</span>
						</div>
					)}
			</div>
		</article>
	);
}
