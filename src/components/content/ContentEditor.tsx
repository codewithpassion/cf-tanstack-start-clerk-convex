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
	EditorBubbleItem,
	ImageResizer,
	handleCommandNavigation,
	createSuggestionItems,
	Command,
	StarterKit,
	TiptapImage,
	TiptapLink,
	GlobalDragHandle,
	useEditor,
	type JSONContent,
	type SuggestionItem,
} from "novel";
import AutoJoiner from 'tiptap-extension-auto-joiner' // optional
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
	Undo,
	Redo,
} from "lucide-react";
import type { Editor } from "@tiptap/core";
import type { Transaction } from "@tiptap/pm/state";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";

export type EditorMode = "notion-like" | "simple";

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
 * Parse inline markdown formatting (bold, italic, code, links) into TipTap marks.
 */
function parseInlineMarkdown(text: string): JSONContent[] {
	const result: JSONContent[] = [];
	let remaining = text;

	while (remaining.length > 0) {
		// Bold and italic: ***text***
		const boldItalicMatch = remaining.match(/^\*\*\*(.+?)\*\*\*/);
		if (boldItalicMatch) {
			result.push({
				type: "text",
				marks: [{ type: "bold" }, { type: "italic" }],
				text: boldItalicMatch[1],
			});
			remaining = remaining.slice(boldItalicMatch[0].length);
			continue;
		}

		// Bold: **text** or __text__
		const boldMatch = remaining.match(/^\*\*(.+?)\*\*/) || remaining.match(/^__(.+?)__/);
		if (boldMatch) {
			result.push({
				type: "text",
				marks: [{ type: "bold" }],
				text: boldMatch[1],
			});
			remaining = remaining.slice(boldMatch[0].length);
			continue;
		}

		// Italic: *text* or _text_
		const italicMatch = remaining.match(/^\*([^*]+?)\*/) || remaining.match(/^_([^_]+?)_/);
		if (italicMatch) {
			result.push({
				type: "text",
				marks: [{ type: "italic" }],
				text: italicMatch[1],
			});
			remaining = remaining.slice(italicMatch[0].length);
			continue;
		}

		// Inline code: `text`
		const codeMatch = remaining.match(/^`([^`]+?)`/);
		if (codeMatch) {
			result.push({
				type: "text",
				marks: [{ type: "code" }],
				text: codeMatch[1],
			});
			remaining = remaining.slice(codeMatch[0].length);
			continue;
		}

		// Link: [text](url)
		const linkMatch = remaining.match(/^\[([^\]]+?)\]\(([^)]+?)\)/);
		if (linkMatch) {
			result.push({
				type: "text",
				marks: [{ type: "link", attrs: { href: linkMatch[2] } }],
				text: linkMatch[1],
			});
			remaining = remaining.slice(linkMatch[0].length);
			continue;
		}

		// Plain text - find next special character or end
		const nextSpecial = remaining.search(/[\*_`\[]/);
		if (nextSpecial === -1) {
			result.push({ type: "text", text: remaining });
			break;
		}
		if (nextSpecial > 0) {
			result.push({ type: "text", text: remaining.slice(0, nextSpecial) });
			remaining = remaining.slice(nextSpecial);
		} else {
			// Special char at start but not matched - treat as plain text
			result.push({ type: "text", text: remaining[0] });
			remaining = remaining.slice(1);
		}
	}

	return result.length > 0 ? result : [{ type: "text", text: "" }];
}

/**
 * Convert markdown text to TipTap JSON content.
 * Only uses nodes supported by TipTap's StarterKit.
 */
