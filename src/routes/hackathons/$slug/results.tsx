import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";

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
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/hackathons/$slug/results")({
	component: PublicResultsPage,
});

const TROPHY: Record<number, string> = {
	1: "1st",
	2: "2nd",
	3: "3rd",
};

const TROPHY_COLORS: Record<number, string> = {
	1: "bg-yellow-100 border-yellow-400 dark:bg-yellow-950/30 dark:border-yellow-600",
	2: "bg-gray-100 border-gray-400 dark:bg-gray-950/30 dark:border-gray-600",
	3: "bg-amber-100 border-amber-600 dark:bg-amber-950/30 dark:border-amber-700",
};

function PublicResultsPage() {
	const { slug } = Route.useParams();
	const hackathon = useQuery(api.hackathons.getBySlug, { slug });

	if (hackathon === undefined) {
		return (
			<div className="container mx-auto p-6 max-w-4xl">
				<Skeleton className="h-10 w-64 mb-6" />
				<Skeleton className="h-96" />
			</div>
		);
	}

	if (hackathon === null) {
		return (
			<div className="container mx-auto p-6 max-w-4xl">
				<h1 className="text-3xl font-bold">Hackathon Not Found</h1>
			</div>
		);
	}

	return (
		<div className="container mx-auto p-6 max-w-4xl space-y-8">
			<div>
				<h1 className="text-3xl font-bold">{hackathon.name}</h1>
				<p className="text-muted-foreground mt-1">Results</p>
			</div>

			<ResultsContent hackathonId={hackathon._id} />
		</div>
	);
}

function ResultsContent({
	hackathonId,
}: { hackathonId: Id<"hackathons"> }) {
	const winners = useQuery(api.results.getWinners, { hackathonId });
	const overallResults = useQuery(api.results.getResults, {
		hackathonId,
		categoryId: undefined,
	});
	const categories = useQuery(api.categories.listByHackathon, {
		hackathonId,
	});

	if (
		winners === undefined ||
		overallResults === undefined ||
		categories === undefined
	) {
		return <Skeleton className="h-96" />;
	}

	// Check if anything is published
	const hasPublishedResults =
		winners.length > 0 || overallResults.length > 0;

	if (!hasPublishedResults) {
		return (
			<Card>
				<CardContent className="py-16 text-center">
					<h2 className="text-xl font-semibold mb-2">
						Results Not Yet Published
					</h2>
					<p className="text-muted-foreground">
						Check back later for the hackathon results.
					</p>
				</CardContent>
			</Card>
		);
	}

	const tabs = [
		{ value: "overall", label: "Overall" },
		...categories.map((c) => ({ value: c._id, label: c.name })),
	];

	return (
		<>
			{/* Winners section */}
			{winners.length > 0 && (
				<div className="space-y-4">
					<h2 className="text-2xl font-bold">Winners</h2>
					<div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
						{winners.map((w) => (
							<Card
								key={w._id}
								className={`border-2 ${TROPHY_COLORS[w.rank] ?? ""}`}
							>
								<CardHeader className="text-center">
									<div className="text-4xl mb-2">
										{TROPHY[w.rank] ?? `#${w.rank}`}
									</div>
									<CardTitle>{w.submissionTitle}</CardTitle>
									<CardDescription>
										{w.teamName}
									</CardDescription>
								</CardHeader>
								<CardContent className="text-center">
									<p className="text-sm text-muted-foreground">
										{w.totalPoints} points
									</p>
								</CardContent>
							</Card>
						))}
					</div>
				</div>
			)}

			{/* Full results by tab */}
			{categories.length > 0 ? (
				<Tabs defaultValue="overall">
					<TabsList>
						{tabs.map((tab) => (
							<TabsTrigger key={tab.value} value={tab.value}>
								{tab.label}
							</TabsTrigger>
						))}
					</TabsList>

					<TabsContent value="overall">
						<PublicResultsTable
							hackathonId={hackathonId}
							categoryId={undefined}
						/>
					</TabsContent>
					{categories.map((c) => (
						<TabsContent key={c._id} value={c._id}>
							<PublicResultsTable
								hackathonId={hackathonId}
								categoryId={c._id}
							/>
						</TabsContent>
					))}
				</Tabs>
			) : (
				<PublicResultsTable
					hackathonId={hackathonId}
					categoryId={undefined}
				/>
			)}
		</>
	);
}

function PublicResultsTable({
	hackathonId,
	categoryId,
}: {
	hackathonId: Id<"hackathons">;
	categoryId: Id<"categories"> | undefined;
}) {
	const results = useQuery(api.results.getResults, {
		hackathonId,
		categoryId,
	});

	if (results === undefined) {
		return <Skeleton className="h-64" />;
	}

	if (results.length === 0) {
		return (
			<Card>
				<CardContent className="py-8 text-center text-muted-foreground">
					No results available for this category.
				</CardContent>
			</Card>
		);
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
							<TableHead className="text-right">1st Votes</TableHead>
							<TableHead className="text-right">2nd Votes</TableHead>
							<TableHead className="text-right">3rd Votes</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{results.map((r) => (
							<TableRow
								key={r._id}
								className={
									r.rank <= 3
										? "font-medium"
										: ""
								}
							>
								<TableCell>
									<span className="font-bold">
										#{r.rank}
									</span>
									{r.rank <= 3 && (
										<Badge
											variant={
												r.rank === 1
													? "default"
													: "secondary"
											}
											className="ml-2"
										>
											{TROPHY[r.rank]}
										</Badge>
									)}
								</TableCell>
								<TableCell>{r.submissionTitle}</TableCell>
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
							</TableRow>
						))}
					</TableBody>
				</Table>
			</CardContent>
		</Card>
	);
}
