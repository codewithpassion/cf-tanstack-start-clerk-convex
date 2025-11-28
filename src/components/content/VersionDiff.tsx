/**
 * VersionDiff component displays differences between two content versions.
 * Supports side-by-side and inline diff views with color-coded changes.
 * Additions (green), deletions (red), and modifications (yellow) are highlighted.
 */
import { useState, useMemo } from "react";
import * as Diff from "diff";
import type { Doc } from "../../../convex/_generated/dataModel";

type ContentVersion = Doc<"contentVersions">;

interface VersionDiffProps {
	oldVersion: ContentVersion;
	newVersion: ContentVersion;
	initialViewMode?: "side-by-side" | "inline";
}

export default function VersionDiff({
	oldVersion,
	newVersion,
	initialViewMode = "inline",
}: VersionDiffProps) {
	const [viewMode, setViewMode] = useState<"side-by-side" | "inline">(
		initialViewMode
	);

	// Compute diff between versions
	const diffChanges = useMemo(() => {
		return Diff.diffWords(oldVersion.content, newVersion.content);
	}, [oldVersion.content, newVersion.content]);

	const toggleViewMode = () => {
		setViewMode((prev) => (prev === "inline" ? "side-by-side" : "inline"));
	};

	return (
		<div className="flex flex-col h-full bg-white dark:bg-slate-900">
			{/* Header */}
			<div className="border-b border-slate-200 dark:border-slate-700 p-4">
				<div className="flex items-center justify-between mb-3">
					<div className="flex items-center gap-4">
						<div className="text-sm">
							<span className="font-medium text-slate-900 dark:text-slate-100">
								Version {oldVersion.versionNumber}
							</span>
							<span className="text-slate-500 dark:text-slate-400 mx-2">→</span>
							<span className="font-medium text-slate-900 dark:text-slate-100">
								Version {newVersion.versionNumber}
							</span>
						</div>
					</div>
					<button
						type="button"
						onClick={toggleViewMode}
						className="px-3 py-1.5 text-sm font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors"
					>
						{viewMode === "inline" ? "Side-by-Side View" : "Inline View"}
					</button>
				</div>

				{/* Legend */}
				<div className="flex items-center gap-4 text-xs">
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

			{/* Diff Content */}
			<div className="flex-1 overflow-auto">
				{viewMode === "inline" ? (
					<InlineDiffView changes={diffChanges} />
				) : (
					<SideBySideDiffView
						oldContent={oldVersion.content}
						newContent={newVersion.content}
						changes={diffChanges}
					/>
				)}
			</div>
		</div>
	);
}

interface InlineDiffViewProps {
	changes: Diff.Change[];
}

function InlineDiffView({ changes }: InlineDiffViewProps) {
	return (
		<div
			className="p-4 font-mono text-sm leading-relaxed whitespace-pre-wrap"
			data-testid="diff-content"
		>
			{changes.map((change, index) => {
				if (change.added) {
					return (
						<span
							key={`add-${
								// biome-ignore lint/suspicious/noArrayIndexKey: changes array is stable during render
								index
							}`}
							className="bg-green-200 dark:bg-green-900/50 text-green-900 dark:text-green-100"
						>
							{change.value}
						</span>
					);
				}
				if (change.removed) {
					return (
						<span
							key={`remove-${
								// biome-ignore lint/suspicious/noArrayIndexKey: changes array is stable during render
								index
							}`}
							className="bg-red-200 dark:bg-red-900/50 text-red-900 dark:text-red-100 line-through"
						>
							{change.value}
						</span>
					);
				}
				return (
					<span
						key={`unchanged-${
							// biome-ignore lint/suspicious/noArrayIndexKey: changes array is stable during render
							index
						}`}
						className="text-slate-900 dark:text-slate-100"
					>
						{change.value}
					</span>
				);
			})}
		</div>
	);
}

interface SideBySideDiffViewProps {
	oldContent: string;
	newContent: string;
	changes: Diff.Change[];
}

function SideBySideDiffView({
	oldContent: _oldContent,
	newContent: _newContent,
	changes,
}: SideBySideDiffViewProps) {
	// Split content into lines for side-by-side view (currently unused but reserved for future enhancement)
	// const oldLines = _oldContent.split("\n");
	// const newLines = _newContent.split("\n");

	return (
		<div
			className="grid grid-cols-2 gap-0 h-full"
			data-testid="diff-content"
		>
			{/* Old Version (Left) */}
			<div className="border-r border-slate-200 dark:border-slate-700 overflow-auto">
				<div className="bg-slate-100 dark:bg-slate-800 px-4 py-2 sticky top-0 border-b border-slate-200 dark:border-slate-700">
					<div className="text-xs font-medium text-slate-700 dark:text-slate-300">
						Original
					</div>
				</div>
				<div className="p-4">
					<pre className="font-mono text-sm leading-relaxed whitespace-pre-wrap text-slate-900 dark:text-slate-100">
						{changes.map((change, index) => {
							if (change.removed) {
								return (
									<span
										key={`old-remove-${
											// biome-ignore lint/suspicious/noArrayIndexKey: changes array is stable during render
											index
										}`}
										className="bg-red-200 dark:bg-red-900/50 text-red-900 dark:text-red-100"
									>
										{change.value}
									</span>
								);
							}
							if (!change.added) {
								return (
									<span
										key={`old-unchanged-${
											// biome-ignore lint/suspicious/noArrayIndexKey: changes array is stable during render
											index
										}`}
									>
										{change.value}
									</span>
								);
							}
							return null;
						})}
					</pre>
				</div>
			</div>

			{/* New Version (Right) */}
			<div className="overflow-auto">
				<div className="bg-slate-100 dark:bg-slate-800 px-4 py-2 sticky top-0 border-b border-slate-200 dark:border-slate-700">
					<div className="text-xs font-medium text-slate-700 dark:text-slate-300">
						Modified
					</div>
				</div>
				<div className="p-4">
					<pre className="font-mono text-sm leading-relaxed whitespace-pre-wrap text-slate-900 dark:text-slate-100">
						{changes.map((change, index) => {
							if (change.added) {
								return (
									<span
										key={`new-add-${
											// biome-ignore lint/suspicious/noArrayIndexKey: changes array is stable during render
											index
										}`}
										className="bg-green-200 dark:bg-green-900/50 text-green-900 dark:text-green-100"
									>
										{change.value}
									</span>
								);
							}
							if (!change.removed) {
								return (
									<span
										key={`new-unchanged-${
											// biome-ignore lint/suspicious/noArrayIndexKey: changes array is stable during render
											index
										}`}
									>
										{change.value}
									</span>
								);
							}
							return null;
						})}
					</pre>
				</div>
			</div>
		</div>
	);
}
