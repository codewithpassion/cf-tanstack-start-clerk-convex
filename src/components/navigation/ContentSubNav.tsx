import { Link } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";

export interface ContentSubNavProps {
	title: string;
	projectId: string;
	persona?: {
		name: string;
	} | null;
	brandVoice?: {
		name: string;
	} | null;
	isSaving?: boolean;
	lastSaved?: Date | null;
	onOpenMobileTools?: () => void;
	onOpenMobileImages?: () => void;
}

/**
 * Slim sub-navigation bar for content pages.
 * Shows back button, content title, and persona/voice badges.
 */
export function ContentSubNav({
	title,
	projectId,
	persona,
	brandVoice,
	isSaving,
	lastSaved,
	onOpenMobileTools,
	onOpenMobileImages,
}: ContentSubNavProps) {
	return (
		<div className="bg-slate-900/80 border-b border-slate-800">
			<div className="flex flex-col lg:flex-row lg:items-center justify-between h-auto py-3 lg:py-0 lg:h-11 px-4 gap-2 lg:gap-0">
				{/* Top Row: Back + Title + (Desktop Badges) */}
				<div className="flex items-center gap-3 min-w-0 flex-1">
					<Link
						to="/projects/$projectId"
						params={{ projectId }}
						className="p-1.5 hover:bg-slate-800 rounded-lg transition-colors text-slate-400 flex-shrink-0"
					>
						<ChevronLeft className="w-4 h-4" />
					</Link>

					<h1 className="text-sm font-medium text-slate-100 truncate">
						{title}
					</h1>

					{/* Desktop Badges (Hidden on Mobile) */}
					<div className="hidden lg:flex items-center gap-1.5 flex-shrink-0">
						<BadgeList persona={persona} brandVoice={brandVoice} />
					</div>
				</div>

				{/* Bottom Section (Mobile: Badges -> Buttons) / Right Side (Desktop: Save -> Actions) */}
				<div className="flex flex-col lg:flex-row items-start lg:items-center gap-3 w-full lg:w-auto mt-2 lg:mt-0">
					{/* Row 2 (Mobile): Badges */}
					<div className="flex lg:hidden items-center gap-1.5 w-full overflow-x-auto no-scrollbar mask-linear-fade">
						<BadgeList persona={persona} brandVoice={brandVoice} />
					</div>

					{/* Row 3 (Mobile): Actions / Save Indicator */}
					<div className="flex items-center justify-between lg:justify-end gap-3 w-full lg:w-auto">
						<div className="hidden sm:block text-xs text-slate-400">
							{isSaving && (
								<span className="flex items-center gap-2">
									<div className="animate-spin rounded-full h-3 w-3 border-b-2 border-cyan-500" />
									Saving...
								</span>
							)}
							{!isSaving && lastSaved && (
								<span>
									Saved at{" "}
									{lastSaved.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
								</span>
							)}
						</div>

						{/* Mobile Actions */}
						<div className="flex items-center gap-2 lg:hidden ml-auto">
							<button
								onClick={onOpenMobileImages}
								className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-md text-slate-300 text-xs font-medium transition-colors border border-slate-700"
								type="button"
							>
								Images
							</button>
							<button
								onClick={onOpenMobileTools}
								className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-700 rounded-md text-white text-xs font-medium transition-colors shadow-sm shadow-cyan-900/20"
								type="button"
							>
								Actions
							</button>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}

function BadgeList({ persona, brandVoice }: {
	persona?: { name: string } | null;
	brandVoice?: { name: string } | null;
}) {
	return (
		<>
			{persona && (
				<span className="px-2 py-0.5 text-xs font-medium bg-pink-500/15 text-pink-400 rounded-full border border-pink-500/20 whitespace-nowrap">
					{persona.name}
				</span>
			)}
			{brandVoice && (
				<span className="px-2 py-0.5 text-xs font-medium bg-purple-500/15 text-purple-400 rounded-full border border-purple-500/20 whitespace-nowrap">
					{brandVoice.name}
				</span>
			)}
		</>
	);
}
