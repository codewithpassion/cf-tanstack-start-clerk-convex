/**
 * Version history route for viewing and comparing content versions.
 * Displays version list, diff view, and restore functionality.
 */
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { useState } from "react";
import VersionHistory from "@/components/content/VersionHistory";
import VersionDiff from "@/components/content/VersionDiff";
import { ArrowLeft } from "lucide-react";

export const Route = createFileRoute(
	"/_authed/projects/$projectId/content/$contentId/versions"
)({
	component: VersionHistoryPage,
});

function VersionHistoryPage() {
	const { projectId, contentId } = Route.useParams();
	const navigate = useNavigate();
	const [selectedVersions, setSelectedVersions] = useState<{
		old: Id<"contentVersions"> | null;
		new: Id<"contentVersions"> | null;
	}>({
		old: null,
		new: null,
	});

	// Load content piece to get current version number
	const contentPiece = useQuery(api.contentPieces.getContentPiece, {
		contentPieceId: contentId as Id<"contentPieces">,
	});

	// Load versions for selection
	const versionsData = useQuery(api.contentVersions.listVersions, {
		contentPieceId: contentId as Id<"contentPieces">,
		limit: 50,
		offset: 0,
	});

	// Load selected versions for diff
	const oldVersion = useQuery(
		api.contentVersions.getVersion,
		selectedVersions.old ? { versionId: selectedVersions.old } : "skip"
	);

	const newVersion = useQuery(
		api.contentVersions.getVersion,
		selectedVersions.new ? { versionId: selectedVersions.new } : "skip"
	);

	const handleRestore = () => {
		// Navigate back to editor after restore
		navigate({
			to: "/projects/$projectId/content/$contentId",
			params: { projectId, contentId },
			search: {},
		});
	};

	if (!contentPiece || !versionsData) {
		return (
			<div className="flex items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-900">
				<div className="text-slate-600 dark:text-slate-400">
					Loading version history...
				</div>
			</div>
		);
	}

	const { versions } = versionsData;

	// Get highest version number as current
	const currentVersionNumber = versions.length > 0
		? Math.max(...versions.map((v) => v.versionNumber))
		: 1;

	const showDiffView =
		selectedVersions.old &&
		selectedVersions.new &&
		oldVersion &&
		newVersion;

	return (
		<div className="min-h-screen bg-slate-50 dark:bg-slate-900">
			{/* Header */}
			<div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-4">
							<Link
								to="/projects/$projectId/content/$contentId"
								params={{ projectId, contentId }}
								search={{}}
								className="inline-flex items-center gap-2 text-sm font-medium text-cyan-600 dark:text-cyan-400 hover:text-cyan-700 dark:hover:text-cyan-300 transition-colors"
							>
								<ArrowLeft className="w-4 h-4" />
								Back to Editor
							</Link>
							<div className="h-6 w-px bg-slate-300 dark:bg-slate-600" />
							<h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
								Version History
							</h1>
						</div>
					</div>

					{/* Version Selection for Diff */}
					{versions.length >= 2 && showDiffView && (
						<div className="mt-4 flex items-center gap-4">
							<button
								type="button"
								onClick={() =>
									setSelectedVersions({
										old: null,
										new: null,
									})
								}
								className="text-sm text-cyan-600 dark:text-cyan-400 hover:text-cyan-700 dark:hover:text-cyan-300"
							>
								← Back to version list
							</button>
						</div>
					)}

					{versions.length >= 2 && !showDiffView && (
						<div className="mt-4 flex items-center gap-4">
							<label className="text-sm text-slate-600 dark:text-slate-400">
								Compare versions:
							</label>
							<select
								value={selectedVersions.old || ""}
								onChange={(e) =>
									setSelectedVersions((prev) => ({
										...prev,
										old: e.target.value as Id<"contentVersions">,
									}))
								}
								className="px-3 py-1.5 text-sm border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
							>
								<option value="">Select old version</option>
								{versions.map((v) => (
									<option key={v._id} value={v._id}>
										v{v.versionNumber}
										{v.label && ` - ${v.label}`}
									</option>
								))}
							</select>
							<span className="text-slate-400">vs</span>
							<select
								value={selectedVersions.new || ""}
								onChange={(e) =>
									setSelectedVersions((prev) => ({
										...prev,
										new: e.target.value as Id<"contentVersions">,
									}))
								}
								className="px-3 py-1.5 text-sm border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
							>
								<option value="">Select new version</option>
								{versions.map((v) => (
									<option key={v._id} value={v._id}>
										v{v.versionNumber}
										{v.label && ` - ${v.label}`}
									</option>
								))}
							</select>
						</div>
					)}
				</div>
			</div>

			{/* Main Content */}
			<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
				{showDiffView ? (
					<VersionDiff
						oldVersion={oldVersion}
						newVersion={newVersion}
					/>
				) : (
					<VersionHistory
						contentPieceId={contentId as Id<"contentPieces">}
						currentVersion={currentVersionNumber}
						onRestore={handleRestore}
					/>
				)}
			</div>
		</div>
	);
}
