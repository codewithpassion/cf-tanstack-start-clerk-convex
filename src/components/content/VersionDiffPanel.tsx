/**
 * VersionDiffPanel component displays differences between selected and current versions.
 * Uses structure-preserving diff that maintains headings, formatting, and shows a merged view.
 */
import { useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/api";
import type { Id } from "@/convex/dataModel";
import {
	EditorRoot,
	EditorContent,
	StarterKit,
	TiptapImage,
	TiptapLink,
	type JSONContent,
} from "novel";
import { Color } from "@tiptap/extension-color";
import TextStyle from "@tiptap/extension-text-style";
import * as Diff from "diff";

interface VersionDiffPanelProps {
	selectedVersionId: Id<"contentVersions"> | null;
	currentVersionId: Id<"contentVersions"> | null;
	contentPieceId: Id<"contentPieces">;
}

// Diff mark definitions
const ADDED_MARKS = [
	{
		type: "textStyle",
		attrs: {
			backgroundColor: "#bbf7d0", // green-200
			color: "#166534", // green-800
		},
	},
];

const REMOVED_MARKS = [
	{ type: "strike" },
	{
		type: "textStyle",
		attrs: {
			backgroundColor: "#fecaca", // red-200
			color: "#991b1b", // red-800
		},
	},
];

export function VersionDiffPanel({
	selectedVersionId,
	currentVersionId,
}: VersionDiffPanelProps) {
	// Query selected version
	const selectedVersion = useQuery(
		api.contentVersions.getVersion,
		selectedVersionId ? { versionId: selectedVersionId } : "skip",
	);

	// Query current version
	const currentVersion = useQuery(
		api.contentVersions.getVersion,
		currentVersionId ? { versionId: currentVersionId } : "skip",
	);

	// Empty state: No version selected
	if (!selectedVersionId) {
		return (
			<div className="flex items-center justify-center h-full p-8 bg-slate-50 dark:bg-slate-900">
				<div className="text-center">
					<svg
						className="w-16 h-16 mx-auto text-slate-300 dark:text-slate-600 mb-4"
						fill="none"
						viewBox="0 0 24 24"
						strokeWidth="1.5"
						stroke="currentColor"
					>
						<title>Select version</title>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z"
						/>
					</svg>
					<h3 className="mt-2 text-sm font-medium text-slate-900 dark:text-slate-100">
						No version selected
					</h3>
					<p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
						Click a version to view changes
					</p>
				</div>
			</div>
		);
	}

	// Loading state
	if (!selectedVersion || !currentVersion) {
		return (
			<div className="flex items-center justify-center h-full bg-slate-50 dark:bg-slate-900">
				<div className="text-center">
					<svg
						className="animate-spin h-8 w-8 text-cyan-600 dark:text-cyan-400 mx-auto"
						xmlns="http://www.w3.org/2000/svg"
						fill="none"
						viewBox="0 0 24 24"
					>
						<title>Loading</title>
						<circle
							className="opacity-25"
							cx="12"
							cy="12"
							r="10"
							stroke="currentColor"
							strokeWidth="4"
						/>
						<path
							className="opacity-75"
							fill="currentColor"
							d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
						/>
					</svg>
					<p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
						Loading comparison...
					</p>
				</div>
			</div>
		);
	}

	// Loaded: Show formatted diff
	return (
		<div className="h-full overflow-auto bg-white dark:bg-slate-900">
			{/* Header */}
			<div className="sticky top-0 bg-slate-100 dark:bg-slate-800 px-4 py-3 border-b border-gray-200 dark:border-slate-700">
				<div className="flex items-center justify-between">
					<div className="text-sm font-medium text-slate-700 dark:text-slate-300">
						Comparing Version {selectedVersion.versionNumber} → Version{" "}
						{currentVersion.versionNumber} (Current)
					</div>
				</div>
				{/* Legend */}
				<div className="flex items-center gap-4 text-xs mt-2">
					<div className="flex items-center gap-1">
						<span className="w-3 h-3 bg-green-200 dark:bg-green-900 rounded" />
						<span className="text-slate-600 dark:text-slate-400">Added</span>
					</div>
					<div className="flex items-center gap-1">
						<span className="w-3 h-3 bg-red-200 dark:bg-red-900 rounded" />
						<span className="text-slate-600 dark:text-slate-400">Removed</span>
					</div>
				</div>
			</div>

			{/* Diff Content with Formatted Editor */}
			<FormattedDiffView
				oldVersion={selectedVersion}
				newVersion={currentVersion}
			/>
		</div>
	);
}

/**
 * Parse JSON content safely and ensure it has proper doc schema.
 */
function parseContent(content: string): JSONContent {
	try {
		const parsed = JSON.parse(content);
		if (parsed && typeof parsed === "object") {
			return parsed.type === "doc"
				? parsed
				: { type: "doc", content: [parsed] };
		}
	} catch {
		// Return empty doc if parsing fails
	}
	return { type: "doc", content: [] };
}

/**
 * Extract plain text from a node (for comparison purposes)
 */
function extractText(node: JSONContent): string {
	if (node.type === "text") {
		return node.text || "";
	}
	if (node.content) {
		return node.content.map(extractText).join("");
	}
	return "";
}

/**
 * Create a signature for a block (used for LCS matching)
 */
function getBlockSignature(block: JSONContent): string {
	const text = extractText(block).slice(0, 50);
	return `${block.type}:${text}`;
}

/**
 * LCS (Longest Common Subsequence) algorithm for block alignment
 */
function lcs<T>(a: T[], b: T[], equals: (x: T, y: T) => boolean): number[][] {
	const m = a.length;
	const n = b.length;
	const dp: number[][] = Array(m + 1)
		.fill(null)
		.map(() => Array(n + 1).fill(0));

	for (let i = 1; i <= m; i++) {
		for (let j = 1; j <= n; j++) {
			if (equals(a[i - 1], b[j - 1])) {
				dp[i][j] = dp[i - 1][j - 1] + 1;
			} else {
				dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
			}
		}
	}
	return dp;
}

type AlignedBlock =
	| { type: "matched"; oldBlock: JSONContent; newBlock: JSONContent }
	| { type: "removed"; oldBlock: JSONContent }
	| { type: "added"; newBlock: JSONContent };

/**
 * Align blocks using LCS to create a merged view
 */
function alignBlocks(
	oldBlocks: JSONContent[],
	newBlocks: JSONContent[],
): AlignedBlock[] {
	const oldSigs = oldBlocks.map(getBlockSignature);
	const newSigs = newBlocks.map(getBlockSignature);

	// Compare by signature similarity (same type and similar content)
	const equals = (a: string, b: string) => {
		const [aType] = a.split(":");
		const [bType] = b.split(":");
		// Must be same type, and either same content or both have some text
		if (aType !== bType) return false;
		// For matching, we check if they're similar enough
		return a === b;
	};

	const dp = lcs(oldSigs, newSigs, equals);

	// Backtrack through LCS to build alignment
	let i = oldBlocks.length;
	let j = newBlocks.length;
	const aligned: AlignedBlock[] = [];

	while (i > 0 || j > 0) {
		if (i > 0 && j > 0 && equals(oldSigs[i - 1], newSigs[j - 1])) {
			aligned.push({
				type: "matched",
				oldBlock: oldBlocks[i - 1],
				newBlock: newBlocks[j - 1],
			});
			i--;
			j--;
		} else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
			aligned.push({ type: "added", newBlock: newBlocks[j - 1] });
			j--;
		} else {
			aligned.push({ type: "removed", oldBlock: oldBlocks[i - 1] });
			i--;
		}
	}

	// Reverse to get correct order
	return aligned.reverse();
}

