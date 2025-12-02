import { useState } from "react";
import type { Doc } from "../../../convex/_generated/dataModel";

export interface KnowledgeBaseItemFormProps {
	item?: Doc<"knowledgeBaseItems">;
	onSubmit: (data: { title: string; content?: string }) => void;
	onCancel: () => void;
	isSubmitting?: boolean;
}

/**
 * Form component for creating or editing knowledge base items.
 * Supports both text content input and file uploads.
 */
export function KnowledgeBaseItemForm({
	item,
	onSubmit,
	onCancel,
	isSubmitting = false,
}: KnowledgeBaseItemFormProps) {
	const [title, setTitle] = useState(item?.title || "");
	const [content, setContent] = useState(item?.content || "");
	const [errors, setErrors] = useState<Record<string, string>>({});

	const validate = () => {
		const newErrors: Record<string, string> = {};

		const trimmedTitle = title.trim();
		if (!trimmedTitle) {
			newErrors.title = "Title is required";
		} else if (trimmedTitle.length > 200) {
			newErrors.title = "Title must be 200 characters or less";
		}

		if (content && content.length > 50000) {
			newErrors.content = "Content must be 50,000 characters or less";
		}

		setErrors(newErrors);
		return Object.keys(newErrors).length === 0;
	};

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		if (validate()) {
			onSubmit({
				title: title.trim(),
				content: content.trim() || undefined,
			});
		}
	};

	return (
		<form onSubmit={handleSubmit} className="space-y-6">
			<div>
				<label htmlFor="title" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
					Title <span className="text-red-500">*</span>
				</label>
				<input
					type="text"
					id="title"
					value={title}
					onChange={(e) => setTitle(e.target.value)}
					className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500 text-slate-900 dark:text-white bg-white dark:bg-slate-950 ${errors.title ? "border-red-500" : "border-slate-300 dark:border-slate-700"
						}`}
					placeholder="Enter item title"
					maxLength={200}
					disabled={isSubmitting}
				/>
				{errors.title && <p className="mt-1 text-sm text-red-600">{errors.title}</p>}
				<p className="mt-1 text-xs text-slate-500">{title.length}/200 characters</p>
			</div>

			<div>
				<label htmlFor="content" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
					Content
				</label>
				<textarea
					id="content"
					value={content}
					onChange={(e) => setContent(e.target.value)}
					rows={10}
					className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500 text-slate-900 dark:text-white bg-white dark:bg-slate-950 ${errors.content ? "border-red-500" : "border-slate-300 dark:border-slate-700"
						}`}
					placeholder="Enter reference content, documentation, or guidelines..."
					disabled={isSubmitting}
				/>
				{errors.content && <p className="mt-1 text-sm text-red-600">{errors.content}</p>}
				<p className="mt-1 text-xs text-slate-500">{content.length}/50,000 characters</p>
			</div>

			<div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
				<button
					type="button"
					onClick={onCancel}
					disabled={isSubmitting}
					className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-md hover:bg-slate-50 dark:hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
				>
					Cancel
				</button>
				<button
					type="submit"
					disabled={isSubmitting}
					className="px-4 py-2 text-sm font-medium text-white bg-cyan-600 border border-transparent rounded-md hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
				>
					{isSubmitting ? "Saving..." : item ? "Update" : "Create"}
				</button>
			</div>
		</form>
	);
}
