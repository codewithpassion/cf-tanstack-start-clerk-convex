import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { formatDistanceToNow } from "date-fns";
import { ExternalLink } from "lucide-react";
import { api } from "../../../../../../convex/_generated/api";
import type { Id } from "../../../../../../convex/_generated/dataModel";
import { useOrg } from "@/contexts/org-context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";

export const Route = createFileRoute("/_authed/org/$slug/drafts/$draftId")({
	component: DraftPage,
});

function DraftPage() {
	const org = useOrg();
	const { draftId } = Route.useParams();
	const draft = useQuery(api.drafts.get, {
		orgId: org.orgId,
		draftId: draftId as Id<"drafts">,
	});

	if (draft === undefined) {
		return (
			<div className="flex items-center justify-center py-12">
				<Spinner />
			</div>
		);
	}
	if (draft === null) {
		return (
			<div className="space-y-4">
				<h1 className="text-3xl font-bold">Draft not found</h1>
				<p className="text-muted-foreground">
					This draft doesn't exist or you don't have access to it.
				</p>
				<Button asChild variant="outline">
					<Link to="/org/$slug/inbox" params={{ slug: org.slug }}>
						Back to inbox
					</Link>
				</Button>
			</div>
		);
	}

	const isGenerating = draft.status === "generating";

	return (
		<div className="space-y-6">
			<div>
				<div className="flex items-center gap-3 flex-wrap">
					<h1 className="text-3xl font-bold">{draft.title}</h1>
					<Badge
						variant={isGenerating ? "outline" : "secondary"}
						className="gap-1"
					>
						{isGenerating && <Spinner className="size-3" />}
						{draft.status}
					</Badge>
				</div>
				<p className="text-muted-foreground mt-1 text-sm">
					Created{" "}
					{formatDistanceToNow(new Date(draft.createdAt), { addSuffix: true })}
					{" · "}
					{draft.entries.length} stor{draft.entries.length === 1 ? "y" : "ies"}
				</p>
			</div>

			<Card>
				<CardHeader>
					<CardTitle>Draft body</CardTitle>
					<CardDescription>
						The full markdown editor lands in Phase 4. For now, here's the raw
						output.
					</CardDescription>
				</CardHeader>
				<CardContent>
					{isGenerating ? (
						<div className="flex items-center gap-2 text-sm text-muted-foreground">
							<Spinner className="size-4" />
							Generating draft...
						</div>
					) : (
						<pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">
							{draft.body}
						</pre>
					)}
				</CardContent>
			</Card>

			{draft.entries.length > 0 && (
				<Card>
					<CardHeader>
						<CardTitle>Source stories</CardTitle>
						<CardDescription>
							The stories selected when this draft was generated.
						</CardDescription>
					</CardHeader>
					<CardContent>
						<ul className="divide-y">
							{draft.entries.map((e) => (
								<li key={e._id} className="py-3">
									<div className="flex items-start justify-between gap-2">
										<div className="min-w-0">
											<Link
												to="/org/$slug/inbox/$entryId"
												params={{ slug: org.slug, entryId: e._id }}
												className="font-medium hover:underline truncate"
											>
												{e.title}
											</Link>
											{e.snippet && (
												<p className="text-sm text-muted-foreground line-clamp-2 mt-1">
													{e.snippet}
												</p>
											)}
										</div>
										<a
											href={e.canonicalUrl}
											target="_blank"
											rel="noreferrer"
											className="text-muted-foreground hover:text-foreground"
											title="Open original"
										>
											<ExternalLink className="size-4" />
										</a>
									</div>
								</li>
							))}
						</ul>
					</CardContent>
				</Card>
			)}
		</div>
	);
}