/**
 * Add diff marks to all text nodes in a block
 */
function addMarksToBlock(
	block: JSONContent,
	marksToAdd: JSONContent["marks"],
): JSONContent {
	if (block.type === "text") {
		return {
			...block,
			marks: [...(block.marks || []), ...(marksToAdd || [])],
		};
	}

	if (block.content) {
		return {
			...block,
			content: block.content.map((child) => addMarksToBlock(child, marksToAdd)),
		};
	}

	return block;
}

/**
 * Diff text content within matched blocks
 */
function diffBlockContent(
	oldBlock: JSONContent,
	newBlock: JSONContent,
): JSONContent {
	const oldText = extractText(oldBlock);
	const newText = extractText(newBlock);

	// If text is identical, return the new block as-is
	if (oldText === newText) {
		return newBlock;
	}

	// Compute word-level diff
	const changes = Diff.diffWords(oldText, newText);

	// Build new content array with diff marks
	const newContent: JSONContent[] = [];

	for (const change of changes) {
		if (change.added) {
			newContent.push({
				type: "text",
				text: change.value,
				marks: ADDED_MARKS,
			});
		} else if (change.removed) {
			newContent.push({
				type: "text",
				text: change.value,
				marks: REMOVED_MARKS,
			});
		} else {
			newContent.push({
				type: "text",
				text: change.value,
			});
		}
	}

	// Return block with same structure but diffed content
	return {
		...newBlock,
		content: newContent.length > 0 ? newContent : undefined,
	};
}

/**
 * Create a merged diff document from old and new content
 */
function createMergedDiffContent(
	oldContent: string,
	newContent: string,
): JSONContent {
	const oldDoc = parseContent(oldContent);
	const newDoc = parseContent(newContent);

	const oldBlocks = oldDoc.content || [];
	const newBlocks = newDoc.content || [];

	// Align blocks using LCS
	const aligned = alignBlocks(oldBlocks, newBlocks);

	// Build merged content
	const mergedContent: JSONContent[] = [];

	for (const item of aligned) {
		if (item.type === "matched") {
			// Diff the content within matched blocks
			mergedContent.push(diffBlockContent(item.oldBlock, item.newBlock));
		} else if (item.type === "removed") {
			// Mark entire block as removed
			mergedContent.push(addMarksToBlock(item.oldBlock, REMOVED_MARKS));
		} else if (item.type === "added") {
			// Mark entire block as added
			mergedContent.push(addMarksToBlock(item.newBlock, ADDED_MARKS));
		}
	}

	return {
		type: "doc",
		content: mergedContent.length > 0 ? mergedContent : [{ type: "paragraph" }],
	};
}

interface FormattedDiffViewProps {
	oldVersion: {
		content: string;
		versionNumber: number;
	};
	newVersion: {
		content: string;
		versionNumber: number;
	};
}

function FormattedDiffView({
	oldVersion,
	newVersion,
}: FormattedDiffViewProps) {
	const diffContent = useMemo(
		() => createMergedDiffContent(oldVersion.content, newVersion.content),
		[oldVersion.content, newVersion.content],
	);

	return (
		<div className="p-6">
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
						TextStyle,
						Color,
					]}
					initialContent={diffContent}
					editable={false}
					className="min-h-[200px]"
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
