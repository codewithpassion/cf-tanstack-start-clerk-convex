/**
 * ContentViewer component - Read-only Novel editor for displaying content.
 * Used for version comparison in the version history sidebar.
 */
import { useMemo } from "react";
import {
	EditorRoot,
	EditorContent,
	StarterKit,
	TiptapImage,
	TiptapLink,
	type JSONContent,
} from "novel";

export interface ContentViewerProps {
	/**
	 * Content as JSON string (Novel editor format).
	 */
	content: string;

	/**
	 * Optional CSS class for styling.
	 */
	className?: string;
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
 * Read-only content viewer using Novel editor.
 */
export function ContentViewer({ content, className = "" }: ContentViewerProps) {
	// Memoize parsed content to prevent unnecessary re-renders
	const parsedContent = useMemo(() => parseContent(content), [content]);

	return (
		<div className={`w-full ${className}`}>
			<EditorRoot>
				<EditorContent
					extensions={[
						StarterKit.configure({
							heading: {
								levels: [1, 2, 3, 4, 5, 6],
							},
						}),
						TiptapImage,
						TiptapLink.configure({
							openOnClick: true,
						}),
					]}
					initialContent={parsedContent}
					editable={false}
					className="p-6"
					editorProps={{
						attributes: {
							class:
								"prose prose-sm dark:prose-invert focus:outline-none max-w-none",
						},
					}}
				/>
			</EditorRoot>
		</div>
	);
}
