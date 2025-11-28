/**
 * VersionListPanel component displays a list of content versions with pagination.
 * Shows version number, timestamp, label, current version indicator, and finalized badge.
 * Provides restore functionality and selection for diff comparison.
 */
import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/api";
import type { Id } from "@/convex/dataModel";
import { formatDistanceToNow } from "date-fns";

interface VersionListPanelProps {
	contentPieceId: Id<"contentPieces">;
	currentVersion: number;
	selectedVersionId: Id<"contentVersions"> | null;
	onVersionSelect: (versionId: Id<"contentVersions">) => void;
	onRestore?: () => void;
}

export function VersionListPanel({
	contentPieceId,
	currentVersion,
	selectedVersionId,
	onVersionSelect,
	onRestore,
}: VersionListPanelProps) {
	const [offset, setOffset] = useState(0);
	const [limit] = useState(50);
	const [restoreConfirmId, setRestoreConfirmId] = useState<
		Id<"contentVersions"> | null
	>(null);

	const versionsData = useQuery(api.contentVersions.listVersions, {
		contentPieceId,
		limit,
		offset,
	});

	const restoreVersion = useMutation(api.contentVersions.restoreVersion);

	const handleRestore = async (versionId: Id<"contentVersions">) => {
		try {
			await restoreVersion({ versionId });
			setRestoreConfirmId(null);
			onRestore?.();
		} catch (error) {
			console.error("Failed to restore version:", error);
		}
	};

	const handlePreviousPage = () => {
		setOffset(Math.max(0, offset - limit));
	};

	const handleNextPage = () => {
		setOffset(offset + limit);
	};

	if (!versionsData) {
		return (
			<div className="flex items-center justify-center p-8">
				<div className="text-slate-600 dark:text-slate-400">
					Loading versions...
				</div>
			</div>
		);
	}

	const { versions, totalCount, hasMore } = versionsData;

	if (versions.length === 0) {
		return (
			<div className="flex items-center justify-center p-8">
				<div className="text-center">
					<p className="text-slate-600 dark:text-slate-400 font-medium">
						No version history yet
					</p>
					<p className="text-sm text-slate-500 dark:text-slate-500 mt-2">
						Versions are created when you save or finalize content
					</p>
				</div>
			</div>
		);
	}

	return (
		<div className="flex flex-col h-full">
			{/* Version List */}
			<div className="flex-1 overflow-y-auto">
				<div className="space-y-2 p-4">
					{versions.map((version) => {
						const isCurrent = version.versionNumber === currentVersion;
						const isFinalized = version.isFinalizedVersion;
						const isSelected = selectedVersionId === version._id;

						return (
							<div
								key={version._id}
								onClick={() => onVersionSelect(version._id)}
								className={`border rounded-lg p-4 transition-all cursor-pointer ${
									isCurrent
										? "border-cyan-500 bg-cyan-50 dark:bg-cyan-950/30 dark:border-cyan-600"
										: "border-slate-200 bg-white dark:bg-slate-800 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600"
								} ${
									isSelected
										? "ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-950/30"
										: ""
								}`}
							>
								<div className="flex items-start justify-between gap-4">
									<div className="flex-1 min-w-0">
										{/* Version Header */}
										<div className="flex items-center gap-2 mb-1">
											<h3 className="font-medium text-slate-900 dark:text-slate-100">
												Version {version.versionNumber}
											</h3>
											{isCurrent && (
												<span className="px-2 py-0.5 text-xs font-medium rounded bg-cyan-500 text-white">
													Current
												</span>
											)}
											{isFinalized && version.finalizedVersionNumber && (
												<span className="px-2 py-0.5 text-xs font-medium rounded bg-green-500 text-white">
													Finalized v{version.finalizedVersionNumber}
												</span>
											)}
										</div>

										{/* Version Label */}
										{version.label && (
											<p className="text-sm text-slate-700 dark:text-slate-300 mb-1">
												{version.label}
											</p>
										)}

										{/* Timestamp */}
										<p className="text-xs text-slate-500 dark:text-slate-400">
											{formatDistanceToNow(version.createdAt, {
												addSuffix: true,
											})}
										</p>
									</div>

									{/* Actions */}
									<div
										className="flex items-center gap-2"
										onClick={(e) => e.stopPropagation()}
									>
										{!isCurrent && (
											<>
												{restoreConfirmId === version._id ? (
													<div className="flex items-center gap-2">
														<button
															type="button"
															onClick={() => handleRestore(version._id)}
															className="px-3 py-1.5 text-sm font-medium text-white bg-cyan-600 hover:bg-cyan-700 rounded transition-colors"
														>
															Confirm
														</button>
														<button
															type="button"
															onClick={() => setRestoreConfirmId(null)}
															className="px-3 py-1.5 text-sm font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded transition-colors"
														>
															Cancel
														</button>
													</div>
												) : (
													<button
														type="button"
														onClick={() => setRestoreConfirmId(version._id)}
														className="px-3 py-1.5 text-sm font-medium text-cyan-600 dark:text-cyan-400 hover:bg-cyan-50 dark:hover:bg-cyan-950/50 rounded transition-colors"
													>
														Restore
													</button>
												)}
											</>
										)}
									</div>
								</div>
							</div>
						);
					})}
				</div>
			</div>

			{/* Pagination Controls */}
			{totalCount > limit && (
				<div className="border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4">
					<div className="flex items-center justify-between">
						<div className="text-sm text-slate-600 dark:text-slate-400">
							Showing {offset + 1}-{Math.min(offset + limit, totalCount)} of{" "}
							{totalCount} versions
						</div>
						<div className="flex items-center gap-2">
							<button
								type="button"
								onClick={handlePreviousPage}
								disabled={offset === 0}
								className="px-3 py-1.5 text-sm font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded hover:bg-slate-50 dark:hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
							>
								Previous
							</button>
							<button
								type="button"
								onClick={handleNextPage}
								disabled={!hasMore}
								className="px-3 py-1.5 text-sm font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded hover:bg-slate-50 dark:hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
							>
								Next
							</button>
						</div>
					</div>
				</div>
			)}

			{/* Restore Warning */}
			{restoreConfirmId && (
				<div className="border-t border-slate-200 dark:border-slate-700 bg-amber-50 dark:bg-amber-950/30 p-4">
					<p className="text-sm text-amber-800 dark:text-amber-200">
						Restoring will create a new version with this content. This action
						is non-destructive and preserves all history.
					</p>
				</div>
			)}
		</div>
	);
}
