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

export default function Header() {
	const [isOpen, setIsOpen] = useState(false);

	return (
		<>
			<header className="p-4 flex items-center justify-between bg-white/80 dark:bg-slate-900/80 backdrop-blur-md text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-800 shadow-sm transition-colors sticky top-0 z-40">
				<div className="flex items-center">
					<button
						onClick={() => setIsOpen(true)}
						className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
						aria-label="Open menu"
						type="button"
					>
						<Menu size={24} />
					</button>
					<h1 className="ml-4 text-xl font-semibold">
						<Link to="/">
							{/* TODO: Switch logo based on theme or use a neutral one */}
							<span className="font-bold text-2xl tracking-tight">Postmate</span>
						</Link>
					</h1>
				</div>

				<div className="flex items-center gap-4">
					<SignedOut>
						<SignInButton mode="modal">
							<button
								className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg transition-colors font-medium"
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
				className={`fixed top-0 left-0 h-full w-80 bg-white/95 dark:bg-slate-950/95 backdrop-blur-xl text-slate-900 dark:text-white border-r border-slate-200 dark:border-slate-800 shadow-2xl z-50 transform transition-transform duration-300 ease-in-out flex flex-col ${isOpen ? "translate-x-0" : "-translate-x-full"
					}`}
			>
				<div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800">
					<h2 className="text-xl font-bold">Navigation</h2>
					<button
						onClick={() => setIsOpen(false)}
						className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
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
						className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors mb-2"
						activeProps={{
							className:
								"flex items-center gap-3 p-3 rounded-lg bg-cyan-100 text-cyan-900 dark:bg-cyan-900/30 dark:text-cyan-100 transition-colors mb-2",
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
							className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors mb-2"
							activeProps={{
								className:
									"flex items-center gap-3 p-3 rounded-lg bg-cyan-100 text-cyan-900 dark:bg-cyan-900/30 dark:text-cyan-100 transition-colors mb-2",
							}}
						>
							<LayoutDashboard size={20} />
							<span className="font-medium">Dashboard</span>
						</Link>

						<Link
							to="/profile"
							onClick={() => setIsOpen(false)}
							className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors mb-2"
							activeProps={{
								className:
									"flex items-center gap-3 p-3 rounded-lg bg-cyan-100 text-cyan-900 dark:bg-cyan-900/30 dark:text-cyan-100 transition-colors mb-2",
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
