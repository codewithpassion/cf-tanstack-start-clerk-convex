import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../../../convex/_generated/api";
import type { Id } from "../../../../../../convex/_generated/dataModel";
import { useState, useEffect } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
	CardDescription,
} from "@/components/ui/card";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { HackathonNav } from "@/components/HackathonNav";
import type { HackathonRole } from "@/lib/hackathon-permissions";

export const Route = createFileRoute(
	"/_authed/hackathons/$id/judging/$categoryId",
)({
	component: CategoryJudgingPage,
});

const RANK_LABELS: Record<number, string> = {
	1: "1st Place",
	2: "2nd Place",
	3: "3rd Place",
};

const RANK_STYLES: Record<number, string> = {
	1: "border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20",
	2: "border-gray-400 bg-gray-50 dark:bg-gray-950/20",
	3: "border-amber-700 bg-amber-50 dark:bg-amber-950/20",
};

function CategoryJudgingPage() {
	const { id, categoryId } = Route.useParams();
	const hackathonId = id as Id<"hackathons">;
	const catId = categoryId as Id<"categories">;

	const myRole = useQuery(api.hackathonRoles.getMyRole, { hackathonId });
	const role = (myRole ?? null) as HackathonRole;

	const categories = useQuery(api.categories.listByHackathon, {
		hackathonId,
	});
	const category = categories?.find((c) => c._id === catId);

	const allSubmissions = useQuery(api.submissions.listByHackathon, {
		hackathonId,
		status: "approved",
	});

	const myRankings = useQuery(api.rankings.getRankings, { hackathonId });
	const saveRankingMut = useMutation(api.rankings.saveRanking);
	const removeRankingMut = useMutation(api.rankings.removeRanking);

	// Local state for ranking slots
	const [rankings, setRankings] = useState<Record<string, number | null>>(
		{},
	);
	const [isSaving, setIsSaving] = useState(false);
	const [initialized, setInitialized] = useState(false);

	// Initialize rankings from server data
	useEffect(() => {
		if (myRankings && !initialized) {
			const initial: Record<string, number | null> = {};
			for (const r of myRankings) {
				if (
					r.categoryId !== undefined &&
					(r.categoryId as string) === catId
				) {
					initial[r.submissionId as string] = r.rank;
				}
			}
			setRankings(initial);
			setInitialized(true);
		}
	}, [myRankings, initialized, catId]);

	if (
		categories === undefined ||
		allSubmissions === undefined ||
		myRankings === undefined
	) {
		return (
			<div className="flex gap-6">
				<aside className="w-48 shrink-0">
					<HackathonNav hackathonId={id} role={role} />
				</aside>
				<div className="flex-1">
					<Skeleton className="h-10 w-64 mb-6" />
					<Skeleton className="h-96" />
				</div>
			</div>
		);
	}

	if (!category) {
		return (
			<div className="flex gap-6">
				<aside className="w-48 shrink-0">
					<HackathonNav hackathonId={id} role={role} />
				</aside>
				<div className="flex-1">
					<h1 className="text-2xl font-bold">Category not found</h1>
				</div>
			</div>
		);
	}

	// Filter submissions for this category
	const categorySubmissions = allSubmissions.filter((s) =>
		s.categoryIds.includes(catId),
	);

	function setRank(submissionId: string, rank: number | null) {
		setRankings((prev) => {
			const next = { ...prev };
			if (rank !== null) {
				// Clear this rank from other submissions
				for (const sid of Object.keys(next)) {
					if (next[sid] === rank) next[sid] = null;
				}
			}
			next[submissionId] = rank;
			return next;
		});
	}

	function getSubmissionForRank(rank: number): string | null {
		for (const [sid, r] of Object.entries(rankings)) {
			if (r === rank) return sid;
		}
		return null;
	}

	async function handleSave() {
		setIsSaving(true);
		try {
			// Get current server rankings for this category
			const serverCatRankings = (myRankings ?? []).filter(
				(r) =>
					r.categoryId !== undefined &&
					(r.categoryId as string) === catId,
			);

			// Save new rankings
			for (const [submissionId, rank] of Object.entries(rankings)) {
				if (rank !== null) {
					await saveRankingMut({
						hackathonId,
						submissionId: submissionId as Id<"submissions">,
						categoryId: catId,
						rank,
					});
				}
			}

			// Remove rankings that were cleared
			for (const serverRanking of serverCatRankings) {
				const currentRank =
					rankings[serverRanking.submissionId as string];
				if (currentRank === null || currentRank === undefined) {
					await removeRankingMut({
						hackathonId,
						submissionId: serverRanking.submissionId,
						categoryId: catId,
					});
				}
			}

			toast.success("Rankings saved");
		} catch (error) {
			toast.error(
				error instanceof Error
					? error.message
					: "Failed to save rankings",
			);
		} finally {
			setIsSaving(false);
		}
	}

	const rankedCount = Object.values(rankings).filter(
		(r) => r !== null,
	).length;

	return (
		<div className="flex gap-6">
			<aside className="w-48 shrink-0">
				<HackathonNav hackathonId={id} role={role} />
			</aside>

			<div className="flex-1 space-y-6">
				<div className="flex items-center justify-between">
					<div>
						<h1 className="text-2xl font-bold">{category.name}</h1>
						{category.description && (
							<p className="text-muted-foreground mt-1">
								{category.description}
							</p>
						)}
					</div>
					<Button variant="outline" asChild>
						<Link
							to="/_authed/hackathons/$id/judging/"
							params={{ id }}
						>
							Back to Judging
						</Link>
					</Button>
				</div>

				{/* Ranking slots */}
				<Card>
					<CardHeader>
						<CardTitle>Your Rankings</CardTitle>
						<CardDescription>
							Select your top 3 submissions for this category.
							{rankedCount > 0 &&
								` ${rankedCount} of 3 slots filled.`}
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4">
						{[1, 2, 3].map((rank) => {
							const selectedId = getSubmissionForRank(rank);
							return (
								<div
									key={rank}
									className={`flex items-center gap-4 rounded-lg border-2 p-4 ${RANK_STYLES[rank]}`}
								>
									<span className="text-lg font-bold min-w-[100px]">
										{RANK_LABELS[rank]}
									</span>
									<Select
										value={selectedId ?? "none"}
										onValueChange={(val) => {
											if (val === "none") {
												// Clear current selection for this rank
												if (selectedId) {
													setRank(selectedId, null);
												}
											} else {
												setRank(val, rank);
											}
										}}
									>
										<SelectTrigger className="flex-1">
											<SelectValue placeholder="Select a submission" />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="none">
												-- None --
											</SelectItem>
											{categorySubmissions.map((s) => (
												<SelectItem
													key={s._id}
													value={s._id}
												>
													{s.title}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>
							);
						})}

						<Separator />

						<Button
							onClick={handleSave}
							disabled={isSaving}
							className="w-full"
						>
							{isSaving ? "Saving..." : "Save Rankings"}
						</Button>
					</CardContent>
				</Card>

				{/* Submissions list */}
				{categorySubmissions.length > 0 ? (
					<div className="space-y-4">
						<h2 className="text-lg font-semibold">Submissions</h2>
						{categorySubmissions.map((s) => {
							const rank = rankings[s._id as string];
							return (
								<Card key={s._id}>
									<CardHeader>
										<div className="flex items-center justify-between">
											<CardTitle className="text-base">
												{s.title}
											</CardTitle>
											{rank && (
												<Badge>{RANK_LABELS[rank]}</Badge>
											)}
										</div>
										<CardDescription>
											{s.teamName}
										</CardDescription>
										{s.description && (
											<p className="text-sm text-muted-foreground line-clamp-3 mt-1">
												{s.description}
											</p>
										)}
									</CardHeader>
									<CardContent>
										<div className="flex flex-wrap gap-2">
											{s.githubUrl && (
												<Button
													variant="outline"
													size="sm"
													asChild
												>
													<a
														href={s.githubUrl}
														target="_blank"
														rel="noopener noreferrer"
													>
														GitHub
													</a>
												</Button>
											)}
											{s.liveDemoUrl && (
												<Button
													variant="outline"
													size="sm"
													asChild
												>
													<a
														href={s.liveDemoUrl}
														target="_blank"
														rel="noopener noreferrer"
													>
														Live Demo
													</a>
												</Button>
											)}
											{s.videoUrl && (
												<Button
													variant="outline"
													size="sm"
													asChild
												>
													<a
														href={s.videoUrl}
														target="_blank"
														rel="noopener noreferrer"
													>
														Video
													</a>
												</Button>
											)}
										</div>
									</CardContent>
								</Card>
							);
						})}
					</div>
				) : (
					<Card>
						<CardContent className="py-8 text-center text-muted-foreground">
							No approved submissions in this category yet.
						</CardContent>
					</Card>
				)}
			</div>
		</div>
	);
}
