import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../../../convex/_generated/api";
import type { Id } from "../../../../../../convex/_generated/dataModel";
import { toast } from "sonner";
import { useState } from "react";
import { Check, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute(
	"/_authed/hackathons/$id/curate/solutions",
)({
	component: CurateSolutionsPage,
});

function CurateSolutionsPage() {
	const { id } = Route.useParams();
	const hackathonId = id as Id<"hackathons">;

	const pending = useQuery(api.submissions.listPendingForCuration, {
		hackathonId,
	});
	const approved = useQuery(api.submissions.listByHackathon, {
		hackathonId,
		status: "approved",
	});
	const rejected = useQuery(api.submissions.listByHackathon, {
		hackathonId,
		status: "rejected",
	});

	const approveMutation = useMutation(api.submissions.approve);
	const rejectMutation = useMutation(api.submissions.reject);

	const [rejectTarget, setRejectTarget] = useState<Id<"submissions"> | null>(
		null,
	);
	const [rejectReason, setRejectReason] = useState("");

	async function handleApprove(submissionId: Id<"submissions">) {
		try {
			await approveMutation({ id: submissionId });
			toast.success("Submission approved");
		} catch (e) {
			toast.error(
				e instanceof Error ? e.message : "Failed to approve",
			);
		}
	}

	async function handleReject() {
		if (!rejectTarget) return;
		try {
			await rejectMutation({
				id: rejectTarget,
				reason: rejectReason || undefined,
			});
			toast.success("Submission rejected");
			setRejectTarget(null);
			setRejectReason("");
		} catch (e) {
			toast.error(
				e instanceof Error ? e.message : "Failed to reject",
			);
		}
	}

	return (
		<div className="space-y-6">
			<h1 className="text-2xl font-bold">Curate Solutions</h1>

			<Tabs defaultValue="pending">
				<TabsList>
					<TabsTrigger value="pending">
						Pending{" "}
						{pending && pending.length > 0 && (
							<Badge variant="secondary" className="ml-1">
								{pending.length}
							</Badge>
						)}
					</TabsTrigger>
					<TabsTrigger value="approved">Approved</TabsTrigger>
					<TabsTrigger value="rejected">Rejected</TabsTrigger>
				</TabsList>

				<TabsContent value="pending" className="space-y-4 mt-4">
					{pending === undefined ? (
						<LoadingSkeleton />
					) : pending.length === 0 ? (
						<p className="text-muted-foreground text-sm">
							No submissions pending review.
						</p>
					) : (
						pending.map((s) => (
							<SubmissionCard
								key={s._id}
								submission={s}
								actions={
									<div className="flex gap-2">
										<Button
											size="sm"
											onClick={() =>
												handleApprove(s._id)
											}
										>
											<Check className="h-4 w-4 mr-1" />
											Approve
										</Button>
										<Button
											size="sm"
											variant="destructive"
											onClick={() =>
												setRejectTarget(s._id)
											}
										>
											<X className="h-4 w-4 mr-1" />
											Reject
										</Button>
									</div>
								}
							/>
						))
					)}
				</TabsContent>

				<TabsContent value="approved" className="space-y-4 mt-4">
					{approved === undefined ? (
						<LoadingSkeleton />
					) : approved.length === 0 ? (
						<p className="text-muted-foreground text-sm">
							No approved submissions yet.
						</p>
					) : (
						approved.map((s) => (
							<SubmissionCard
								key={s._id}
								submission={s}
							/>
						))
					)}
				</TabsContent>

				<TabsContent value="rejected" className="space-y-4 mt-4">
					{rejected === undefined ? (
						<LoadingSkeleton />
					) : rejected.length === 0 ? (
						<p className="text-muted-foreground text-sm">
							No rejected submissions.
						</p>
					) : (
						rejected.map((s) => (
							<SubmissionCard
								key={s._id}
								submission={s}
							/>
						))
					)}
				</TabsContent>
			</Tabs>

			{/* Reject dialog */}
			<Dialog
				open={!!rejectTarget}
				onOpenChange={(open) => {
					if (!open) {
						setRejectTarget(null);
						setRejectReason("");
					}
				}}
			>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Reject Submission</DialogTitle>
					</DialogHeader>
					<Textarea
						placeholder="Reason for rejection (optional)"
						value={rejectReason}
						onChange={(e) => setRejectReason(e.target.value)}
					/>
					<DialogFooter>
						<Button
							variant="outline"
							onClick={() => setRejectTarget(null)}
						>
							Cancel
						</Button>
						<Button variant="destructive" onClick={handleReject}>
							Reject
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}

function SubmissionCard({
	submission,
	actions,
}: {
	submission: {
		_id: Id<"submissions">;
		title: string;
		description: string;
		teamName: string;
		categories: Array<{ _id: Id<"categories">; name: string } | null>;
		submittedAt?: number;
		status: string;
	};
	actions?: React.ReactNode;
}) {
	const excerpt =
		submission.description.length > 200
			? `${submission.description.slice(0, 200)}...`
			: submission.description;

	return (
		<Card>
			<CardHeader>
				<div className="flex items-start justify-between">
					<div>
						<CardTitle className="text-base">
							{submission.title}
						</CardTitle>
						<CardDescription>
							by {submission.teamName}
							{submission.submittedAt &&
								` | Submitted ${new Date(submission.submittedAt).toLocaleDateString()}`}
						</CardDescription>
					</div>
					{actions}
				</div>
			</CardHeader>
			<CardContent>
				<p className="text-sm text-muted-foreground mb-3">{excerpt}</p>
				{submission.categories.length > 0 && (
					<div className="flex flex-wrap gap-1">
						{submission.categories.map(
							(cat) =>
								cat && (
									<Badge
										key={cat._id}
										variant="outline"
										className="text-xs"
									>
										{cat.name}
									</Badge>
								),
						)}
					</div>
				)}
			</CardContent>
		</Card>
	);
}

function LoadingSkeleton() {
	return (
		<div className="space-y-4">
			<Skeleton className="h-32" />
			<Skeleton className="h-32" />
		</div>
	);
}
