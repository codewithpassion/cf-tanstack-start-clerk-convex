import type { ContentPiece } from "@/types/entities";
import { formatDistanceToNow } from "date-fns";
import { GitFork, ArrowRight } from "lucide-react";

export interface ContentCardProps {
	contentPiece: ContentPiece & {
		category: { name: string } | null;
		persona: { name: string } | null;
		brandVoice: { name: string } | null;
		parentContent?: { _id: string; title: string } | null;
		derivedCount?: number;
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
				className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${isDraft
						? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200"
						: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200"
					}`}
			>
				{isDraft ? "Draft" : "Finalized"}
			</span>
		);
	};

	const CategoryBadge = ({ name }: { name: string }) => (
		<span className="inline-flex rounded-full bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300 px-2 py-1 text-xs font-medium">
			{name}
		</span>
	);

	return (
		<article
			className="bg-gradient-to-br from-white via-slate-50/50 to-white dark:from-slate-900 dark:via-slate-900 dark:to-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-800 border-l-2 dark:border-l-slate-800 p-4 hover:shadow-lg hover:border-l-amber-400 dark:hover:border-l-amber-400 dark:hover:shadow-[0_8px_30px_rgba(0,0,0,0.3),0_0_30px_rgba(251,191,36,0.1)] transition-all duration-300 cursor-pointer relative"
			onClick={handleCardClick}
		>
			{onSelect && (
				<div className="absolute top-4 left-4">
					<input
						type="checkbox"
						checked={isSelected}
						onChange={handleCheckboxChange}
						onClick={(e) => e.stopPropagation()}
						className="h-4 w-4 rounded border-slate-300 dark:border-slate-600 text-cyan-600 focus:ring-cyan-500 dark:bg-slate-800"
						aria-label={`Select ${contentPiece.title}`}
					/>
				</div>
			)}

			<div className={onSelect ? "ml-8" : ""}>
				{/* Title and Status */}
				<div className="flex items-start justify-between gap-2 mb-2">
					<h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 line-clamp-2">
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
						<span className="text-xs text-slate-500 dark:text-slate-400">
							{contentPiece.persona.name}
						</span>
					)}
					{contentPiece.brandVoice && (
						<span className="text-xs text-slate-500 dark:text-slate-400">
							{contentPiece.brandVoice.name}
						</span>
					)}
				</div>

				{/* Repurpose relationship indicators */}
				{(contentPiece.parentContent ||
					(contentPiece.derivedCount && contentPiece.derivedCount > 0)) && (
						<div className="flex flex-wrap items-center gap-2 mb-3">
							{contentPiece.parentContent && (
								<button
									type="button"
									onClick={(e) => {
										e.stopPropagation();
										onClick(contentPiece.parentContent!._id);
									}}
									className="inline-flex items-center gap-1 text-xs text-amber-700 bg-amber-50 dark:text-amber-400 dark:bg-amber-900/20 px-2 py-0.5 rounded-full hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors"
									title={`Derived from: ${contentPiece.parentContent.title}`}
								>
									<GitFork className="h-3 w-3" />
									<span className="max-w-[100px] truncate">
										← {contentPiece.parentContent.title}
									</span>
								</button>
							)}
							{contentPiece.derivedCount && contentPiece.derivedCount > 0 && (
								<span
									className="inline-flex items-center gap-1 text-xs text-cyan-700 bg-cyan-50 dark:text-cyan-400 dark:bg-cyan-900/20 px-2 py-0.5 rounded-full"
									title={`Repurposed ${contentPiece.derivedCount} time${contentPiece.derivedCount > 1 ? "s" : ""}`}
								>
									<ArrowRight className="h-3 w-3" />
									<span>{contentPiece.derivedCount} repurposed</span>
								</span>
							)}
						</div>
					)}

				{/* Timestamps */}
				<div className="text-xs text-slate-500 dark:text-slate-400 space-y-1">
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
						<div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
							<span className="text-xs font-medium text-slate-700 dark:text-slate-300">
								Version: v{contentPiece.currentFinalizedVersion}
							</span>
						</div>
					)}
			</div>
		</article>
	);
}
