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
			</div>
		</div>
	);
}
