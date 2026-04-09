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
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { HackathonNav } from "@/components/HackathonNav";
import type { HackathonRole } from "@/lib/hackathon-permissions";

export const Route = createFileRoute(
	"/_authed/hackathons/$id/judging/assign",
)({
	component: JudgeAssignPage,
});

function JudgeAssignPage() {
	const { id } = Route.useParams();
	const hackathonId = id as Id<"hackathons">;

	const myRole = useQuery(api.hackathonRoles.getMyRole, { hackathonId });
	const role = (myRole ?? null) as HackathonRole;
	const hackathon = useQuery(api.hackathons.getById, { id: hackathonId });
	const roles = useQuery(api.hackathonRoles.listByHackathon, {
		hackathonId,
	});
	const categories = useQuery(api.categories.listByHackathon, {
		hackathonId,
	});
	const assignments = useQuery(api.judgeAssignments.listForHackathon, {
		hackathonId,
	});
	const workload = useQuery(api.judgeAssignments.getJudgingWorkload, {
		hackathonId,
	});

	const assignToCategory = useMutation(
		api.judgeAssignments.assignToCategory,
	);
	const removeAssignment = useMutation(
		api.judgeAssignments.removeAssignment,
	);

	const [selectedJudge, setSelectedJudge] = useState("");
	const [selectedCategory, setSelectedCategory] = useState("");
	const [isAssigning, setIsAssigning] = useState(false);

	const judges = roles?.filter(
		(r) => r.role === "judge" || r.isOwner || r.role === "organiser",
	);

	const judgingStarted =
		hackathon?.status === "judging" || hackathon?.status === "closed";

	if (
		hackathon === undefined ||
		roles === undefined ||
		categories === undefined
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

	async function handleAssign() {
		if (!selectedJudge || !selectedCategory) return;
		setIsAssigning(true);
		try {
			await assignToCategory({
				hackathonId,
				judgeId: selectedJudge,
				categoryId: selectedCategory as Id<"categories">,
			});
			toast.success("Judge assigned to category");
			setSelectedJudge("");
			setSelectedCategory("");
		} catch (error) {
			toast.error(
				error instanceof Error ? error.message : "Failed to assign judge",
			);
		} finally {
			setIsAssigning(false);
		}
	}

	async function handleRemove(assignmentId: Id<"judgeAssignments">) {
		try {
			await removeAssignment({ assignmentId });
			toast.success("Assignment removed");
		} catch (error) {
			toast.error(
				error instanceof Error
					? error.message
					: "Failed to remove assignment",
			);
		}
	}

	return (
		<div className="flex gap-6">
			<aside className="w-48 shrink-0">
				<HackathonNav hackathonId={id} role={role} />
			</aside>

			<div className="flex-1 space-y-6">
				<h1 className="text-2xl font-bold">Judge Assignments</h1>

				{judgingStarted && (
					<Alert variant="destructive">
						<AlertDescription>
							Judging has started. Assignments cannot be changed.
						</AlertDescription>
					</Alert>
				)}

				{/* Workload overview */}
				{workload && workload.length > 0 && (
					<Card>
						<CardHeader>
							<CardTitle>Category Workload</CardTitle>
							<CardDescription>
								Submissions and judges per category
							</CardDescription>
						</CardHeader>
						<CardContent>
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead>Category</TableHead>
										<TableHead>Submissions</TableHead>
										<TableHead>Judges Assigned</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{workload.map((w) => (
										<TableRow key={w.categoryId}>
											<TableCell className="font-medium">
												{w.categoryName}
											</TableCell>
											<TableCell>{w.submissionCount}</TableCell>
											<TableCell>{w.judgeCount}</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
						</CardContent>
					</Card>
				)}

				{/* Assign form */}
				{!judgingStarted && (
					<Card>
						<CardHeader>
							<CardTitle>Assign Judge to Category</CardTitle>
						</CardHeader>
						<CardContent>
							<div className="flex items-end gap-4">
								<div className="flex-1 space-y-2">
									<label className="text-sm font-medium">Judge</label>
									<Select
										value={selectedJudge}
										onValueChange={setSelectedJudge}
									>
										<SelectTrigger>
											<SelectValue placeholder="Select a judge" />
										</SelectTrigger>
										<SelectContent>
											{judges?.map((j) => (
												<SelectItem key={j.userId} value={j.userId}>
													{j.userName ?? j.userEmail ?? j.userId}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>
								<div className="flex-1 space-y-2">
									<label className="text-sm font-medium">Category</label>
									<Select
										value={selectedCategory}
										onValueChange={setSelectedCategory}
									>
										<SelectTrigger>
											<SelectValue placeholder="Select a category" />
										</SelectTrigger>
										<SelectContent>
											{categories?.map((c) => (
												<SelectItem key={c._id} value={c._id}>
													{c.name}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>
								<Button
									onClick={handleAssign}
									disabled={
										!selectedJudge || !selectedCategory || isAssigning
									}
								>
									{isAssigning ? "Assigning..." : "Assign"}
								</Button>
							</div>
						</CardContent>
					</Card>
				)}

				{/* Current assignments */}
				<Card>
					<CardHeader>
						<CardTitle>Current Assignments</CardTitle>
					</CardHeader>
					<CardContent>
						{assignments && assignments.length > 0 ? (
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead>Judge</TableHead>
										<TableHead>Type</TableHead>
										<TableHead>Assignment</TableHead>
										{!judgingStarted && (
											<TableHead className="w-24" />
										)}
									</TableRow>
								</TableHeader>
								<TableBody>
									{assignments.map((a) => (
										<TableRow key={a._id}>
											<TableCell>
												{a.judgeName ?? a.judgeEmail ?? a.judgeId}
											</TableCell>
											<TableCell>
												<Badge variant="outline">
													{a.categoryName
														? "Category"
														: "Submission"}
												</Badge>
											</TableCell>
											<TableCell>
												{a.categoryName ??
													a.submissionTitle ??
													"--"}
											</TableCell>
											{!judgingStarted && (
												<TableCell>
													<Button
														variant="ghost"
														size="sm"
														onClick={() => handleRemove(a._id)}
													>
														Remove
													</Button>
												</TableCell>
											)}
										</TableRow>
									))}
								</TableBody>
							</Table>
						) : (
							<p className="text-sm text-muted-foreground">
								No assignments yet.
							</p>
						)}
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
