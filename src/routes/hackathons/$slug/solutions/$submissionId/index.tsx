import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { api } from "../../../../../../convex/_generated/api";
import type { Id } from "../../../../../../convex/_generated/dataModel";
import { ArrowLeft, ExternalLink } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute(
	"/hackathons/$slug/solutions/$submissionId/",
)({
	component: PublicSubmissionDetailPage,
});

function PublicSubmissionDetailPage() {
	const { slug, submissionId } = Route.useParams();

	const hackathon = useQuery(api.hackathons.getBySlug, { slug });
	const submission = useQuery(api.submissions.getById, {
		id: submissionId as Id<"submissions">,
	});

	if (hackathon === undefined || submission === undefined) {
		return (
			<div className="container mx-auto p-6 max-w-3xl space-y-4">
				<Skeleton className="h-10 w-64" />
				<Skeleton className="h-64" />
			</div>
		);
	}

	if (hackathon === null || !hackathon.galleryPublic) {
		return (
			<div className="container mx-auto p-6 max-w-3xl">
				<h1 className="text-2xl font-bold mb-4">Not Available</h1>
				<p className="text-muted-foreground">
					This gallery is not publicly available.
				</p>
			</div>
		);
	}

	if (submission === null || submission.status !== "approved") {
		return (
			<div className="container mx-auto p-6 max-w-3xl">
				<h1 className="text-2xl font-bold mb-4">
					Submission Not Found
				</h1>
				<p className="text-muted-foreground">
					This submission does not exist or is not publicly available.
				</p>
			</div>
		);
	}

	return (
		<div className="container mx-auto p-6 max-w-3xl space-y-6">
			<Link to="/hackathons/$slug/solutions" params={{ slug }}>
				<Button variant="ghost" size="sm">
					<ArrowLeft className="h-4 w-4 mr-1" />
					Back to Gallery
				</Button>
			</Link>

			<div>
				<h1 className="text-3xl font-bold mb-2">
					{submission.title}
				</h1>
				<p className="text-muted-foreground">
					by {submission.teamName}
				</p>
			</div>

			{/* Categories */}
			{submission.categories.length > 0 && (
				<div className="flex flex-wrap gap-2">
					{submission.categories.map(
						(cat) =>
							cat && (
								<Badge key={cat._id} variant="secondary">
									{cat.name}
								</Badge>
							),
					)}
				</div>
			)}

			{submission.problemTitle && (
				<div>
					<p className="text-sm font-medium text-muted-foreground">
						Problem
					</p>
					<p>{submission.problemTitle}</p>
				</div>
			)}

			<Separator />

			{/* Description */}
			<Card>
				<CardHeader>
					<CardTitle>About this project</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="prose dark:prose-invert max-w-none whitespace-pre-wrap">
						{submission.description}
					</div>
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
					<CardContent className="space-y-3">
						{submission.githubUrl && (
							<LinkRow
								label="GitHub"
								url={submission.githubUrl}
							/>
						)}
						{submission.liveDemoUrl && (
							<LinkRow
								label="Live Demo"
								url={submission.liveDemoUrl}
							/>
						)}
						{submission.videoUrl && (
							<LinkRow
								label="Video"
								url={submission.videoUrl}
							/>
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
