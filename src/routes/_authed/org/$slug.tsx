import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { Inbox, LayoutDashboard, Rss, Settings, Users } from "lucide-react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { OrgProvider } from "@/contexts/org-context";
import { getServerConvex } from "@/lib/convex-server";
import { cn } from "@/lib/utils";

const loadOrg = createServerFn({ method: "GET" })
	.inputValidator((d: { slug: string }) => d)
	.handler(async ({ data }) => {
		const convex = await getServerConvex();
		const org = await convex.query(api.organizations.getBySlug, {
			slug: data.slug,
		});
		if (!org) {
			throw new Response("Not a member of this organization", { status: 403 });
		}
		return org;
	});

export const Route = createFileRoute("/_authed/org/$slug")({
	loader: async ({ params }) => {
		return await loadOrg({ data: { slug: params.slug } });
	},
	component: OrgLayout,
});

function OrgLayout() {
	const org = Route.useLoaderData();
	const slug = org.slug;

	return (
		<OrgProvider
			value={{
				orgId: org._id as Id<"organizations">,
				slug: org.slug,
				name: org.name,
				role: org.role,
			}}
		>
			<div className="flex gap-6">
				<aside className="w-56 shrink-0 hidden md:block">
					<nav className="space-y-1">
						<OrgNavLink
							to="/org/$slug/dashboard"
							params={{ slug }}
							icon={<LayoutDashboard className="h-4 w-4" />}
						>
							Dashboard
						</OrgNavLink>
						<OrgNavLink
							to="/org/$slug/inbox"
							params={{ slug }}
							icon={<Inbox className="h-4 w-4" />}
						>
							Inbox
						</OrgNavLink>
						<OrgNavLink
							to="/org/$slug/sources"
							params={{ slug }}
							icon={<Rss className="h-4 w-4" />}
						>
							Sources
						</OrgNavLink>
						<OrgNavLink
							to="/org/$slug/settings"
							params={{ slug }}
							icon={<Settings className="h-4 w-4" />}
						>
							Settings
						</OrgNavLink>
						<OrgNavLink
							to="/org/$slug/settings/members"
							params={{ slug }}
							icon={<Users className="h-4 w-4" />}
						>
							Members
						</OrgNavLink>
					</nav>
				</aside>
				<main className="flex-1 min-w-0">
					<Outlet />
				</main>
			</div>
		</OrgProvider>
	);
}

function OrgNavLink({
	to,
	params,
	icon,
	children,
}: {
	to:
		| "/org/$slug/dashboard"
		| "/org/$slug/inbox"
		| "/org/$slug/sources"
		| "/org/$slug/settings"
		| "/org/$slug/settings/members";
	params: { slug: string };
	icon: React.ReactNode;
	children: React.ReactNode;
}) {
	return (
		<Link
			to={to}
			params={params}
			className={cn(
				"flex items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground",
			)}
			activeProps={{
				className: "bg-accent text-foreground font-medium",
			}}
			activeOptions={{ exact: true }}
		>
			{icon}
			{children}
		</Link>
	);
}
