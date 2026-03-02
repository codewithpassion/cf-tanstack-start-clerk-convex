import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../../../../convex/_generated/api";
import type { Id } from "../../../../../../../convex/_generated/dataModel";
import { toast } from "sonner";
import { ExternalLink } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "@/components/ui/collapsible";

export const Route = createFileRoute(
	"/_authed/hackathons/$id/submissions/$submissionId/",
)({
	component: SubmissionDetailPage,
});

const statusVariant: Record<
	string,
	"default" | "secondary" | "outline" | "destructive"
> = {
	draft: "secondary",
	submitted: "outline",
	approved: "default",
	rejected: "destructive",
};

function SubmissionDetailPage() {
	const { id, submissionId } = Route.useParams();
	const submission = useQuery(api.submissions.getById, {
		id: submissionId as Id<"submissions">,
	});
	const versionHistory = useQuery(api.submissions.getVersionHistory, {
		submissionId: submissionId as Id<"submissions">,
	});
	const submitMutation = useMutation(api.submissions.submit);

	if (submission === undefined) {
		return (
			<div className="max-w-3xl mx-auto space-y-4">
				<Skeleton className="h-10 w-64" />
				<Skeleton className="h-64" />
			</div>
		);
	}

	if (submission === null) {
		return (
			<div className="max-w-3xl mx-auto">
				<h1 className="text-2xl font-bold mb-4">Submission Not Found</h1>
				<p className="text-muted-foreground">
					This submission does not exist or you do not have access.
				</p>
			</div>
		);
	}

	async function handleSubmit() {
		try {
			await submitMutation({
				id: submissionId as Id<"submissions">,
			});
			toast.success("Submission submitted for review");
		} catch (e) {
			toast.error(
				e instanceof Error ? e.message : "Failed to submit",
			);
		}
	}

	const canEdit =
		submission.status === "draft" || submission.status === "submitted";

	return (
		<div className="max-w-3xl mx-auto space-y-6">
			<div className="flex items-start justify-between">
				<div>
					<div className="flex items-center gap-3 mb-1">
						<h1 className="text-2xl font-bold">
							{submission.title}
						</h1>
						<Badge variant={statusVariant[submission.status]}>
							{submission.status}
						</Badge>
					</div>
					<p className="text-sm text-muted-foreground">
						by {submission.teamName} &middot; v
						{submission.version}
					</p>
				</div>
				<div className="flex gap-2">
					{submission.status === "draft" && (
						<Button onClick={handleSubmit}>Submit</Button>
					)}
					{canEdit && (
						<Link
							to="/hackathons/$id/submissions/$submissionId/edit"
							params={{ id, submissionId }}
						>
							<Button variant="outline">Edit</Button>
						</Link>
					)}
				</div>
			</div>

			<Card>
				<CardHeader>
					<CardTitle>Description</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="prose dark:prose-invert max-w-none whitespace-pre-wrap">
						{submission.description}
					</div>
				</CardContent>
			</Card>

			{/* Categories & Problem */}
			<Card>
				<CardHeader>
					<CardTitle>Details</CardTitle>
				</CardHeader>
				<CardContent className="space-y-4">
					{submission.problemTitle && (
						<div>
							<p className="text-sm font-medium text-muted-foreground mb-1">
								Problem
							</p>
							<p>{submission.problemTitle}</p>
						</div>
					)}
					{submission.categories.length > 0 && (
						<div>
							<p className="text-sm font-medium text-muted-foreground mb-1">
								Categories
							</p>
							<div className="flex flex-wrap gap-2">
								{submission.categories.map((cat) => (
									<Badge key={cat!._id} variant="secondary">
										{cat!.name}
									</Badge>
								))}
							</div>
						</div>
					)}
				</CardContent>
			</Card>

			{/* Links */}
			{(submission.githubUrl ||
				submission.liveDemoUrl ||
				submission.videoUrl ||
				submission.deckUrl) && (
				<Card>
					<CardHeader>
						<CardTitle>Links & Media</CardTitle>
					</CardHeader>
					<CardContent className="space-y-2">
						{submission.githubUrl && (
							<LinkRow label="GitHub" url={submission.githubUrl} />
						)}
						{submission.liveDemoUrl && (
							<LinkRow
								label="Live Demo"
								url={submission.liveDemoUrl}
							/>
						)}
						{submission.videoUrl && (
							<LinkRow label="Video" url={submission.videoUrl} />
						)}
						{submission.deckUrl && (
							<LinkRow
								label="Slide Deck"
								url={submission.deckUrl}
							/>
						)}
					</CardContent>
				</Card>
			)}

			{/* Version History */}
			{versionHistory && versionHistory.length > 1 && (
				<Collapsible>
					<Card>
						<CardHeader>
							<CollapsibleTrigger asChild>
								<button
									type="button"
									className="flex w-full items-center justify-between"
								>
									<CardTitle>
										Version History ({versionHistory.length})
									</CardTitle>
									<span className="text-sm text-muted-foreground">
										Toggle
									</span>
								</button>
							</CollapsibleTrigger>
						</CardHeader>
						<CollapsibleContent>
							<CardContent className="space-y-2">
								{versionHistory.map((v) => (
									<div
										key={v._id}
										className="flex items-center justify-between rounded-md border p-3 text-sm"
									>
										<div>
											<span className="font-medium">
												v{v.version}
											</span>
											<span className="text-muted-foreground ml-2">
												{v.title}
											</span>
										</div>
										<div className="flex items-center gap-2">
											<Badge
												variant={
													statusVariant[v.status]
												}
											>
												{v.status}
											</Badge>
											<span className="text-xs text-muted-foreground">
												{new Date(
													v.createdAt,
												).toLocaleDateString()}
											</span>
										</div>
									</div>
								))}
							</CardContent>
						</CollapsibleContent>
					</Card>
				</Collapsible>
			)}
		</div>
	);
}

function LinkRow({ label, url }: { label: string; url: string }) {
	return (
		<div className="flex items-center gap-2">
			<span className="text-sm font-medium w-24">{label}:</span>
			<a
				href={url}
				target="_blank"
				rel="noopener noreferrer"
				className="text-sm text-primary hover:underline flex items-center gap-1 truncate"
			>
				{url}
				<ExternalLink className="h-3 w-3 shrink-0" />
			</a>
		</div>
	);
}
