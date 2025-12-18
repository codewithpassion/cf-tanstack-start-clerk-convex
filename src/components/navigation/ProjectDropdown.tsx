import { Link } from "@tanstack/react-router";
import { ChevronDown, Settings, Mic, Users, BookOpen, FileText } from "lucide-react";
import type { Project } from "@/types/entities";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
	DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";

export interface ProjectDropdownProps {
	project: Project;
	onOpenBrandVoices: () => void;
	onOpenPersonas: () => void;
	onOpenKnowledgeBase: () => void;
	onOpenExamples: () => void;
	trigger?: React.ReactNode;
}

/**
 * Project dropdown for the header.
 * Shows current project name and provides access to:
 * - Project configuration (Brand Voice, Personas, Knowledge Base, Examples)
 * - Project Settings
 */
export function ProjectDropdown({
	project,
	onOpenBrandVoices,
	onOpenPersonas,
	onOpenKnowledgeBase,
	onOpenExamples,
	trigger,
}: ProjectDropdownProps) {
	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				{trigger || (
					<button
						type="button"
						className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800 text-white text-sm font-medium hover:bg-slate-700 transition-colors"
					>
						<span className="w-2 h-2 rounded-full bg-emerald-400" />
						<span className="truncate max-w-[180px]">{project.name}</span>
						<ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0" />
					</button>
				)}
			</DropdownMenuTrigger>

			<DropdownMenuContent align="start" className="w-72">
				<DropdownMenuLabel className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
					Project Config
				</DropdownMenuLabel>

				<DropdownMenuItem onClick={onOpenBrandVoices} className="py-2.5">
					<div className="flex items-center gap-3">
						<span className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center flex-shrink-0">
							<Mic className="w-3.5 h-3.5 text-white" />
						</span>
						<div className="min-w-0">
							<div className="font-medium text-slate-200 text-sm">Brand Voice</div>
							<div className="text-xs text-slate-500 truncate">Tone and style settings</div>
						</div>
					</div>
				</DropdownMenuItem>

				<DropdownMenuItem onClick={onOpenPersonas} className="py-2.5">
					<div className="flex items-center gap-3">
						<span className="w-7 h-7 rounded-lg bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center flex-shrink-0">
							<Users className="w-3.5 h-3.5 text-white" />
						</span>
						<div className="min-w-0">
							<div className="font-medium text-slate-200 text-sm">Personas</div>
							<div className="text-xs text-slate-500 truncate">Target audience profiles</div>
						</div>
					</div>
				</DropdownMenuItem>

				<DropdownMenuItem onClick={onOpenKnowledgeBase} className="py-2.5">
					<div className="flex items-center gap-3">
						<span className="w-7 h-7 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center flex-shrink-0">
							<BookOpen className="w-3.5 h-3.5 text-white" />
						</span>
						<div className="min-w-0">
							<div className="font-medium text-slate-200 text-sm">Knowledge Base</div>
							<div className="text-xs text-slate-500 truncate">Reference documents</div>
						</div>
					</div>
				</DropdownMenuItem>

				<DropdownMenuItem onClick={onOpenExamples} className="py-2.5">
					<div className="flex items-center gap-3">
						<span className="w-7 h-7 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center flex-shrink-0">
							<FileText className="w-3.5 h-3.5 text-white" />
						</span>
						<div className="min-w-0">
							<div className="font-medium text-slate-200 text-sm">Examples</div>
							<div className="text-xs text-slate-500 truncate">Sample content</div>
						</div>
					</div>
				</DropdownMenuItem>

				<DropdownMenuSeparator />

				<DropdownMenuItem asChild>
					<Link
						to="/projects/$projectId/settings"
						params={{ projectId: project._id }}
						className="flex items-center gap-3 text-slate-400"
					>
						<Settings className="w-4 h-4" />
						<span className="font-medium text-sm">Project Settings</span>
					</Link>
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
