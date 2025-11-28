/**
 * ContentEditor component wrapping Novel block-based editor.
 * Provides a Notion-style editing experience with slash commands, markdown shortcuts,
 * bubble menu for formatting, and autosave functionality.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
	EditorRoot,
	EditorContent,
	EditorCommand,
	EditorCommandItem,
	EditorCommandEmpty,
	EditorCommandList,
	EditorBubble,
	ImageResizer,
	handleCommandNavigation,
	createSuggestionItems,
	Command,
	StarterKit,
	TiptapImage,
	TiptapLink,
	type JSONContent,
	type SuggestionItem,
} from "novel";
import {
	Bold,
	Italic,
	Strikethrough,
	Code,
	Heading1,
	Heading2,
	Heading3,
	List,
	ListOrdered,
	MessageSquareQuote,
} from "lucide-react";
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
 * Slash command suggestions for the editor.
 */
const suggestionItems = createSuggestionItems([
	{
		title: "Heading 1",
		description: "Big section heading",
		searchTerms: ["title", "big", "large", "h1"],
		icon: <Heading1 size={18} />,
		command: ({ editor, range }: { editor: Editor; range: any }) => {
			editor
				.chain()
				.focus()
				.deleteRange(range)
				.setNode("heading", { level: 1 })
				.run();
		},
	},
	{
		title: "Heading 2",
		description: "Medium section heading",
		searchTerms: ["subtitle", "medium", "h2"],
		icon: <Heading2 size={18} />,
		command: ({ editor, range }: { editor: Editor; range: any }) => {
			editor
				.chain()
				.focus()
				.deleteRange(range)
				.setNode("heading", { level: 2 })
				.run();
		},
	},
	{
		title: "Heading 3",
		description: "Small section heading",
		searchTerms: ["subtitle", "small", "h3"],
		icon: <Heading3 size={18} />,
		command: ({ editor, range }: { editor: Editor; range: any }) => {
			editor
				.chain()
				.focus()
				.deleteRange(range)
				.setNode("heading", { level: 3 })
				.run();
		},
	},
	{
		title: "Bullet List",
		description: "Create a simple bullet list",
		searchTerms: ["unordered", "point", "ul"],
		icon: <List size={18} />,
		command: ({ editor, range }: { editor: Editor; range: any }) => {
			editor.chain().focus().deleteRange(range).toggleBulletList().run();
		},
	},
	{
		title: "Numbered List",
		description: "Create a numbered list",
		searchTerms: ["ordered", "ol"],
		icon: <ListOrdered size={18} />,
		command: ({ editor, range }: { editor: Editor; range: any }) => {
			editor.chain().focus().deleteRange(range).toggleOrderedList().run();
		},
	},
	{
		title: "Quote",
		description: "Capture a quote",
		searchTerms: ["blockquote"],
		icon: <MessageSquareQuote size={18} />,
		command: ({ editor, range }: { editor: Editor; range: any }) => {
			editor.chain().focus().deleteRange(range).toggleBlockquote().run();
		},
	},
]);

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
		<div className="w-full">
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
			<div className="border border-gray-200 rounded-lg overflow-hidden bg-white dark:bg-gray-800 dark:border-gray-700">
				<EditorRoot>
					<EditorContent
						key={contentPieceId}
						extensions={[
							StarterKit.configure({
								heading: {
									levels: [1, 2, 3, 4, 5, 6],
								},
							}),
							TiptapImage,
							TiptapLink.configure({
								openOnClick: false,
							}),
							Command.configure({ suggestion: suggestionItems }),
						]}
						initialContent={parsedInitialContent}
						onUpdate={handleUpdate}
						editable={!disabled}
						className="min-h-[500px] p-6"
						editorProps={{
							attributes: {
								class: "prose prose-lg dark:prose-invert focus:outline-none max-w-none",
							},
							handleDOMEvents: {
								keydown: (_view, event) => handleCommandNavigation(event),
							},
						}}
					>
						{/* Bubble menu for text selection */}
						<EditorCommand className="z-50 h-auto max-h-[330px] overflow-y-auto rounded-md border border-gray-200 bg-white px-1 py-2 shadow-md transition-all dark:border-gray-700 dark:bg-gray-800">
							<EditorCommandEmpty className="px-2 text-gray-500 dark:text-gray-400">
								No results
							</EditorCommandEmpty>
							<EditorCommandList>
								{suggestionItems.map((item: SuggestionItem) => (
									<EditorCommandItem
										value={item.title}
										onCommand={(val) => item.command?.(val)}
										className="flex w-full items-center space-x-2 rounded-md px-2 py-1 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 aria-selected:bg-gray-100 dark:aria-selected:bg-gray-700"
										key={item.title}
									>
										<div className="flex h-10 w-10 items-center justify-center rounded-md border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
											{item.icon}
										</div>
										<div>
											<p className="font-medium">{item.title}</p>
											<p className="text-xs text-gray-500 dark:text-gray-400">
												{item.description}
											</p>
										</div>
									</EditorCommandItem>
								))}
							</EditorCommandList>
						</EditorCommand>

						{/* Bubble menu for formatting selected text */}
						<EditorBubble
							tippyOptions={{
								placement: "top",
							}}
							className="flex w-fit max-w-[90vw] overflow-hidden rounded-md border border-gray-200 bg-white shadow-xl dark:border-gray-700 dark:bg-gray-800"
						>
							<button
								type="button"
								onClick={(e) => {
									e.preventDefault();
									const editor = (e.currentTarget as any).__reactProps$?.editor;
									if (editor) {
										editor.chain().focus().toggleBold().run();
									}
								}}
								className="p-2 text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
								title="Bold (Ctrl+B)"
							>
								<Bold className="h-4 w-4" />
							</button>
							<button
								type="button"
								onClick={(e) => {
									e.preventDefault();
									const editor = (e.currentTarget as any).__reactProps$?.editor;
									if (editor) {
										editor.chain().focus().toggleItalic().run();
									}
								}}
								className="p-2 text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
								title="Italic (Ctrl+I)"
							>
								<Italic className="h-4 w-4" />
							</button>
							<button
								type="button"
								onClick={(e) => {
									e.preventDefault();
									const editor = (e.currentTarget as any).__reactProps$?.editor;
									if (editor) {
										editor.chain().focus().toggleStrike().run();
									}
								}}
								className="p-2 text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
								title="Strikethrough"
							>
								<Strikethrough className="h-4 w-4" />
							</button>
							<button
								type="button"
								onClick={(e) => {
									e.preventDefault();
									const editor = (e.currentTarget as any).__reactProps$?.editor;
									if (editor) {
										editor.chain().focus().toggleCode().run();
									}
								}}
								className="p-2 text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
								title="Code"
							>
								<Code className="h-4 w-4" />
							</button>
						</EditorBubble>

						<ImageResizer />
					</EditorContent>
				</EditorRoot>
			</div>

			{/* Keyboard shortcuts help text */}
			<div className="mt-3 text-xs text-gray-500 dark:text-gray-400">
				<p className="mb-1">
					<strong>Markdown shortcuts:</strong> Type # for headings, - for bullet lists, 1. for numbered lists, {">"} for quotes
				</p>
				<p className="mb-1">
					<strong>Formatting:</strong> **bold**, *italic*, `code`, ~~strikethrough~~
				</p>
				<p>
					<strong>Slash commands:</strong> Type / to see all commands
				</p>
			</div>
		</div>
	);
}
