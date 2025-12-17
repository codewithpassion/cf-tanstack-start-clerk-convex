import { Link } from "@tanstack/react-router";
import { ChevronDown, Settings } from "lucide-react";
import type { Project } from "@/types/entities";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export interface ProjectHeaderProps {
	project: Project;
	onOpenBrandVoices: () => void;
	onOpenPersonas: () => void;
	onOpenKnowledgeBase: () => void;
	onOpenExamples: () => void;
}

/**
 * Project header with breadcrumb navigation and project name.
 * Shows navigation path from dashboard to current project.
 * Includes configuration buttons for desktop and dropdown for mobile.
 */
export function ProjectHeader({ project, onOpenBrandVoices, onOpenPersonas, onOpenKnowledgeBase, onOpenExamples }: ProjectHeaderProps) {
	return (
		<div className="bg-white dark:bg-slate-900 border-b-2 border-slate-200 dark:border-b-amber-400/20 px-4 md:px-6 py-4">
			{/* Breadcrumb navigation */}
			<nav className="flex mb-2" aria-label="Breadcrumb">
				<ol className="flex items-center space-x-2 text-sm">
					<li>
						<Link
							to="/dashboard"
							className="text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-amber-400 transition-colors relative group"
						>
							Dashboard
							<span className="absolute bottom-0 left-0 w-0 h-0.5 bg-amber-400 transition-all duration-300 group-hover:w-full" />
						</Link>
					</li>
					<li>
						<svg className="w-4 h-4 text-slate-400 dark:text-slate-500" fill="currentColor" viewBox="0 0 20 20">
							<title>Separator</title>
							<path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
						</svg>
					</li>
					<li>
						<span className="text-slate-900 dark:text-white font-medium truncate max-w-[150px] md:max-w-none inline-block align-bottom">
							{project.name}
						</span>
					</li>
				</ol>
			</nav>

			{/* Project name and description */}
			<div className="flex items-start justify-between gap-3">
				<div className="flex items-center gap-3 min-w-0">
					<div className="min-w-0">
						<h1 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-amber-50 truncate font-['Lexend']">
							{project.name}
						</h1>
						{project.description && (
							<p className="mt-1 text-sm text-slate-600 dark:text-slate-400 line-clamp-1 md:line-clamp-none">
								{project.description}
							</p>
						)}
					</div>
				</div>

				{/* Desktop config buttons */}
				<div className="hidden lg:flex items-center gap-2">
					<button
						type="button"
						onClick={onOpenBrandVoices}
						className="px-3 py-2 text-sm font-medium rounded-md text-cyan-700 dark:text-cyan-400 hover:bg-cyan-50 dark:hover:bg-cyan-900/20 border border-cyan-200 dark:border-cyan-800 transition-colors"
					>
						Brand Voice
					</button>
					<button
						type="button"
						onClick={onOpenPersonas}
						className="px-3 py-2 text-sm font-medium rounded-md text-cyan-700 dark:text-cyan-400 hover:bg-cyan-50 dark:hover:bg-cyan-900/20 border border-cyan-200 dark:border-cyan-800 transition-colors"
					>
						Personas
					</button>
					<button
						type="button"
						onClick={onOpenKnowledgeBase}
						className="px-3 py-2 text-sm font-medium rounded-md text-cyan-700 dark:text-cyan-400 hover:bg-cyan-50 dark:hover:bg-cyan-900/20 border border-cyan-200 dark:border-cyan-800 transition-colors"
					>
						Knowledge Base
					</button>
					<button
						type="button"
						onClick={onOpenExamples}
						className="px-3 py-2 text-sm font-medium rounded-md text-cyan-700 dark:text-cyan-400 hover:bg-cyan-50 dark:hover:bg-cyan-900/20 border border-cyan-200 dark:border-cyan-800 transition-colors"
					>
						Examples
					</button>
					<Link
						to="/projects/$projectId/settings"
						params={{ projectId: project._id }}
						className="px-3 py-2 text-sm font-medium rounded-md text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-300 dark:border-slate-700 transition-colors inline-flex items-center gap-1.5"
					>
						<Settings className="w-4 h-4" />
						Settings
					</Link>
				</div>

				{/* Mobile config dropdown */}
				<div className="lg:hidden">
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<button
								type="button"
								className="px-3 py-2 text-sm font-medium rounded-md text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-300 dark:border-slate-700 transition-colors inline-flex items-center gap-1"
							>
								Configure
								<ChevronDown className="w-4 h-4" />
							</button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end">
							<DropdownMenuItem onClick={onOpenBrandVoices}>
								Brand Voice
							</DropdownMenuItem>
							<DropdownMenuItem onClick={onOpenPersonas}>
								Personas
							</DropdownMenuItem>
							<DropdownMenuItem onClick={onOpenKnowledgeBase}>
								Knowledge Base
							</DropdownMenuItem>
							<DropdownMenuItem onClick={onOpenExamples}>
								Examples
							</DropdownMenuItem>
							<DropdownMenuSeparator />
							<DropdownMenuItem asChild>
								<Link
									to="/projects/$projectId/settings"
									params={{ projectId: project._id }}
									className="flex items-center gap-2"
								>
									<Settings className="w-4 h-4" />
									Settings
								</Link>
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
				</div>
			</div>
		</div>
	);
}
