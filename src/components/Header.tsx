import { Link } from "@tanstack/react-router";

import { useState } from "react";
import {
	ChevronDown,
	ChevronRight,
	Home,
	Menu,
	Network,
	SquareFunction,
	StickyNote,
	X,
	User,
	LayoutDashboard,
} from "lucide-react";
import {
	SignedIn,
	SignedOut,
	UserButton,
	SignInButton,
} from "@clerk/tanstack-react-start";
import { ThemeToggle } from "./theme/ThemeToggle";

export default function Header() {
	const [isOpen, setIsOpen] = useState(false);
	const [groupedExpanded, setGroupedExpanded] = useState<
		Record<string, boolean>
	>({});

	return (
		<>
			<header className="p-4 flex items-center justify-between bg-gray-800 dark:bg-gray-900 text-white shadow-lg transition-colors">
				<div className="flex items-center">
					<button
						onClick={() => setIsOpen(true)}
						className="p-2 hover:bg-gray-700 dark:hover:bg-gray-800 rounded-lg transition-colors"
						aria-label="Open menu"
						type="button"
					>
						<Menu size={24} />
					</button>
					<h1 className="ml-4 text-xl font-semibold">
						<Link to="/">
							<img
								src="/tanstack-word-logo-white.svg"
								alt="TanStack Logo"
								className="h-10"
							/>
						</Link>
					</h1>
				</div>

				<div className="flex items-center gap-4">
					<SignedOut>
						<SignInButton mode="modal">
							<button
								className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 dark:bg-cyan-700 dark:hover:bg-cyan-800 rounded-lg transition-colors font-medium"
								type="button"
							>
								Sign In
							</button>
						</SignInButton>
					</SignedOut>
					<SignedIn>
						<ThemeToggle />
						<UserButton afterSignOutUrl="/" />
					</SignedIn>
				</div>
			</header>

			<aside
				className={`fixed top-0 left-0 h-full w-80 bg-gray-900 dark:bg-gray-950 text-white shadow-2xl z-50 transform transition-transform duration-300 ease-in-out flex flex-col ${
					isOpen ? "translate-x-0" : "-translate-x-full"
				}`}
			>
				<div className="flex items-center justify-between p-4 border-b border-gray-700 dark:border-gray-800">
					<h2 className="text-xl font-bold">Navigation</h2>
					<button
						onClick={() => setIsOpen(false)}
						className="p-2 hover:bg-gray-800 dark:hover:bg-gray-900 rounded-lg transition-colors"
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
						className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-800 dark:hover:bg-gray-900 transition-colors mb-2"
						activeProps={{
							className:
								"flex items-center gap-3 p-3 rounded-lg bg-cyan-600 hover:bg-cyan-700 dark:bg-cyan-700 dark:hover:bg-cyan-800 transition-colors mb-2",
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
							className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-800 dark:hover:bg-gray-900 transition-colors mb-2"
							activeProps={{
								className:
									"flex items-center gap-3 p-3 rounded-lg bg-cyan-600 hover:bg-cyan-700 dark:bg-cyan-700 dark:hover:bg-cyan-800 transition-colors mb-2",
							}}
						>
							<LayoutDashboard size={20} />
							<span className="font-medium">Dashboard</span>
						</Link>

						<Link
							to="/profile"
							onClick={() => setIsOpen(false)}
							className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-800 dark:hover:bg-gray-900 transition-colors mb-2"
							activeProps={{
								className:
									"flex items-center gap-3 p-3 rounded-lg bg-cyan-600 hover:bg-cyan-700 dark:bg-cyan-700 dark:hover:bg-cyan-800 transition-colors mb-2",
							}}
						>
							<User size={20} />
							<span className="font-medium">Profile</span>
						</Link>
					</SignedIn>

					{/* Demo Links Start */}

					<Link
						to="/demo/start/server-funcs"
						onClick={() => setIsOpen(false)}
						className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-800 dark:hover:bg-gray-900 transition-colors mb-2"
						activeProps={{
							className:
								"flex items-center gap-3 p-3 rounded-lg bg-cyan-600 hover:bg-cyan-700 dark:bg-cyan-700 dark:hover:bg-cyan-800 transition-colors mb-2",
						}}
					>
						<SquareFunction size={20} />
						<span className="font-medium">Start - Server Functions</span>
					</Link>

					<Link
						to="/demo/start/api-request"
						onClick={() => setIsOpen(false)}
						className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-800 dark:hover:bg-gray-900 transition-colors mb-2"
						activeProps={{
							className:
								"flex items-center gap-3 p-3 rounded-lg bg-cyan-600 hover:bg-cyan-700 dark:bg-cyan-700 dark:hover:bg-cyan-800 transition-colors mb-2",
						}}
					>
						<Network size={20} />
						<span className="font-medium">Start - API Request</span>
					</Link>

					<div className="flex flex-row justify-between">
						<Link
							to="/demo/start/ssr"
							onClick={() => setIsOpen(false)}
							className="flex-1 flex items-center gap-3 p-3 rounded-lg hover:bg-gray-800 dark:hover:bg-gray-900 transition-colors mb-2"
							activeProps={{
								className:
									"flex-1 flex items-center gap-3 p-3 rounded-lg bg-cyan-600 hover:bg-cyan-700 dark:bg-cyan-700 dark:hover:bg-cyan-800 transition-colors mb-2",
							}}
						>
							<StickyNote size={20} />
							<span className="font-medium">Start - SSR Demos</span>
						</Link>
						<button
							className="p-2 hover:bg-gray-800 dark:hover:bg-gray-900 rounded-lg transition-colors"
							onClick={() =>
								setGroupedExpanded((prev) => ({
									...prev,
									StartSSRDemo: !prev.StartSSRDemo,
								}))
							}
							type="button"
						>
							{groupedExpanded.StartSSRDemo ? (
								<ChevronDown size={20} />
							) : (
								<ChevronRight size={20} />
							)}
						</button>
					</div>
					{groupedExpanded.StartSSRDemo && (
						<div className="flex flex-col ml-4">
							<Link
								to="/demo/start/ssr/spa-mode"
								onClick={() => setIsOpen(false)}
								className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-800 dark:hover:bg-gray-900 transition-colors mb-2"
								activeProps={{
									className:
										"flex items-center gap-3 p-3 rounded-lg bg-cyan-600 hover:bg-cyan-700 dark:bg-cyan-700 dark:hover:bg-cyan-800 transition-colors mb-2",
								}}
							>
								<StickyNote size={20} />
								<span className="font-medium">SPA Mode</span>
							</Link>

							<Link
								to="/demo/start/ssr/full-ssr"
								onClick={() => setIsOpen(false)}
								className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-800 dark:hover:bg-gray-900 transition-colors mb-2"
								activeProps={{
									className:
										"flex items-center gap-3 p-3 rounded-lg bg-cyan-600 hover:bg-cyan-700 dark:bg-cyan-700 dark:hover:bg-cyan-800 transition-colors mb-2",
								}}
							>
								<StickyNote size={20} />
								<span className="font-medium">Full SSR</span>
							</Link>

							<Link
								to="/demo/start/ssr/data-only"
								onClick={() => setIsOpen(false)}
								className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-800 dark:hover:bg-gray-900 transition-colors mb-2"
								activeProps={{
									className:
										"flex items-center gap-3 p-3 rounded-lg bg-cyan-600 hover:bg-cyan-700 dark:bg-cyan-700 dark:hover:bg-cyan-800 transition-colors mb-2",
								}}
							>
								<StickyNote size={20} />
								<span className="font-medium">Data Only</span>
							</Link>
						</div>
					)}

					{/* Demo Links End */}
				</nav>
			</aside>
		</>
	);
}
