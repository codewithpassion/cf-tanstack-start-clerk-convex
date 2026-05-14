import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery } from "convex/react";
import { formatDistanceToNow } from "date-fns";
import {
	AlertTriangle,
	CheckCircle2,
	Circle,
	FileText,
	Newspaper,
	Search,
	Sparkles,
	UserPlus,
	X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { api } from "../../../../../convex/_generated/api";
import { useOrg } from "@/contexts/org-context";
import { getServerConvex } from "@/lib/convex-server";
import {
	SHORTCUT_EVENTS,
	subscribeShortcutEvent,
} from "@/lib/shortcut-events";
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
	loader: async ({ params }) => {
		// Prefetch the heaviest queries server-side so first paint already has data.
		const convex = await getServerConvex();
		const org = await convex.query(api.organizations.getBySlug, {
			slug: params.slug,
		});
		if (!org) return null;
		await Promise.all([
			convex
				.query(api.sources.list, { orgId: org._id })
				.catch(() => undefined),
			convex
				.query(api.drafts.recentForReview, { orgId: org._id, limit: 5 })
				.catch(() => undefined),
		]);
		return null;
	},
	component: OrgDashboard,
});

const DISMISS_KEY = (orgId: string) => `ng_onboarding_dismissed_${orgId}`;
const SEARCH_TRIED_KEY = (orgId: string) => `ng_tried_search_${orgId}`;

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
	const draftsForReview = useQuery(api.drafts.recentForReview, {
		orgId: org.orgId,
		limit: 5,
	});
	const examples = useQuery(api.ghostWriter.listExamples, { orgId: org.orgId });
	const members = useQuery(api.organizations.listMembers, { orgId: org.orgId });
	const drafts = useQuery(api.drafts.listByOrg, { orgId: org.orgId });
	const activity = useQuery(api.analytics.recentActivity, {
		orgId: org.orgId,
	});

	const acknowledgeFailure = useMutation(api.sourceRuns.acknowledgeFailure);

	const counts = {
		healthy: sources?.filter((s) => s.health === "healthy").length ?? 0,
		warning: sources?.filter((s) => s.health === "warning").length ?? 0,
		failing: sources?.filter((s) => s.health === "failing").length ?? 0,
	};
	const totalSources = sources?.length ?? 0;

	// Onboarding state
	const [dismissed, setDismissed] = useState(false);
	const [triedSearch, setTriedSearch] = useState(false);

	useEffect(() => {
		if (typeof window === "undefined") return;
		setDismissed(window.localStorage.getItem(DISMISS_KEY(org.orgId)) === "1");
		setTriedSearch(
			window.localStorage.getItem(SEARCH_TRIED_KEY(org.orgId)) === "1",
		);
		return subscribeShortcutEvent(SHORTCUT_EVENTS.searchPerformed, () => {
			setTriedSearch(
				window.localStorage.getItem(SEARCH_TRIED_KEY(org.orgId)) === "1",
			);
		});
	}, [org.orgId]);

	const onboardingItems = [
		{
			id: "source",
			done: totalSources > 0,
			title: "Add your first source",
			to: "/org/$slug/sources" as const,
		},
		{
			id: "example",
			done: (examples?.length ?? 0) > 0,
			title: "Upload an example newsletter",
			to: "/org/$slug/settings/ghost-writer" as const,
		},
		{
			id: "invite",
			done: (members?.length ?? 0) > 1,
			title: "Invite a teammate",
			to: "/org/$slug/settings/members" as const,
		},
		{
			id: "search",
			done: triedSearch,
			title: "Try AI search",
			to: null,
		},
		{
			id: "draft",
			done: (drafts?.length ?? 0) > 0,
			title: "Generate your first draft",
			to: "/org/$slug/inbox" as const,
		},
	];
	const allOnboardingDone = onboardingItems.every((i) => i.done);
	const showChecklist = !dismissed && !allOnboardingDone;

	const dismissChecklist = () => {
		if (typeof window === "undefined") return;
		window.localStorage.setItem(DISMISS_KEY(org.orgId), "1");
		setDismissed(true);
	};

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
					<CardContent className="p-4 space-y-2">
						<div className="flex items-start gap-3">
							<AlertTriangle className="size-5 text-destructive shrink-0 mt-0.5" />
							<div className="flex-1 min-w-0">
								<p className="font-medium">
									{recentFailures.length} failed source run
									{recentFailures.length === 1 ? "" : "s"} in the last 24 hours
								</p>
								<p className="text-sm text-muted-foreground mt-0.5">
									Acknowledge each to clear it from the dashboard, or open the
									sources page to investigate.
								</p>
							</div>
							<Button variant="outline" size="sm" asChild>
								<Link to="/org/$slug/sources" params={{ slug: org.slug }}>
									Review
								</Link>
							</Button>
						</div>
						<ul className="divide-y divide-destructive/20 border-t border-destructive/20 pt-2">
							{recentFailures.slice(0, 5).map((run) => (
								<li
									key={run._id}
									className="flex items-start gap-2 py-2 text-sm"
								>
									<div className="flex-1 min-w-0">
										<p className="truncate">
											{run.error ?? "Run failed without error message"}
										</p>
										<p className="text-xs text-muted-foreground">
											{formatDistanceToNow(new Date(run.startedAt), {
												addSuffix: true,
											})}
										</p>
									</div>
									{isAdmin && (
										<Button
											variant="ghost"
											size="sm"
											onClick={() => {
												void acknowledgeFailure({ runId: run._id });
											}}
										>
											Acknowledge
										</Button>
									)}
								</li>
							))}
						</ul>
					</CardContent>
				</Card>
			)}

			{showChecklist && (
				<Card>
					<CardHeader className="flex flex-row items-start justify-between space-y-0">
						<div>
							<CardTitle>Onboarding checklist</CardTitle>
							<CardDescription>
								Five quick steps to get the most out of NewsGator.
							</CardDescription>
						</div>
						<Button
							variant="ghost"
							size="icon"
							onClick={dismissChecklist}
							aria-label="Dismiss"
						>
							<X className="size-4" />
						</Button>
					</CardHeader>
					<CardContent>
						<ul className="space-y-3">
							{onboardingItems.map((item) => (
								<li key={item.id} className="flex items-start gap-3">
									{item.done ? (
										<CheckCircle2 className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
									) : (
										<Circle className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
									)}
									<div className="flex-1">
										<span
											className={item.done ? "line-through opacity-70" : ""}
										>
											{item.title}
										</span>
									</div>
									{!item.done && item.to && (
										<Button size="sm" variant="outline" asChild>
											<Link to={item.to} params={{ slug: org.slug }}>
												Go
											</Link>
										</Button>
									)}
									{!item.done && item.id === "search" && (
										<Badge variant="outline" className="text-xs">
											Press ⌘K
										</Badge>
									)}
								</li>
							))}
						</ul>
					</CardContent>
				</Card>
			)}

			<div className="grid grid-cols-2 md:grid-cols-4 gap-3">
				<ActivityCard
					label="Entries ingested"
					value={activity?.entriesIngested}
					icon={<Newspaper className="size-4" />}
				/>
				<ActivityCard
					label="Drafts created"
					value={activity?.draftsCreated}
					icon={<FileText className="size-4" />}
				/>
				<ActivityCard
					label="Drafts finalized"
					value={activity?.draftsFinalized}
					icon={<CheckCircle2 className="size-4" />}
				/>
				<ActivityCard
					label="AI searches"
					value={activity?.searchesPerformed}
					icon={<Search className="size-4" />}
				/>
			</div>

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
						<div className="flex items-center gap-2">
							<FileText className="h-5 w-5" />
							<CardTitle className="text-base">Drafts</CardTitle>
						</div>
					</CardHeader>
					<CardContent>
						<p className="text-sm text-muted-foreground">
							Manage and finalize newsletter drafts.
						</p>
						<Button variant="link" size="sm" className="px-0 mt-2" asChild>
							<Link to="/org/$slug/drafts" params={{ slug: org.slug }}>
								Open drafts →
							</Link>
						</Button>
						{isAdmin && (
							<div>
								<Button
									variant="link"
									size="sm"
									className="px-0 -mt-1"
									asChild
								>
									<Link
										to="/org/$slug/settings/auto-draft"
										params={{ slug: org.slug }}
									>
										Auto-draft schedule →
									</Link>
								</Button>
							</div>
						)}
					</CardContent>
				</Card>
			</div>

			<Card>
				<CardHeader>
					<div className="flex items-center gap-2">
						<FileText className="h-5 w-5" />
						<CardTitle className="text-base">
							Drafts waiting for review
						</CardTitle>
					</div>
				</CardHeader>
				<CardContent>
					{draftsForReview === undefined ? (
						<p className="text-sm text-muted-foreground">Loading…</p>
					) : draftsForReview.length === 0 ? (
						<p className="text-sm text-muted-foreground">
							No drafts waiting — generate one from the inbox or wait for the
							auto-draft schedule.
						</p>
					) : (
						<ul className="divide-y">
							{draftsForReview.map((d) => (
								<li
									key={d._id}
									className="flex items-center justify-between gap-3 py-2"
								>
									<div className="min-w-0">
										<Link
											to="/org/$slug/drafts/$draftId"
											params={{ slug: org.slug, draftId: d._id }}
											className="font-medium hover:underline truncate block"
										>
											{d.title}
										</Link>
										<p className="text-xs text-muted-foreground">
											{formatDistanceToNow(new Date(d.createdAt), {
												addSuffix: true,
											})}
											{" · "}
											<Badge variant="secondary" className="text-xs">
												{d.status}
											</Badge>
										</p>
									</div>
									<Button asChild size="sm" variant="outline">
										<Link
											to="/org/$slug/drafts/$draftId"
											params={{ slug: org.slug, draftId: d._id }}
										>
											Open
										</Link>
									</Button>
								</li>
							))}
						</ul>
					)}
				</CardContent>
			</Card>

			{isAdmin && (
				<Card>
					<CardHeader>
						<div className="flex items-center gap-2">
							<Sparkles className="h-5 w-5" />
							<CardTitle className="text-base">Tips</CardTitle>
						</div>
					</CardHeader>
					<CardContent>
						<ul className="text-sm text-muted-foreground space-y-1">
							<li className="flex items-center gap-2">
								<UserPlus className="size-3.5" />
								<span>
									Invite teammates from the{" "}
									<Link
										to="/org/$slug/settings/members"
										params={{ slug: org.slug }}
										className="underline"
									>
										members page
									</Link>
									.
								</span>
							</li>
							<li>Press <kbd className="rounded bg-muted px-1 text-xs">?</kbd> to see all keyboard shortcuts.</li>
						</ul>
					</CardContent>
				</Card>
			)}
		</div>
	);
}

function ActivityCard({
	label,
	value,
	icon,
}: {
	label: string;
	value: number | undefined;
	icon: React.ReactNode;
}) {
	return (
		<Card>
			<CardContent className="p-4">
				<div className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-wide">
					{icon}
					<span>{label}</span>
				</div>
				<p className="text-2xl font-semibold mt-1">
					{value === undefined ? "…" : value}
				</p>
				<p className="text-xs text-muted-foreground">last 7 days</p>
			</CardContent>
		</Card>
	);
}
