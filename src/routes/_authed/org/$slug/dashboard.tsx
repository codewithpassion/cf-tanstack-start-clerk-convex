import { createFileRoute, Link } from "@tanstack/react-router";
import {
	CheckCircle2,
	Circle,
	FileText,
	Newspaper,
	Sparkles,
	UserPlus,
} from "lucide-react";
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

	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-3xl font-bold">{org.name}</h1>
				<p className="text-muted-foreground mt-1">
					Welcome to your organization dashboard.
				</p>
			</div>

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
							done={false}
							title="Add your first news source"
							description="Connect an RSS feed, scheduled web search, or specific website."
							adminOnly
							isAdmin={isAdmin}
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
				<PlaceholderCard
					icon={<Newspaper className="h-5 w-5" />}
					title="News inbox"
					phase="Phase 2"
				/>
				<PlaceholderCard
					icon={<Sparkles className="h-5 w-5" />}
					title="AI search & ghost writer"
					phase="Phase 3"
				/>
				<PlaceholderCard
					icon={<FileText className="h-5 w-5" />}
					title="Drafts & auto-drafts"
					phase="Phase 4"
				/>
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

function PlaceholderCard({
	icon,
	title,
	phase,
}: {
	icon: React.ReactNode;
	title: string;
	phase: string;
}) {
	return (
		<Card>
			<CardHeader>
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-2">
						{icon}
						<CardTitle className="text-base">{title}</CardTitle>
					</div>
					<Badge variant="secondary">{phase}</Badge>
				</div>
			</CardHeader>
			<CardContent>
				<p className="text-sm text-muted-foreground">
					Coming in {phase}.
				</p>
			</CardContent>
		</Card>
	);
}
