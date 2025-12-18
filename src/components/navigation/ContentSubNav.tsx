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
}: ContentSubNavProps) {
	return (
		<div className="bg-slate-900/80 border-b border-slate-800">
			<div className="flex items-center justify-between h-11 px-4">
				{/* Left: Back + Content Title + Badges */}
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

					<div className="flex items-center gap-1.5 flex-shrink-0">
						{persona && (
							<span className="px-2 py-0.5 text-xs font-medium bg-pink-500/15 text-pink-400 rounded-full border border-pink-500/20">
								{persona.name}
							</span>
						)}
						{brandVoice && (
							<span className="px-2 py-0.5 text-xs font-medium bg-purple-500/15 text-purple-400 rounded-full border border-purple-500/20">
								{brandVoice.name}
							</span>
						)}
					</div>
				</div>

				{/* Right: Save Indicator & Mobile Tools */}
				<div className="flex items-center gap-3 flex-shrink-0">
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

					{/* Mobile Tools Toggle */}
					<button
						onClick={onOpenMobileTools}
						className="lg:hidden p-1.5 hover:bg-slate-800 rounded-lg transition-colors text-slate-400"
						aria-label="Open tools"
						type="button"
					>
						<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
						</svg>
					</button>
				</div>
			</div>
		</div>
	);
}
