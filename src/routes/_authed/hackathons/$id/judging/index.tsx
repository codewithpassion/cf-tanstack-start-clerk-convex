import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { api } from "../../../../../../convex/_generated/api";
import type { Id } from "../../../../../../convex/_generated/dataModel";

import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
	CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { HackathonNav } from "@/components/HackathonNav";
import type { HackathonRole } from "@/lib/hackathon-permissions";
import { canManageHackathon } from "@/lib/hackathon-permissions";

export const Route = createFileRoute(
	"/_authed/hackathons/$id/judging/",
)({
	component: JudgingDashboardPage,
});

function JudgingDashboardPage() {
	const { id } = Route.useParams();
	const hackathonId = id as Id<"hackathons">;

	const myRole = useQuery(api.hackathonRoles.getMyRole, { hackathonId });
	const role = (myRole ?? null) as HackathonRole;
	const isOrganiser = canManageHackathon(role);

	const assignments = useQuery(api.judgeAssignments.listForJudge, {
		hackathonId,
	});
	const myRankings = useQuery(api.rankings.getRankings, { hackathonId });

	if (assignments === undefined) {
		return (
			<div className="flex gap-6">
				<aside className="w-48 shrink-0">
					<HackathonNav hackathonId={id} role={role} />
				</aside>
				<div className="flex-1">
					<Skeleton className="h-10 w-64 mb-6" />
					<Skeleton className="h-64" />
				</div>
			</div>
		);
	}

	// Group assignments by category
	const categoryAssignments = assignments.filter(
		(a) => a.categoryId !== undefined,
	);
	const uniqueCategories = new Map<
		string,
		{ id: string; name: string; order: number | null }
	>();
	for (const a of categoryAssignments) {
		if (a.categoryId && !uniqueCategories.has(a.categoryId)) {
			uniqueCategories.set(a.categoryId, {
				id: a.categoryId,
				name: a.categoryName ?? "Unknown",
				order: a.categoryOrder,
			});
		}
	}
	const categories = [...uniqueCategories.values()].sort(
		(a, b) => (a.order ?? 0) - (b.order ?? 0),
	);

	// Count rankings per category
	const rankingsByCategory = new Map<string, number>();
	for (const r of myRankings ?? []) {
		const catId = r.categoryId ?? "overall";
		rankingsByCategory.set(
			catId,
			(rankingsByCategory.get(catId) ?? 0) + 1,
		);
	}

	const totalRankings = myRankings?.length ?? 0;

	return (
		<div className="flex gap-6">
			<aside className="w-48 shrink-0">
				<HackathonNav hackathonId={id} role={role} />
			</aside>

			<div className="flex-1 space-y-6">
				<div className="flex items-center justify-between">
					<h1 className="text-2xl font-bold">Judging</h1>
					{isOrganiser && (
						<div className="flex gap-2">
							<Button variant="outline" asChild>
								<Link
									to={`/hackathons/${id}/judging/assign`}
								>
									Manage Assignments
								</Link>
							</Button>
							<Button variant="outline" asChild>
								<Link to={`/hackathons/${id}/results`}>
									View Results
								</Link>
							</Button>
						</div>
					)}
				</div>

				{/* Progress card */}
				<Card>
					<CardHeader>
						<CardTitle>Your Progress</CardTitle>
						<CardDescription>
							{totalRankings > 0
								? `You have submitted ${totalRankings} ranking${totalRankings === 1 ? "" : "s"} so far.`
								: "You have not submitted any rankings yet."}
						</CardDescription>
					</CardHeader>
				</Card>

				{/* Per-category sections */}
				{categories.length > 0 ? (
					<div className="space-y-4">
						<h2 className="text-lg font-semibold">
							Assigned Categories
						</h2>
						<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
							{categories.map((cat) => {
								const catRankingCount =
									rankingsByCategory.get(cat.id) ?? 0;
								return (
									<Card key={cat.id}>
										<CardHeader>
											<CardTitle className="text-base">
												{cat.name}
											</CardTitle>
											<CardDescription>
												{catRankingCount > 0
													? `${catRankingCount} ranking${catRankingCount === 1 ? "" : "s"} submitted`
													: "No rankings submitted yet"}
											</CardDescription>
										</CardHeader>
										<CardContent>
											<Button variant="outline" size="sm" asChild>
												<Link
													to={`/hackathons/${id}/judging/${cat.id}`}
												>
													{catRankingCount > 0
														? "Edit Rankings"
														: "Start Judging"}
												</Link>
											</Button>
										</CardContent>
									</Card>
								);
							})}
						</div>
					</div>
				) : (
					<Card>
						<CardContent className="py-8 text-center text-muted-foreground">
							{assignments.length === 0
								? "You have no judging assignments yet."
								: "No category assignments found."}
						</CardContent>
					</Card>
				)}

				{/* Submission-specific assignments */}
				{assignments.filter((a) => a.submissionId !== undefined).length >
					0 && (
					<div className="space-y-4">
						<h2 className="text-lg font-semibold">
							Assigned Submissions
						</h2>
						<div className="space-y-2">
							{assignments
								.filter((a) => a.submissionId !== undefined)
								.map((a) => (
									<Card key={a._id}>
										<CardContent className="flex items-center justify-between py-4">
											<div>
												<p className="font-medium">
													{a.submissionTitle ?? "Unknown"}
												</p>
												<Badge variant="outline" className="mt-1">
													Direct Assignment
												</Badge>
											</div>
										</CardContent>
									</Card>
								))}
						</div>
					</div>
				)}
			</div>
		</div>
	);
}
