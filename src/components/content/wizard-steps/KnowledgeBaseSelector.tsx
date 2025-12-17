import { useQuery } from "convex/react";
import { api } from "@/convex/api";
import type { Id } from "@/convex/dataModel";
import { LoadingState } from "@/components/shared/LoadingState";
import { EmptyState } from "@/components/shared/EmptyState";
import { TOKEN_LIMITS } from "@/lib/ai/models";

export interface KnowledgeBaseSelectorProps {
	categoryId: Id<"categories"> | null;
	useAllKnowledgeBase: boolean;
	selectedKnowledgeBaseIds: Id<"knowledgeBaseItems">[];
	onToggleChange: (useAll: boolean) => void;
	onSelectionChange: (ids: Id<"knowledgeBaseItems">[]) => void;
}

/**
 * Knowledge Base selector component for content generation wizard.
 * Allows selecting specific KB items or using all items in category.
 * Enforces 10 item limit for token management.
 */
export function KnowledgeBaseSelector({
	categoryId,
	useAllKnowledgeBase,
	selectedKnowledgeBaseIds,
	onToggleChange,
	onSelectionChange,
}: KnowledgeBaseSelectorProps) {
	// Query KB items for the category
	const knowledgeBaseItems = useQuery(
		api.knowledgeBase.listKnowledgeBaseItems,
		categoryId ? { categoryId } : "skip",
	);

	// Handle toggle change
	const handleToggleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
		onToggleChange(event.target.checked);
	};

	// Handle individual checkbox change
	const handleCheckboxChange = (itemId: Id<"knowledgeBaseItems">, checked: boolean) => {
		if (checked) {
			// Check if adding would exceed limit
			if (selectedKnowledgeBaseIds.length >= TOKEN_LIMITS.MAX_KNOWLEDGE_BASE_ITEMS) {
				return; // Don't add, limit reached
			}
			onSelectionChange([...selectedKnowledgeBaseIds, itemId]);
		} else {
			onSelectionChange(selectedKnowledgeBaseIds.filter((id) => id !== itemId));
		}
	};

	// Truncate content preview to max 150 characters
	const truncateContent = (content: string | undefined): string => {
		if (!content) return "No content";
		if (content.length <= 150) return content;
		return `${content.slice(0, 150)}...`;
	};

	// Show loading state
	if (knowledgeBaseItems === undefined) {
		return <LoadingState message="Loading knowledge base items..." />;
	}

	// Show warning if limit would be exceeded
	const showLimitWarning =
		!useAllKnowledgeBase &&
		selectedKnowledgeBaseIds.length >= TOKEN_LIMITS.MAX_KNOWLEDGE_BASE_ITEMS;

	return (
		<div className="space-y-4">
			{/* Toggle for using all knowledge base items */}
			<div className="flex items-center gap-3">
				<input
					type="checkbox"
					id="use-all-kb"
					checked={useAllKnowledgeBase}
					onChange={handleToggleChange}
					className="w-5 h-5 rounded border-slate-300 dark:border-slate-700 text-cyan-600 focus:ring-cyan-500 focus:ring-offset-0"
				/>
				<label
					htmlFor="use-all-kb"
					className="text-sm font-medium text-slate-700 dark:text-slate-300"
				>
					Use all knowledge base items
				</label>
			</div>

			{/* Show checkbox list when toggle is OFF */}
			{!useAllKnowledgeBase && (
				<div className="space-y-3">
					{/* Limit warning */}
					{showLimitWarning && (
						<div className="p-3 rounded-md bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
							<p className="text-sm text-amber-800 dark:text-amber-200">
								You can select up to {TOKEN_LIMITS.MAX_KNOWLEDGE_BASE_ITEMS} knowledge base items.
							</p>
						</div>
					)}

					{/* Empty state */}
					{knowledgeBaseItems.length === 0 ? (
						<EmptyState
							title="No Knowledge Base Items"
							description="This category doesn't have any knowledge base items yet. Add some to include them in your content generation."
						/>
					) : (
						/* Checkbox list */
						<div className="mt-4 max-h-64 overflow-y-auto border border-slate-300 dark:border-slate-700 rounded-md p-3 bg-white dark:bg-slate-950">
							<div className="space-y-2">
								{knowledgeBaseItems.map((item) => {
									const isChecked = selectedKnowledgeBaseIds.includes(item._id);
									const isDisabled =
										!isChecked &&
										selectedKnowledgeBaseIds.length >= TOKEN_LIMITS.MAX_KNOWLEDGE_BASE_ITEMS;

									return (
										<div key={item._id} className="flex items-start gap-2 py-2">
											<input
												type="checkbox"
												id={`kb-item-${item._id}`}
												checked={isChecked}
												disabled={isDisabled}
												onChange={(e) => handleCheckboxChange(item._id, e.target.checked)}
												className="mt-0.5 w-4 h-4 rounded border-slate-300 dark:border-slate-700 text-cyan-600 focus:ring-cyan-500 focus:ring-offset-0 disabled:opacity-50 disabled:cursor-not-allowed"
											/>
											<label
												htmlFor={`kb-item-${item._id}`}
												className={`flex-1 ${isDisabled ? "opacity-50" : ""}`}
											>
												<div className="text-sm font-medium text-slate-900 dark:text-white">
													{item.title}
												</div>
												<div className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mt-1">
													{truncateContent(item.content)}
												</div>
											</label>
										</div>
									);
								})}
							</div>
						</div>
					)}
				</div>
			)}
		</div>
	);
}