function markdownToTiptap(markdown: string): JSONContent {
	const lines = markdown.split("\n");
	const content: JSONContent[] = [];
	let i = 0;

	while (i < lines.length) {
		const line = lines[i];

		// Skip empty lines
		if (line.trim() === "") {
			i++;
			continue;
		}

		// Horizontal rule - convert to a simple paragraph with dashes
		if (/^(-{3,}|\*{3,}|_{3,})$/.test(line.trim())) {
			content.push({
				type: "paragraph",
				content: [{ type: "text", text: "---" }],
			});
			i++;
			continue;
		}

		// Headers
		const headerMatch = line.match(/^(#{1,6})\s+(.+)$/);
		if (headerMatch) {
			const level = headerMatch[1].length as 1 | 2 | 3 | 4 | 5 | 6;
			content.push({
				type: "heading",
				attrs: { level },
				content: parseInlineMarkdown(headerMatch[2]),
			});
			i++;
			continue;
		}

		// Code block - convert to paragraph with code marks for now
		if (line.startsWith("```")) {
			const codeLines: string[] = [];
			i++;
			while (i < lines.length && !lines[i].startsWith("```")) {
				codeLines.push(lines[i]);
				i++;
			}
			// Add code as a paragraph with code formatting
			if (codeLines.length > 0) {
				content.push({
					type: "paragraph",
					content: [{
						type: "text",
						marks: [{ type: "code" }],
						text: codeLines.join("\n"),
					}],
				});
			}
			i++; // Skip closing ```
			continue;
		}

		// Blockquote
		if (line.startsWith("> ")) {
			const quoteLines: string[] = [];
			while (i < lines.length && lines[i].startsWith("> ")) {
				quoteLines.push(lines[i].slice(2));
				i++;
			}
			content.push({
				type: "blockquote",
				content: [{
					type: "paragraph",
					content: parseInlineMarkdown(quoteLines.join(" ")),
				}],
			});
			continue;
		}

		// Unordered list - check for list item pattern but avoid matching bold (**text**)
		if (/^[\-\+]\s+/.test(line) || /^\*\s+[^*]/.test(line)) {
			const listItems: JSONContent[] = [];
			while (i < lines.length && (/^[\-\+]\s+/.test(lines[i]) || /^\*\s+[^*]/.test(lines[i]))) {
				const itemText = lines[i].replace(/^[\*\-\+]\s+/, "");
				listItems.push({
					type: "listItem",
					content: [{
						type: "paragraph",
						content: parseInlineMarkdown(itemText),
					}],
				});
				i++;
			}
			content.push({
				type: "bulletList",
				content: listItems,
			});
			continue;
		}

		// Ordered list
		if (/^\d+\.\s+/.test(line)) {
			const listItems: JSONContent[] = [];
			while (i < lines.length && /^\d+\.\s+/.test(lines[i])) {
				const itemText = lines[i].replace(/^\d+\.\s+/, "");
				listItems.push({
					type: "listItem",
					content: [{
						type: "paragraph",
						content: parseInlineMarkdown(itemText),
					}],
				});
				i++;
			}
			content.push({
				type: "orderedList",
				content: listItems,
			});
			continue;
		}

		// Regular paragraph
		content.push({
			type: "paragraph",
			content: parseInlineMarkdown(line),
		});
		i++;
	}

	return {
		type: "doc",
		content: content.length > 0 ? content : [],
	};
}

/**
 * Parse JSON content safely and ensure it has proper doc schema.
 * Handles both JSON (TipTap format) and markdown/plain text content.
 */
function parseContent(content: string): JSONContent {
	// Handle empty content
	if (!content || content.trim() === "") {
		return { type: "doc", content: [] };
	}

	// Try to parse as JSON first (TipTap format)
	try {
		const parsed = JSON.parse(content);
		// Ensure content has proper doc structure for TipTap schema
		if (parsed && typeof parsed === "object") {
			return parsed.type === "doc" ? parsed : { type: "doc", content: [parsed] };
		}
	} catch {
		// Not valid JSON - treat as markdown/plain text
	}

	// Convert markdown to TipTap format
	return markdownToTiptap(content);
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
 * EditorRefSetter - Component inside EditorContent that updates toolbar editor state.
 */
function EditorRefSetter({ setEditor }: { setEditor: (editor: Editor | null) => void }) {
	const { editor } = useEditor();

	useEffect(() => {
		setEditor(editor);
	}, [editor, setEditor]);

	return null;
}

/**
 * SimpleEditorToolbar - Toolbar displayed outside EditorRoot context.
 */
function SimpleEditorToolbar({ editor }: { editor: Editor | null }) {

	if (!editor) return <div className="flex flex-wrap items-center gap-1 text-gray-400">Loading toolbar...</div>;

	return (
		<div className="flex flex-wrap items-center gap-1">
			{/* Undo/Redo */}
			<button
				type="button"
				onClick={() => editor.chain().focus().undo().run()}
				className="p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
				title="Undo"
			>
				<Undo className="h-4 w-4" />
			</button>
			<button
				type="button"
				onClick={() => editor.chain().focus().redo().run()}
				className="p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
				title="Redo"
			>
				<Redo className="h-4 w-4" />
			</button>

			<div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-1" />

			{/* Headings dropdown placeholder - will be simple buttons for now */}
			<button
				type="button"
				onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
				className="p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
				title="Heading 1"
			>
				<Heading1 className="h-4 w-4" />
			</button>
			<button
				type="button"
				onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
				className="p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
				title="Heading 2"
			>
				<Heading2 className="h-4 w-4" />
			</button>

			<div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-1" />

			{/* Lists */}
			<button
				type="button"
				onClick={() => editor.chain().focus().toggleBulletList().run()}
				className="p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
				title="Bullet List"
			>
				<List className="h-4 w-4" />
			</button>
			<button
				type="button"
				onClick={() => editor.chain().focus().toggleOrderedList().run()}
				className="p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
				title="Numbered List"
			>
				<ListOrdered className="h-4 w-4" />
			</button>

			<div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-1" />

			{/* Text formatting */}
			<button
				type="button"
				onClick={() => editor.chain().focus().toggleBold().run()}
				className="p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-bold"
				title="Bold"
			>
				<Bold className="h-4 w-4" />
			</button>
			<button
				type="button"
				onClick={() => editor.chain().focus().toggleItalic().run()}
				className="p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 italic"
				title="Italic"
			>
				<Italic className="h-4 w-4" />
			</button>
			<button
				type="button"
				onClick={() => editor.chain().focus().toggleStrike().run()}
				className="p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
				title="Strikethrough"
			>
				<Strikethrough className="h-4 w-4" />
			</button>
			<button
				type="button"
				onClick={() => editor.chain().focus().toggleCode().run()}
				className="p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-mono"
				title="Code"
			>
				<Code className="h-4 w-4" />
			</button>

			<div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-1" />

			{/* Blockquote */}
			<button
				type="button"
				onClick={() => editor.chain().focus().toggleBlockquote().run()}
				className="p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
				title="Quote"
			>
				<MessageSquareQuote className="h-4 w-4" />
			</button>
		</div>
	);
}

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
	const [toolbarEditor, setToolbarEditor] = useState<Editor | null>(null);
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
				<div className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 p-2">
					<SimpleEditorToolbar editor={toolbarEditor} />
				</div>
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
							GlobalDragHandle.configure({
								dragHandleWidth: 20,
							}),
							AutoJoiner.configure({
								elementsToJoin: ["bulletList", "orderedList"] // default
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
						{/* Sets toolbar editor state */}
						<EditorRefSetter setEditor={setToolbarEditor} />

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
							<EditorBubbleItem
								onSelect={(editor) => editor.chain().focus().toggleBold().run()}
								className="p-2 text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
							>
								<Bold className="h-4 w-4" />
							</EditorBubbleItem>
							<EditorBubbleItem
								onSelect={(editor) => editor.chain().focus().toggleItalic().run()}
								className="p-2 text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
							>
								<Italic className="h-4 w-4" />
							</EditorBubbleItem>
							<EditorBubbleItem
								onSelect={(editor) => editor.chain().focus().toggleStrike().run()}
								className="p-2 text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
							>
								<Strikethrough className="h-4 w-4" />
							</EditorBubbleItem>
							<EditorBubbleItem
								onSelect={(editor) => editor.chain().focus().toggleCode().run()}
								className="p-2 text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
							>
								<Code className="h-4 w-4" />
							</EditorBubbleItem>
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
