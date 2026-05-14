import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { formatDistanceToNow } from "date-fns";
import {
	AlertTriangle,
	CheckCircle2,
	Circle,
	FileText,
	Newspaper,
	Sparkles,
	UserPlus,
} from "lucide-react";
import { api } from "../../../../../convex/_generated/api";
import { useOrg } from "@/contexts/org-context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";

export const Route = createFileRoute("/_authed/org/$slug/dashboard")({
	component: OrgDashboard,
});

function OrgDashboard() {
	const org = useOrg();
	const isAdmin = org.role === "admin";

	const sources = useQuery(api.sources.list, { orgId: org.orgId });
	const recentCount = useQuery(api.entries.recentCount, {
		orgId: org.orgId,
		sinceMs: 24 * 60 * 60 * 1000,
	});
	const recentFailures = useQuery(api.sourceRuns.recentFailures, {
		orgId: org.orgId,
		sinceMs: 24 * 60 * 60 * 1000,
	});

	const counts = {
		healthy: sources?.filter((s) => s.health === "healthy").length ?? 0,
		warning: sources?.filter((s) => s.health === "warning").length ?? 0,
		failing: sources?.filter((s) => s.health === "failing").length ?? 0,
	};
	const totalSources = sources?.length ?? 0;
	const hasSources = totalSources > 0;

	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-3xl font-bold">{org.name}</h1>
				<p className="text-muted-foreground mt-1">
					Welcome to your organization dashboard.
				</p>
			</div>

			{recentFailures && recentFailures.length > 0 && (
				<Card className="border-destructive/40 bg-destructive/5">
					<CardContent className="p-4 flex items-start gap-3">
						<AlertTriangle className="size-5 text-destructive shrink-0 mt-0.5" />
						<div className="flex-1 min-w-0">
							<p className="font-medium">
								{recentFailures.length} failed source run
								{recentFailures.length === 1 ? "" : "s"} in the last 24 hours
							</p>
							<p className="text-sm text-muted-foreground mt-0.5">
								Most recent:{" "}
								{formatDistanceToNow(
									new Date(recentFailures[0].startedAt),
									{ addSuffix: true },
								)}
								. Check the sources page to investigate.
							</p>
						</div>
						<Button variant="outline" size="sm" asChild>
							<Link to="/org/$slug/sources" params={{ slug: org.slug }}>
								Review
							</Link>
						</Button>
					</CardContent>
				</Card>
			)}

			<Card>
				<CardHeader>
					<CardTitle>Get started</CardTitle>
					<CardDescription>
						Complete these steps to start aggregating news and drafting newsletters.
					</CardDescription>
				</CardHeader>
				<CardContent>
					<ul className="space-y-3">
						<ChecklistItem
							done={hasSources}
							title="Add your first news source"
							description="Connect an RSS feed, scheduled web search, or specific website."
							adminOnly
							isAdmin={isAdmin}
							action={
								isAdmin && !hasSources ? (
									<Button asChild size="sm" variant="outline">
										<Link
											to="/org/$slug/sources"
											params={{ slug: org.slug }}
										>
											Add a source
										</Link>
									</Button>
								) : null
							}
						/>
						<ChecklistItem
							done={false}
							title="Upload ghost writer examples"
							description="Upload past newsletters so drafts match your voice."
							adminOnly
							isAdmin={isAdmin}
						/>
						<ChecklistItem
							done={false}
							title="Invite a teammate"
							description="Bring collaborators in to review news and refine drafts."
							adminOnly
							isAdmin={isAdmin}
							action={
								isAdmin ? (
									<Button asChild size="sm" variant="outline">
										<Link
											to="/org/$slug/settings/members"
											params={{ slug: org.slug }}
										>
											<UserPlus className="h-4 w-4 mr-1" />
											Open members
										</Link>
									</Button>
								) : null
							}
						/>
					</ul>
				</CardContent>
			</Card>

			<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
				<Card>
					<CardHeader>
						<div className="flex items-center gap-2">
							<Newspaper className="h-5 w-5" />
							<CardTitle className="text-base">Recent ingestion</CardTitle>
						</div>
					</CardHeader>
					<CardContent>
						<p className="text-3xl font-bold">
							{recentCount === undefined ? "…" : recentCount}
						</p>
						<p className="text-sm text-muted-foreground mt-1">
							entries added in the last 24h
						</p>
						<Button variant="link" size="sm" className="px-0 mt-2" asChild>
							<Link to="/org/$slug/inbox" params={{ slug: org.slug }}>
								Open inbox →
							</Link>
						</Button>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<div className="flex items-center gap-2">
							<CheckCircle2 className="h-5 w-5" />
							<CardTitle className="text-base">Source health</CardTitle>
						</div>
					</CardHeader>
					<CardContent>
						{sources === undefined ? (
							<p className="text-sm text-muted-foreground">Loading…</p>
						) : totalSources === 0 ? (
							<p className="text-sm text-muted-foreground">
								No sources configured.
							</p>
						) : (
							<div className="space-y-1.5 text-sm">
								<div className="flex items-center justify-between">
									<span className="text-green-700 dark:text-green-400">
										Healthy
									</span>
									<span className="font-medium">{counts.healthy}</span>
								</div>
								<div className="flex items-center justify-between">
									<span className="text-yellow-700 dark:text-yellow-400">
										Warning
									</span>
									<span className="font-medium">{counts.warning}</span>
								</div>
								<div className="flex items-center justify-between">
									<span className="text-destructive">Failing</span>
									<span className="font-medium">{counts.failing}</span>
								</div>
							</div>
						)}
						<Button variant="link" size="sm" className="px-0 mt-2" asChild>
							<Link to="/org/$slug/sources" params={{ slug: org.slug }}>
								Manage sources →
							</Link>
						</Button>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<div className="flex items-center justify-between">
							<div className="flex items-center gap-2">
								<Sparkles className="h-5 w-5" />
								<CardTitle className="text-base">
									AI search & ghost writer
								</CardTitle>
							</div>
							<Badge variant="secondary">Phase 3</Badge>
						</div>
					</CardHeader>
					<CardContent>
						<p className="text-sm text-muted-foreground">
							Coming in Phase 3.
						</p>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<div className="flex items-center justify-between">
							<div className="flex items-center gap-2">
								<FileText className="h-5 w-5" />
								<CardTitle className="text-base">
									Drafts & auto-drafts
								</CardTitle>
							</div>
							<Badge variant="secondary">Phase 4</Badge>
						</div>
					</CardHeader>
					<CardContent>
						<p className="text-sm text-muted-foreground">
							Coming in Phase 4.
						</p>
					</CardContent>
				</Card>
			</div>
		</div>
	);
}

function ChecklistItem({
	done,
	title,
	description,
	adminOnly,
	isAdmin,
	action,
}: {
	done: boolean;
	title: string;
	description: string;
	adminOnly?: boolean;
	isAdmin: boolean;
	action?: React.ReactNode;
}) {
	const disabled = adminOnly && !isAdmin;
	return (
		<li className="flex items-start gap-3">
			{done ? (
				<CheckCircle2 className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
			) : (
				<Circle className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
			)}
			<div className="flex-1">
				<div className="flex items-center gap-2">
					<span className="font-medium">{title}</span>
					{disabled && (
						<Badge variant="outline" className="text-xs">
							Admin only
						</Badge>
					)}
				</div>
				<p className="text-sm text-muted-foreground">{description}</p>
				{action && <div className="mt-2">{action}</div>}
			</div>
		</li>
	);
}
