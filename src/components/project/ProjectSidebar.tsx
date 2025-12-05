import { Link, useMatchRoute } from "@tanstack/react-router";
import { X } from "lucide-react";
import type { ProjectId } from "@/types/entities";

export interface ProjectSidebarProps {
	projectId: ProjectId;
	onClose?: () => void;
}

interface NavItem {
	name: string;
	to: string;
	icon: React.ReactNode;
}

/**
 * Project workspace sidebar navigation.
 * Shows links to all project sections with active state highlighting.
 * Organized into: Dashboard, Content, Configuration (always expanded), and Settings.
 * On mobile, can be closed via onClose callback.
 */
export function ProjectSidebar({ projectId, onClose }: ProjectSidebarProps) {
	const matchRoute = useMatchRoute();

	const isActive = (path: string) => {
		return matchRoute({ to: path, params: { projectId } });
	};


	const configurationItems: NavItem[] = [
		{
			name: "Categories",
			to: "/projects/$projectId/categories",
			icon: (
				<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<title>Categories</title>
					<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
				</svg>
			),
		},
		{
			name: "Brand Voice",
			to: "/projects/$projectId/brand-voices",
			icon: (
				<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<title>Brand Voice</title>
					<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
				</svg>
			),
		},
		{
			name: "Personas",
			to: "/projects/$projectId/personas",
			icon: (
				<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<title>Personas</title>
					<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
				</svg>
			),
		},
		{
			name: "Knowledge Base",
			to: "/projects/$projectId/knowledge-base",
			icon: (
				<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<title>Knowledge Base</title>
					<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
				</svg>
			),
		},
		{
			name: "Examples",
			to: "/projects/$projectId/examples",
			icon: (
				<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<title>Examples</title>
					<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
				</svg>
			),
		},
	];

	// Close sidebar when clicking a link on mobile
	const handleLinkClick = () => {
		if (onClose && window.innerWidth < 1024) {
			onClose();
		}
	};

	return (
		<aside className="w-64 h-full bg-white dark:bg-slate-950 border-r border-slate-200 dark:border-slate-800 flex-shrink-0 flex flex-col">
			{/* Mobile close button */}
			{onClose && (
				<div className="lg:hidden flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-800">
					<span className="font-semibold text-slate-900 dark:text-white">Navigation</span>
					<button
						type="button"
						onClick={onClose}
						className="p-2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
						aria-label="Close navigation"
					>
						<X className="w-5 h-5" />
					</button>
				</div>
			)}
			<nav className="p-4 space-y-1 flex-1 overflow-y-auto" aria-label="Project navigation">
				{/* Content */}
				<Link
					to="/projects/$projectId"
					params={{ projectId }}
					onClick={handleLinkClick}
					className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${isActive("/projects/$projectId/")
						? "bg-cyan-50 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-100 border-l-4 border-cyan-700 dark:border-cyan-500 -ml-px pl-2"
						: "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900 hover:text-slate-900 dark:hover:text-white"
						}`}
					aria-current={isActive("/projects/$projectId/") ? "page" : undefined}
				>
					<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<title>Content</title>
						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
					</svg>
					Content
				</Link>

				{/* Configuration Section */}
				<div className="pt-4 mt-4">
					<h3 className="px-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
						Configuration
					</h3>
					<div className="mt-2 space-y-1">
						{configurationItems.map((item) => {
							const active = isActive(item.to);
							return (
								<Link
									key={item.name}
									to={item.to}
									params={{ projectId }}
									onClick={handleLinkClick}
									className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors pl-6 ${active
										? "bg-cyan-50 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-100 border-l-4 border-cyan-700 dark:border-cyan-500 -ml-px pl-5"
										: "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900 hover:text-slate-900 dark:hover:text-white"
										}`}
									aria-current={active ? "page" : undefined}
								>
									{item.icon}
									{item.name}
								</Link>
							);
						})}
					</div>
				</div>

				{/* Settings */}
				<div className="pt-4 mt-4 border-t border-slate-200 dark:border-slate-800">
					<Link
						to="/projects/$projectId/settings"
						params={{ projectId }}
						onClick={handleLinkClick}
						className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${isActive("/projects/$projectId/settings")
							? "bg-cyan-50 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-100 border-l-4 border-cyan-700 dark:border-cyan-500 -ml-px pl-2"
							: "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900 hover:text-slate-900 dark:hover:text-white"
							}`}
					>
						<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<title>Settings</title>
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
						</svg>
						Settings
					</Link>
				</div>
			</nav>
		</aside>
	);
}
