import { Link } from "@tanstack/react-router";
import {
	SignedIn,
	SignedOut,
	SignInButton,
	UserButton,
} from "@clerk/tanstack-react-start";
import { FileText, Home, Menu } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
	Sheet,
	SheetContent,
	SheetHeader,
	SheetTitle,
	SheetTrigger,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { AiSearchBar } from "@/components/ai-search-bar";
import { ThemeToggle } from "@/components/theme-toggle";
import { OrgSwitcher } from "@/components/org-switcher";
import { useMaybeOrg } from "@/contexts/org-context";

export default function Header() {
	const org = useMaybeOrg();
	return (
		<header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
			<div className="flex h-14 items-center justify-between px-4">
				<div className="flex items-center gap-2">
					<Sheet>
						<SheetTrigger asChild>
							<Button variant="ghost" size="icon" className="md:hidden">
								<Menu className="h-5 w-5" />
								<span className="sr-only">Toggle menu</span>
							</Button>
						</SheetTrigger>
						<SheetContent side="left" className="w-72">
							<SheetHeader>
								<SheetTitle>Navigation</SheetTitle>
							</SheetHeader>
							<nav className="flex flex-col gap-2 mt-4">
								<NavLink to="/" icon={<Home className="h-4 w-4" />}>
									Home
								</NavLink>
								<SignedIn>
									<Separator className="my-2" />
									<NavLink to="/orgs" icon={<Home className="h-4 w-4" />}>
										My organizations
									</NavLink>
									{org && (
										<Link
											to="/org/$slug/drafts"
											params={{ slug: org.slug }}
											className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-foreground hover:bg-accent"
											activeProps={{
												className:
													"flex items-center gap-3 rounded-lg px-3 py-2 bg-accent text-accent-foreground",
											}}
										>
											<FileText className="h-4 w-4" />
											<span>Drafts</span>
										</Link>
									)}
								</SignedIn>
							</nav>
						</SheetContent>
					</Sheet>

					<Link to="/" className="flex items-center gap-2">
						<span className="font-bold text-lg tracking-tight">NewsGator</span>
					</Link>

					<SignedIn>
						<div className="ml-4 hidden md:block">
							<OrgSwitcher />
						</div>
						{org && (
							<nav className="hidden md:flex items-center gap-1 ml-2">
								<Button variant="ghost" size="sm" asChild>
									<Link
										to="/org/$slug/drafts"
										params={{ slug: org.slug }}
										activeProps={{ className: "bg-accent" }}
									>
										<FileText className="h-4 w-4 mr-1" />
										Drafts
									</Link>
								</Button>
							</nav>
						)}
					</SignedIn>
				</div>

				<div className="flex items-center gap-2">
					<SignedIn>
						<AiSearchBar />
					</SignedIn>
					<ThemeToggle />
					<SignedOut>
						<SignInButton mode="modal">
							<Button size="sm">Sign In</Button>
						</SignInButton>
					</SignedOut>
					<SignedIn>
						<UserButton afterSignOutUrl="/" />
					</SignedIn>
				</div>
			</div>
		</header>
	);
}

function NavLink({
	to,
	icon,
	children,
}: {
	to: string;
	icon: React.ReactNode;
	children: React.ReactNode;
}) {
	return (
		<Link
			to={to}
			className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-foreground hover:bg-accent"
			activeProps={{
				className:
					"flex items-center gap-3 rounded-lg px-3 py-2 bg-accent text-accent-foreground",
			}}
		>
			{icon}
			<span>{children}</span>
		</Link>
	);
}
