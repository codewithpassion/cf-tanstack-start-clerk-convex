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
	const [isAnimating, setIsAnimating] = useState(false);
	const closeButtonRef = useRef<HTMLButtonElement>(null);

	// Animation state management
	useEffect(() => {
		if (isOpen) {
			setIsAnimating(true);
		}
	}, [isOpen]);

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
			setIsAnimating(false);
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
		<>
			{/* Backdrop with blur */}
			<div
				className={`fixed inset-0 bg-black/20 dark:bg-black/40 backdrop-blur-sm transition-opacity duration-300 z-40 ${
					isAnimating ? "opacity-100" : "opacity-0"
				}`}
				onClick={onClose}
				aria-hidden="true"
			/>

			{/* Sidebar Panel - Desktop: slide from right, 2/3 width. Mobile: slide from bottom, full width */}
			<div
				className={`fixed bottom-0 left-0 right-0 max-h-[80vh] lg:max-h-full lg:inset-y-0 lg:left-auto lg:right-0 lg:w-2/3 flex flex-col bg-white dark:bg-slate-900 shadow-2xl transition-transform duration-300 ease-out rounded-t-2xl lg:rounded-none z-50 border-l border-slate-200 dark:border-slate-700 ${
					isAnimating
						? "translate-y-0 lg:translate-x-0"
						: "translate-y-full lg:translate-y-0 lg:translate-x-full"
				}`}
				role="dialog"
				aria-modal="false"
			>
				{/* Header */}
				<header className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 px-6 py-4 bg-white dark:bg-slate-900">
					<h2
						id="sidebar-title"
						className="text-lg font-semibold text-slate-900 dark:text-slate-100"
					>
						Version History
					</h2>
					<button
						ref={closeButtonRef}
						type="button"
						onClick={onClose}
						aria-label="Close version history"
						className="rounded-md text-slate-400 hover:text-slate-500 dark:text-slate-400 dark:hover:text-slate-300 focus:outline-none focus:ring-2 focus:ring-cyan-500"
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

				{/* Desktop: Two-panel grid - Diff (2/3) and Version List (1/3) */}
				<div className="hidden lg:grid lg:grid-cols-3 flex-1 overflow-hidden">
					<div className="lg:col-span-2 overflow-y-auto border-r border-slate-200 dark:border-slate-700">
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
					<div className="flex border-b border-slate-200 dark:border-slate-700">
						<button
							type="button"
							onClick={() => setActiveTab("list")}
							className={`flex-1 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
								activeTab === "list"
									? "border-cyan-500 text-cyan-600 dark:text-cyan-400"
									: "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600"
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
									: "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600"
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
		</>
	);
}
