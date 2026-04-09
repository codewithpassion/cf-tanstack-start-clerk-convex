import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import type { Id } from "../../../../../convex/_generated/dataModel";

import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { HackathonNav } from "@/components/HackathonNav";
import type { HackathonRole } from "@/lib/hackathon-permissions";
import { timeAgo } from "@/lib/time";

export const Route = createFileRoute(
	"/_authed/hackathons/$id/analytics",
)({
	component: AnalyticsPage,
});

function AnalyticsPage() {
	const { id } = Route.useParams();
	const hackathonId = id as Id<"hackathons">;

	const myRole = useQuery(api.hackathonRoles.getMyRole, { hackathonId });
	const role = (myRole ?? null) as HackathonRole;

	const stats = useQuery(api.analytics.getHackathonStats, { hackathonId });
	const timeline = useQuery(api.analytics.getRegistrationTimeline, {
		hackathonId,
	});
	const recentLogs = useQuery(api.auditLogs.listRecent, {
		hackathonId,
		limit: 15,
	});

	const isOrganiser = role === "owner" || role === "organiser";

	return (
		<div className="flex gap-6">
			<aside className="w-48 shrink-0">
				<HackathonNav hackathonId={id} role={role} />
			</aside>

			<div className="flex-1 space-y-6">
				<h1 className="text-2xl font-bold">Analytics</h1>

				{!isOrganiser && (
					<Card>
						<CardContent className="py-8 text-center text-muted-foreground">
							Only organisers can view analytics.
						</CardContent>
					</Card>
				)}

				{isOrganiser && stats && (
					<>
						<div className="grid grid-cols-2 gap-4 md:grid-cols-4">
							<StatCard
								label="Registrations"
								value={stats.totalRegistrations}
							/>
							<StatCard label="Teams" value={stats.totalTeams} />
							<StatCard
								label="Submissions"
								value={stats.totalSubmissions}
							/>
							<StatCard
								label="Completion Rate"
								value={`${Math.round(stats.submissionRate * 100)}%`}
							/>
						</div>

						<div className="grid grid-cols-2 gap-4 md:grid-cols-4">
							<StatCard
								label="Approved Submissions"
								value={stats.approvedSubmissions}
							/>
							<StatCard
								label="Pending Problems"
								value={stats.pendingProblems}
							/>
							<StatCard
								label="Total Problems"
								value={stats.totalProblems}
							/>
							<StatCard
								label="Judges Assigned"
								value={stats.judgesAssigned}
							/>
						</div>

						{timeline && timeline.length > 0 && (
							<Card>
								<CardHeader>
									<CardTitle>Registration Timeline</CardTitle>
									<CardDescription>
										Daily registrations over the last 30 days
									</CardDescription>
								</CardHeader>
								<CardContent>
									<div className="overflow-x-auto">
										<table className="w-full text-sm">
											<thead>
												<tr className="border-b">
													<th className="py-2 text-left font-medium">
														Date
													</th>
													<th className="py-2 text-right font-medium">
														Registrations
													</th>
												</tr>
											</thead>
											<tbody>
												{timeline.map((row) => (
													<tr
														key={row.date}
														className="border-b last:border-0"
													>
														<td className="py-2">{row.date}</td>
														<td className="py-2 text-right">
															{row.count}
														</td>
													</tr>
												))}
											</tbody>
										</table>
									</div>
								</CardContent>
							</Card>
						)}

						{recentLogs && recentLogs.length > 0 && (
							<Card>
								<CardHeader>
									<CardTitle>Recent Activity</CardTitle>
									<CardDescription>
										Audit log for this hackathon
									</CardDescription>
								</CardHeader>
								<CardContent>
									<div className="overflow-x-auto">
										<table className="w-full text-sm">
											<thead>
												<tr className="border-b">
													<th className="py-2 text-left font-medium">
														Action
													</th>
													<th className="py-2 text-left font-medium">
														User
													</th>
													<th className="py-2 text-right font-medium">
														When
													</th>
												</tr>
											</thead>
											<tbody>
												{recentLogs.map((log) => (
													<tr
														key={log._id}
														className="border-b last:border-0"
													>
														<td className="py-2">
															<Badge variant="outline">
																{log.action}
															</Badge>
														</td>
														<td className="py-2">
															{log.userName}
														</td>
														<td className="py-2 text-right text-muted-foreground">
															{timeAgo(log.createdAt)}
														</td>
													</tr>
												))}
											</tbody>
										</table>
									</div>
								</CardContent>
							</Card>
						)}

						<Card>
							<CardContent className="py-6 text-center text-sm text-muted-foreground">
								Export functionality coming soon.
							</CardContent>
						</Card>
					</>
				)}
			</div>
		</div>
	);
}

function StatCard({
	label,
	value,
}: {
	label: string;
	value: string | number;
}) {
	return (
		<Card>
			<CardContent className="pt-4 pb-3">
				<p className="text-xs text-muted-foreground">{label}</p>
				<p className="text-2xl font-bold mt-1">{value}</p>
			</CardContent>
		</Card>
	);
}
