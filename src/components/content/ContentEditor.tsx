/**
 * ContentEditor component wrapping Novel block-based editor.
 * Provides a Notion-style editing experience with slash commands, markdown shortcuts,
 * and autosave functionality.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
	EditorRoot,
	EditorContent,
	type JSONContent,
	StarterKit,
	TiptapImage,
	TiptapLink,
} from "novel";
import type { Editor } from "@tiptap/core";
import type { Transaction } from "@tiptap/pm/state";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";

export interface ContentEditorProps {
	/**
	 * Initial content as JSON string (Novel editor format).
	 */
	initialContent: string;

	/**
	 * Callback when content changes (debounced for autosave).
	 */
	onChange: (content: string) => void;

	/**
	 * Content piece ID for autosave.
	 */
	contentPieceId?: Id<"contentPieces">;

	/**
	 * Whether the editor is disabled (e.g., for finalized content).
	 */
	disabled?: boolean;

	/**
	 * Debounce delay in milliseconds (default: 3000ms).
	 */
	debounceMs?: number;
}

/**
 * Parse JSON content safely and ensure it has proper doc schema.
 */
function parseContent(content: string): JSONContent {
	try {
		const parsed = JSON.parse(content);
		// Ensure content has proper doc structure for TipTap schema
		if (parsed && typeof parsed === "object") {
			return parsed.type === "doc" ? parsed : { type: "doc", content: [parsed] };
		}
	} catch {
		// Return empty doc if parsing fails
	}
	return { type: "doc", content: [] };
}

/**
 * Default extensions for Novel editor.
 */
const defaultExtensions = [
	StarterKit.configure({
		heading: {
			levels: [1, 2, 3, 4, 5, 6],
		},
	}),
	TiptapImage,
	TiptapLink.configure({
		openOnClick: false,
	}),
];

/**
 * ContentEditor component with autosave and Novel editor integration.
 */
export function ContentEditor({
	initialContent,
	onChange,
	contentPieceId,
	disabled = false,
	debounceMs = 3000,
}: ContentEditorProps) {
	const [isSaving, setIsSaving] = useState(false);
	const [lastSaved, setLastSaved] = useState<Date | null>(null);
	const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
	const updateContentPiece = useMutation(api.contentPieces.updateContentPiece);

	// Memoize parsed content to prevent unnecessary re-renders
	const parsedInitialContent = useMemo(
		() => parseContent(initialContent),
		[initialContent]
	);

	/**
	 * Handle content updates from Novel editor.
	 */
	const handleUpdate = useCallback(
		({ editor }: { editor: Editor; transaction: Transaction }) => {
			const json = editor.getJSON();
			const jsonString = JSON.stringify(json);

			// Clear existing debounce timer
			if (debounceTimerRef.current) {
				clearTimeout(debounceTimerRef.current);
			}

			// Set new debounce timer for autosave
			debounceTimerRef.current = setTimeout(() => {
				onChange(jsonString);

				// If contentPieceId is provided, trigger autosave
				if (contentPieceId) {
					setIsSaving(true);
					updateContentPiece({
						contentPieceId,
						content: jsonString,
					})
						.then(() => {
							setLastSaved(new Date());
							setIsSaving(false);
						})
						.catch((error) => {
							console.error("Failed to autosave content:", error);
							setIsSaving(false);
						});
				}
			}, debounceMs);
		},
		[onChange, contentPieceId, updateContentPiece, debounceMs]
	);

	/**
	 * Clear debounce timer on unmount.
	 */
	useEffect(() => {
		return () => {
			if (debounceTimerRef.current) {
				clearTimeout(debounceTimerRef.current);
			}
		};
	}, []);

	return (
		<div className="w-full max-w-4xl mx-auto">
			{/* Save indicator */}
			<div className="mb-2 text-sm text-gray-500 text-right">
				{isSaving && (
					<span className="flex items-center justify-end gap-2">
						<div className="animate-spin rounded-full h-3 w-3 border-b-2 border-cyan-600" />
						Saving...
					</span>
				)}
				{!isSaving && lastSaved && (
					<span>
						Last saved at{" "}
						{lastSaved.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
					</span>
				)}
			</div>

			{/* Novel Editor */}
			<div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
				<EditorRoot>
					<EditorContent
						key={contentPieceId}
						extensions={defaultExtensions}
						initialContent={parsedInitialContent}
						onUpdate={handleUpdate}
						editable={!disabled}
						className="min-h-[500px] p-6"
						editorProps={{
							attributes: {
								class: "prose prose-lg focus:outline-none max-w-none",
							},
						}}
					/>
				</EditorRoot>
			</div>
		</div>
	);
}
