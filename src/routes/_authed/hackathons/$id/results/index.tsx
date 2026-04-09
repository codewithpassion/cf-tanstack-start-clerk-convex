import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../../../convex/_generated/api";
import type { Id } from "../../../../../../convex/_generated/dataModel";
import { useState } from "react";
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
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { HackathonNav } from "@/components/HackathonNav";
import type { HackathonRole } from "@/lib/hackathon-permissions";

export const Route = createFileRoute(
	"/_authed/hackathons/$id/results/",
)({
	component: ResultsManagementPage,
});

function ResultsManagementPage() {
	const { id } = Route.useParams();
	const hackathonId = id as Id<"hackathons">;

	const myRole = useQuery(api.hackathonRoles.getMyRole, { hackathonId });
	const role = (myRole ?? null) as HackathonRole;
	const categories = useQuery(api.categories.listByHackathon, {
		hackathonId,
	});

	const [selectedCategory, setSelectedCategory] = useState<string>("overall");
	const [isComputing, setIsComputing] = useState(false);

	const categoryId =
		selectedCategory === "overall"
			? undefined
			: (selectedCategory as Id<"categories">);

	const results = useQuery(api.results.getResults, {
		hackathonId,
		categoryId,
	});

	const computeResults = useMutation(api.results.computeResults);
	const publishResults = useMutation(api.results.publishResults);
	const unpublishResults = useMutation(api.results.unpublishResults);
	const overrideRank = useMutation(api.results.overrideRank);

	if (categories === undefined) {
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

	const isPublished = results?.some((r) => r.isPublished) ?? false;

	async function handleCompute() {
		setIsComputing(true);
		try {
			await computeResults({ hackathonId, categoryId });
			toast.success("Results computed");
		} catch (error) {
			toast.error(
				error instanceof Error
					? error.message
					: "Failed to compute results",
			);
		} finally {
			setIsComputing(false);
		}
	}

	async function handlePublish() {
		try {
			await publishResults({ hackathonId, categoryId });
			toast.success("Results published");
		} catch (error) {
			toast.error(
				error instanceof Error
					? error.message
					: "Failed to publish results",
			);
		}
	}

	async function handleUnpublish() {
		try {
			await unpublishResults({ hackathonId, categoryId });
			toast.success("Results unpublished");
		} catch (error) {
			toast.error(
				error instanceof Error
					? error.message
					: "Failed to unpublish results",
			);
		}
	}

	async function handleOverrideRank(
		resultId: Id<"results">,
		newRank: number,
	) {
		try {
			await overrideRank({ resultId, newRank });
			toast.success("Rank overridden");
		} catch (error) {
			toast.error(
				error instanceof Error
					? error.message
					: "Failed to override rank",
			);
		}
	}

	const tabs = [
		{ value: "overall", label: "Overall" },
		...(categories?.map((c) => ({ value: c._id, label: c.name })) ?? []),
	];

	return (
		<div className="flex gap-6">
			<aside className="w-48 shrink-0">
				<HackathonNav hackathonId={id} role={role} />
			</aside>

			<div className="flex-1 space-y-6">
				<h1 className="text-2xl font-bold">Results Management</h1>

				{/* Controls */}
				<Card>
					<CardHeader>
						<CardTitle>Compute & Publish</CardTitle>
						<CardDescription>
							Compute results from judge rankings and publish when
							ready.
						</CardDescription>
					</CardHeader>
					<CardContent className="flex flex-wrap gap-3">
						<Button
							onClick={handleCompute}
							disabled={isComputing}
						>
							{isComputing
								? "Computing..."
								: "Compute Results"}
						</Button>
						{results && results.length > 0 && (
							<>
								{isPublished ? (
									<Button
										variant="outline"
										onClick={handleUnpublish}
									>
										Unpublish Results
									</Button>
								) : (
									<Button
										variant="secondary"
										onClick={handlePublish}
									>
										Publish Results
									</Button>
								)}
							</>
						)}
						{isPublished && (
							<Badge variant="default">Published</Badge>
						)}
					</CardContent>
				</Card>

				{/* Category tabs */}
				<Tabs
					value={selectedCategory}
					onValueChange={setSelectedCategory}
				>
					<TabsList>
						{tabs.map((tab) => (
							<TabsTrigger key={tab.value} value={tab.value}>
								{tab.label}
							</TabsTrigger>
						))}
					</TabsList>

					{tabs.map((tab) => (
						<TabsContent key={tab.value} value={tab.value}>
							<ResultsTable
								results={
									selectedCategory === tab.value
										? results
										: undefined
								}
								onOverrideRank={handleOverrideRank}
							/>
						</TabsContent>
					))}
				</Tabs>
			</div>
		</div>
	);
}

function ResultsTable({
	results,
	onOverrideRank,
}: {
	results:
		| Array<{
				_id: Id<"results">;
				rank: number;
				submissionTitle: string;
				teamName: string;
				totalPoints: number;
				firstPlaceVotes: number;
				secondPlaceVotes: number;
				thirdPlaceVotes: number;
				isPublished: boolean;
				overriddenBy?: string;
		  }>
		| undefined;
	onOverrideRank: (resultId: Id<"results">, newRank: number) => void;
}) {
	const [editingId, setEditingId] = useState<string | null>(null);
	const [editValue, setEditValue] = useState("");

	if (results === undefined) {
		return <Skeleton className="h-64" />;
	}

	if (results.length === 0) {
		return (
			<Card>
				<CardContent className="py-8 text-center text-muted-foreground">
					No results computed yet. Click "Compute Results" to generate
					results from judge rankings.
				</CardContent>
			</Card>
		);
	}

	function handleStartEdit(resultId: string, currentRank: number) {
		setEditingId(resultId);
		setEditValue(String(currentRank));
	}

	function handleSaveEdit(resultId: Id<"results">) {
		const newRank = parseInt(editValue, 10);
		if (Number.isNaN(newRank) || newRank < 1) return;
		onOverrideRank(resultId, newRank);
		setEditingId(null);
	}

	return (
		<Card>
			<CardContent className="pt-6">
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead className="w-16">Rank</TableHead>
							<TableHead>Submission</TableHead>
							<TableHead>Team</TableHead>
							<TableHead className="text-right">Points</TableHead>
							<TableHead className="text-right">1st</TableHead>
							<TableHead className="text-right">2nd</TableHead>
							<TableHead className="text-right">3rd</TableHead>
							<TableHead className="w-24" />
						</TableRow>
					</TableHeader>
					<TableBody>
						{results.map((r) => (
							<TableRow key={r._id}>
								<TableCell>
									{editingId === r._id ? (
										<Input
											value={editValue}
											onChange={(e) =>
												setEditValue(e.target.value)
											}
											onKeyDown={(e) => {
												if (e.key === "Enter")
													handleSaveEdit(r._id);
												if (e.key === "Escape")
													setEditingId(null);
											}}
											onBlur={() =>
												handleSaveEdit(r._id)
											}
											className="w-16 h-8"
											autoFocus
										/>
									) : (
										<span
											className="cursor-pointer font-bold"
											onClick={() =>
												handleStartEdit(
													r._id,
													r.rank,
												)
											}
											title="Click to edit rank"
										>
											#{r.rank}
											{r.overriddenBy && (
												<span className="ml-1 text-xs text-muted-foreground">
													*
												</span>
											)}
										</span>
									)}
								</TableCell>
								<TableCell className="font-medium">
									{r.submissionTitle}
								</TableCell>
								<TableCell>{r.teamName}</TableCell>
								<TableCell className="text-right font-bold">
									{r.totalPoints}
								</TableCell>
								<TableCell className="text-right">
									{r.firstPlaceVotes}
								</TableCell>
								<TableCell className="text-right">
									{r.secondPlaceVotes}
								</TableCell>
								<TableCell className="text-right">
									{r.thirdPlaceVotes}
								</TableCell>
								<TableCell>
									{r.rank <= 3 && (
										<Badge
											variant={
												r.rank === 1
													? "default"
													: "secondary"
											}
										>
											{r.rank === 1
												? "1st"
												: r.rank === 2
													? "2nd"
													: "3rd"}
										</Badge>
									)}
								</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
			</CardContent>
		</Card>
	);
}
