/**
 * VersionHistorySidebar component provides a floating sidebar for viewing version history.
 * Features overlay backdrop, ESC key handling, focus management, and responsive layout.
 * Desktop: Two-panel grid (list + diff). Mobile: Tabs for list/diff views.
 */
import { useState, useEffect, useRef } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/api";
import type { Id } from "@/convex/dataModel";
import { VersionListPanel } from "./VersionListPanel";
import { VersionDiffPanel } from "./VersionDiffPanel";

interface VersionHistorySidebarProps {
	isOpen: boolean;
	onClose: () => void;
	contentPieceId: Id<"contentPieces">;
	currentVersion: number;
}

export function VersionHistorySidebar({
	isOpen,
	onClose,
	contentPieceId,
	currentVersion,
}: VersionHistorySidebarProps) {
	const [selectedVersionId, setSelectedVersionId] = useState<
		Id<"contentVersions"> | null
	>(null);
	const [activeTab, setActiveTab] = useState<"list" | "diff">("list");
	const closeButtonRef = useRef<HTMLButtonElement>(null);

	// Query latest version to get its ID and number for diff comparison
	const versionsData = useQuery(api.contentVersions.listVersions, {
		contentPieceId,
		limit: 1,
		offset: 0,
	});

	const currentVersionId = versionsData?.versions[0]?._id || null;
	const currentVersionNumber = versionsData?.versions[0]?.versionNumber || currentVersion;

	// ESC key handler
	useEffect(() => {
		const handleEsc = (e: KeyboardEvent) => {
			if (e.key === "Escape") onClose();
		};
		if (isOpen) {
			document.addEventListener("keydown", handleEsc);
		}
		return () => document.removeEventListener("keydown", handleEsc);
	}, [isOpen, onClose]);

	// Body scroll lock
	useEffect(() => {
		if (isOpen) {
			document.body.style.overflow = "hidden";
		}
		return () => {
			document.body.style.overflow = "";
		};
	}, [isOpen]);

	// Focus management
	useEffect(() => {
		if (isOpen && closeButtonRef.current) {
			closeButtonRef.current.focus();
		}
	}, [isOpen]);

	// Auto-switch to diff tab on mobile when version selected
	useEffect(() => {
		if (selectedVersionId && window.innerWidth < 1024) {
			setActiveTab("diff");
		}
	}, [selectedVersionId]);

	// Reset state when sidebar closes
	useEffect(() => {
		if (!isOpen) {
			setSelectedVersionId(null);
			setActiveTab("list");
		}
	}, [isOpen]);

	const handleVersionSelect = (versionId: Id<"contentVersions">) => {
		setSelectedVersionId(versionId);
	};

	const handleRestore = () => {
		onClose();
	};

	if (!isOpen) return null;

	return (
		<div className="fixed inset-0 z-50" role="dialog" aria-modal="true">
			{/* Backdrop */}
			<div
				className="fixed inset-0 bg-gray-500 dark:bg-gray-900 bg-opacity-75 dark:bg-opacity-85 transition-opacity"
				onClick={onClose}
				aria-hidden="true"
			/>

			{/* Sidebar Panel */}
			<div className="fixed inset-y-0 right-0 max-w-7xl w-screen lg:w-[80vw] flex flex-col bg-white dark:bg-slate-900 shadow-xl">
				{/* Header */}
				<header className="flex items-center justify-between border-b border-gray-200 dark:border-slate-700 px-6 py-4 bg-white dark:bg-slate-900">
					<h2
						id="sidebar-title"
						className="text-lg font-semibold text-gray-900 dark:text-slate-100"
					>
						Version History
					</h2>
					<button
						ref={closeButtonRef}
						type="button"
						onClick={onClose}
						aria-label="Close version history"
						className="rounded-md text-gray-400 hover:text-gray-500 dark:text-slate-400 dark:hover:text-slate-300 focus:outline-none focus:ring-2 focus:ring-cyan-500"
					>
						<svg
							className="h-6 w-6"
							fill="none"
							viewBox="0 0 24 24"
							strokeWidth="1.5"
							stroke="currentColor"
						>
							<title>Close</title>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								d="M6 18L18 6M6 6l12 12"
							/>
						</svg>
					</button>
				</header>

				{/* Desktop: Two-panel grid */}
				<div className="hidden lg:grid lg:grid-cols-2 flex-1 overflow-hidden">
					<div className="overflow-y-auto border-r border-gray-200 dark:border-slate-700">
						<VersionDiffPanel
							selectedVersionId={selectedVersionId}
							currentVersionId={currentVersionId}
							contentPieceId={contentPieceId}
						/>
					</div>
					<div className="overflow-y-auto">
						<VersionListPanel
							contentPieceId={contentPieceId}
							currentVersion={currentVersionNumber}
							selectedVersionId={selectedVersionId}
							onVersionSelect={handleVersionSelect}
							onRestore={handleRestore}
						/>
					</div>
				</div>

				{/* Mobile: Tabs */}
				<div className="lg:hidden flex-1 flex flex-col overflow-hidden">
					{/* Tab List */}
					<div className="flex border-b border-gray-200 dark:border-slate-700">
						<button
							type="button"
							onClick={() => setActiveTab("list")}
							className={`flex-1 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
								activeTab === "list"
									? "border-cyan-500 text-cyan-600 dark:text-cyan-400"
									: "border-transparent text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-300 hover:border-gray-300 dark:hover:border-slate-600"
							}`}
						>
							Versions
						</button>
						<button
							type="button"
							onClick={() => setActiveTab("diff")}
							disabled={!selectedVersionId}
							className={`flex-1 px-4 py-3 text-sm font-medium border-b-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
								activeTab === "diff"
									? "border-cyan-500 text-cyan-600 dark:text-cyan-400"
									: "border-transparent text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-300 hover:border-gray-300 dark:hover:border-slate-600"
							}`}
						>
							Changes
						</button>
					</div>

					{/* Tab Content */}
					<div className="flex-1 overflow-hidden">
						{activeTab === "list" ? (
							<VersionListPanel
								contentPieceId={contentPieceId}
								currentVersion={currentVersionNumber}
								selectedVersionId={selectedVersionId}
								onVersionSelect={handleVersionSelect}
								onRestore={handleRestore}
							/>
						) : (
							<VersionDiffPanel
								selectedVersionId={selectedVersionId}
								currentVersionId={currentVersionId}
								contentPieceId={contentPieceId}
							/>
						)}
					</div>
				</div>
			</div>
		</div>
	);
}
