import { Link } from "@tanstack/react-router";

import { useState } from "react";
import {
	Home,
	Menu,
	X,
	User,
	LayoutDashboard,
	CreditCard,
} from "lucide-react";
import {
	SignedIn,
	SignedOut,
	UserButton,
	SignInButton,
} from "@clerk/tanstack-react-start";
import { ThemeToggle } from "./theme/ThemeToggle";
import { HeaderTokenCounter } from "./billing/HeaderTokenCounter";
import { useProjectContext } from "@/contexts/project-context";
import { ProjectDropdown } from "./navigation/ProjectDropdown";

export default function Header() {
	const [isOpen, setIsOpen] = useState(false);
	const projectContext = useProjectContext();

	return (
		<>
			<header className="h-12 px-4 flex items-center justify-between bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-40">
				<div className="flex items-center gap-3">
					<button
						onClick={() => setIsOpen(true)}
						className="p-1.5 hover:bg-slate-800 rounded-lg transition-colors"
						aria-label="Open menu"
						type="button"
					>
						<Menu size={20} />
					</button>
					<Link to="/" className="font-bold text-lg tracking-tight text-white">
						Postmate
					</Link>

					{/* Project dropdown when in project context */}
					{projectContext?.project && (
						<ProjectDropdown
							project={projectContext.project}
							onOpenBrandVoices={projectContext.onOpenBrandVoices}
							onOpenPersonas={projectContext.onOpenPersonas}
							onOpenKnowledgeBase={projectContext.onOpenKnowledgeBase}
							onOpenExamples={projectContext.onOpenExamples}
						/>
					)}
				</div>

				<div className="flex items-center gap-3">
					<SignedOut>
						<SignInButton mode="modal">
							<button
								className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg transition-colors font-medium text-sm"
								type="button"
							>
								Sign In
							</button>
						</SignInButton>
					</SignedOut>
					<SignedIn>
						<ThemeToggle />
						<HeaderTokenCounter />
						<UserButton>
							<UserButton.MenuItems>
								<UserButton.Link
									label="Profile"
									labelIcon={<User size={16} />}
									href="/profile"
								/>
								<UserButton.Link
									label="Billing"
									labelIcon={<CreditCard size={16} />}
									href="/settings/billing"
								/>
							</UserButton.MenuItems>
						</UserButton>
					</SignedIn>
				</div>
			</header>

			<aside
				className={`fixed top-0 left-0 h-full w-80 bg-slate-950/95 backdrop-blur-xl text-white border-r border-slate-800 shadow-2xl z-50 transform transition-transform duration-300 ease-in-out flex flex-col ${isOpen ? "translate-x-0" : "-translate-x-full"
					}`}
			>
				<div className="flex items-center justify-between p-4 border-b border-slate-800">
					<h2 className="text-xl font-bold">Navigation</h2>
					<button
						onClick={() => setIsOpen(false)}
						className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
						aria-label="Close menu"
						type="button"
					>
						<X size={24} />
					</button>
				</div>

				<nav className="flex-1 p-4 overflow-y-auto">
					<Link
						to="/"
						onClick={() => setIsOpen(false)}
						className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-800 transition-colors mb-2"
						activeProps={{
							className:
								"flex items-center gap-3 p-3 rounded-lg bg-cyan-900/30 text-cyan-100 transition-colors mb-2",
						}}
					>
						<Home size={20} />
						<span className="font-medium">Home</span>
					</Link>

					{/* Auth Protected Routes */}
					<SignedIn>
						<Link
							to="/dashboard"
							onClick={() => setIsOpen(false)}
							className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-800 transition-colors mb-2"
							activeProps={{
								className:
									"flex items-center gap-3 p-3 rounded-lg bg-cyan-900/30 text-cyan-100 transition-colors mb-2",
							}}
						>
							<LayoutDashboard size={20} />
							<span className="font-medium">Dashboard</span>
						</Link>

						<Link
							to="/profile"
							onClick={() => setIsOpen(false)}
							className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-800 transition-colors mb-2"
							activeProps={{
								className:
									"flex items-center gap-3 p-3 rounded-lg bg-cyan-900/30 text-cyan-100 transition-colors mb-2",
							}}
						>
							<User size={20} />
							<span className="font-medium">Profile</span>
						</Link>
					</SignedIn>
				</nav>
			</aside>
		</>
	);
}
