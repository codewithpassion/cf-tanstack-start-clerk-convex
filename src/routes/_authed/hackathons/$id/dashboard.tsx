import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import type { Id } from "../../../../../convex/_generated/dataModel";

import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { HackathonNav } from "@/components/HackathonNav";
import type { HackathonRole } from "@/lib/hackathon-permissions";
import { getRoleDisplayName } from "@/lib/hackathon-permissions";

export const Route = createFileRoute("/_authed/hackathons/$id/dashboard")({
	component: DashboardPage,
});

function DashboardPage() {
	const { id } = Route.useParams();
	const hackathonId = id as Id<"hackathons">;

	const myRole = useQuery(api.hackathonRoles.getMyRole, { hackathonId });
	const role = (myRole ?? null) as HackathonRole;

	return (
		<div className="flex gap-6">
			<aside className="w-48 shrink-0">
				<HackathonNav hackathonId={id} role={role} />
			</aside>

			<div className="flex-1 space-y-6">
				<div className="flex items-center justify-between">
					<h1 className="text-2xl font-bold">Dashboard</h1>
					{role && (
						<Badge variant="secondary">{getRoleDisplayName(role)}</Badge>
					)}
				</div>

				{(role === "owner" || role === "organiser") && (
					<OrganiserDashboard hackathonId={id} />
				)}
				{role === "judge" && <JudgeDashboard hackathonId={id} />}
				{role === "participant" && (
					<ParticipantDashboard hackathonId={id} />
				)}
				{role === "curator" && <CuratorDashboard hackathonId={id} />}
				{role === null && (
					<Card>
						<CardContent className="py-8 text-center text-muted-foreground">
							You do not have a role in this hackathon.
						</CardContent>
					</Card>
				)}
			</div>
		</div>
	);
}

function OrganiserDashboard({ hackathonId }: { hackathonId: string }) {
	return (
		<>
			<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
				<StatCard title="Total Teams" value="0" />
				<StatCard title="Total Submissions" value="0" />
				<StatCard title="Pending Problem Reviews" value="0" />
				<StatCard title="Pending Solution Reviews" value="0" />
			</div>

			<Card>
				<CardHeader>
					<CardTitle>Quick Actions</CardTitle>
				</CardHeader>
				<CardContent className="flex flex-wrap gap-3">
					<Button variant="outline" asChild>
						<Link to="/hackathons/$id/team" params={{ id: hackathonId }}>
							Manage Team
						</Link>
					</Button>
					<Button variant="outline" asChild>
						<Link to="/hackathons/$id/settings" params={{ id: hackathonId }}>
							Settings
						</Link>
					</Button>
					<Button variant="outline" asChild>
						<Link to="/hackathons/$id/categories" params={{ id: hackathonId }}>
							Categories
						</Link>
					</Button>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>Recent Activity</CardTitle>
				</CardHeader>
				<CardContent>
					<p className="text-sm text-muted-foreground">
						No recent activity yet.
					</p>
				</CardContent>
			</Card>
		</>
	);
}

function JudgeDashboard({ hackathonId }: { hackathonId: string }) {
	return (
		<>
			<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
				<StatCard title="My Assigned Categories" value="0" />
				<StatCard title="Submissions to Review" value="0" />
			</div>

			<Card>
				<CardHeader>
					<CardTitle>Quick Actions</CardTitle>
				</CardHeader>
				<CardContent>
					<Button variant="outline" asChild>
						<Link to="/hackathons/$id/judging" params={{ id: hackathonId }}>
							Go to Judging
						</Link>
					</Button>
				</CardContent>
			</Card>
		</>
	);
}

function ParticipantDashboard({ hackathonId }: { hackathonId: string }) {
	return (
		<>
			<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
				<Card>
					<CardHeader>
						<CardTitle>My Team</CardTitle>
					</CardHeader>
					<CardContent>
						<p className="text-sm text-muted-foreground">
							You're not on a team yet.
						</p>
						<Button variant="outline" className="mt-3" asChild>
							<Link to="/hackathons/$id/teams" params={{ id: hackathonId }}>
								Join or Create a Team
							</Link>
						</Button>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle>My Submission</CardTitle>
					</CardHeader>
					<CardContent>
						<p className="text-sm text-muted-foreground">
							No submission yet.
						</p>
						<Button variant="outline" className="mt-3" asChild>
							<Link to={`/hackathons/${hackathonId}/my-submission`}>
								View Submission
							</Link>
						</Button>
					</CardContent>
				</Card>
			</div>

			<Card>
				<CardHeader>
					<CardTitle>Upcoming Deadlines</CardTitle>
				</CardHeader>
				<CardContent>
					<p className="text-sm text-muted-foreground">
						No upcoming deadlines.
					</p>
				</CardContent>
			</Card>
		</>
	);
}

function CuratorDashboard({ hackathonId }: { hackathonId: string }) {
	return (
		<>
			<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
				<StatCard title="Pending Problems to Review" value="0" />
				<StatCard title="Total Problems Curated" value="0" />
			</div>

			<Card>
				<CardHeader>
					<CardTitle>Quick Actions</CardTitle>
				</CardHeader>
				<CardContent>
					<Button variant="outline" asChild>
						<Link to={`/hackathons/${hackathonId}/curate-problems`}>
							Curate Problems
						</Link>
					</Button>
				</CardContent>
			</Card>
		</>
	);
}

function StatCard({ title, value }: { title: string; value: string }) {
	return (
		<Card>
			<CardHeader className="pb-2">
				<CardTitle className="text-sm font-medium text-muted-foreground">
					{title}
				</CardTitle>
			</CardHeader>
			<CardContent>
				<p className="text-3xl font-bold">{value}</p>
			</CardContent>
		</Card>
	);
}
