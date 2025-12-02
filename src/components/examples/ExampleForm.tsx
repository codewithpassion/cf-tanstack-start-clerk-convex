import { useState } from "react";
import type { Doc } from "../../../convex/_generated/dataModel";

export interface ExampleFormProps {
	example?: Doc<"examples">;
	onSubmit: (data: { title: string; content?: string; notes?: string }) => void;
	onCancel: () => void;
	isSubmitting?: boolean;
}

/**
 * Form component for creating or editing examples.
 * Supports title, content, notes fields, and file uploads.
 */
export function ExampleForm({
	example,
	onSubmit,
	onCancel,
	isSubmitting = false,
}: ExampleFormProps) {
	const [title, setTitle] = useState(example?.title || "");
	const [content, setContent] = useState(example?.content || "");
	const [notes, setNotes] = useState(example?.notes || "");
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

		if (notes && notes.length > 2000) {
			newErrors.notes = "Notes must be 2,000 characters or less";
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
				notes: notes.trim() || undefined,
			});
		}
	};

	return (
		<form onSubmit={handleSubmit} className="space-y-6">
			<div>
				<label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
					Title <span className="text-red-500">*</span>
				</label>
				<input
					type="text"
					id="title"
					value={title}
					onChange={(e) => setTitle(e.target.value)}
					className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500 text-gray-900 bg-white ${
						errors.title ? "border-red-500" : "border-gray-300"
					}`}
					placeholder="Example: Great LinkedIn Post about Product Launch"
					maxLength={200}
					disabled={isSubmitting}
				/>
				{errors.title && <p className="mt-1 text-sm text-red-600">{errors.title}</p>}
				<p className="mt-1 text-xs text-gray-500">{title.length}/200 characters</p>
			</div>

			<div>
				<label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-1">
					Content
				</label>
				<textarea
					id="content"
					value={content}
					onChange={(e) => setContent(e.target.value)}
					rows={10}
					className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500 text-gray-900 bg-white ${
						errors.content ? "border-red-500" : "border-gray-300"
					}`}
					placeholder="Paste the example content here..."
					disabled={isSubmitting}
				/>
				{errors.content && <p className="mt-1 text-sm text-red-600">{errors.content}</p>}
				<p className="mt-1 text-xs text-gray-500">{content.length}/50,000 characters</p>
			</div>

			<div>
				<label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
					Notes
				</label>
				<textarea
					id="notes"
					value={notes}
					onChange={(e) => setNotes(e.target.value)}
					rows={3}
					className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500 text-gray-900 bg-white ${
						errors.notes ? "border-red-500" : "border-gray-300"
					}`}
					placeholder="Why was this example successful? What made it work?"
					disabled={isSubmitting}
				/>
				{errors.notes && <p className="mt-1 text-sm text-red-600">{errors.notes}</p>}
				<p className="mt-1 text-xs text-gray-500">{notes.length}/2,000 characters</p>
			</div>

			<div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
				<button
					type="button"
					onClick={onCancel}
					disabled={isSubmitting}
					className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
				>
					Cancel
				</button>
				<button
					type="submit"
					disabled={isSubmitting}
					className="px-4 py-2 text-sm font-medium text-white bg-cyan-600 border border-transparent rounded-md hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
				>
					{isSubmitting ? "Saving..." : example ? "Update" : "Create"}
				</button>
			</div>
		</form>
	);
}
