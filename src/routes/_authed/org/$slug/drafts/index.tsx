import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery } from "convex/react";
import { ConvexError } from "convex/values";
import { formatDistanceToNow } from "date-fns";
import { FileText, Trash2 } from "lucide-react";
import { useState } from "react";
import { api } from "../../../../../../convex/_generated/api";
import type { Doc, Id } from "../../../../../../convex/_generated/dataModel";
import { useOrg } from "@/contexts/org-context";
import { draftStatusLabel, draftStatusVariant } from "@/lib/draft-status";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
	Empty,
	EmptyDescription,
	EmptyHeader,
	EmptyTitle,
} from "@/components/ui/empty";
import { Spinner } from "@/components/ui/spinner";

export const Route = createFileRoute("/_authed/org/$slug/drafts/")({
	component: DraftsListPage,
});

function DraftsListPage() {
	const org = useOrg();
	const isAdmin = org.role === "admin";
	const drafts = useQuery(api.drafts.listByOrg, { orgId: org.orgId });

	if (drafts === undefined) {
		return (
			<div className="flex items-center justify-center py-12">
				<Spinner />
			</div>
		);
	}

	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-3xl font-bold">Drafts</h1>
				<p className="text-muted-foreground mt-1">
					Newsletter drafts for this organization.
				</p>
			</div>

			{drafts.length === 0 ? (
				<Empty>
					<EmptyHeader>
						<EmptyTitle>No drafts yet</EmptyTitle>
						<EmptyDescription>
							No drafts yet. Generate one from the inbox or wait for the
							auto-draft schedule.
						</EmptyDescription>
					</EmptyHeader>
					<div className="flex gap-2 justify-center">
						<Button asChild variant="outline">
							<Link to="/org/$slug/inbox" params={{ slug: org.slug }}>
								Open inbox
							</Link>
						</Button>
						{isAdmin && (
							<Button asChild variant="outline">
								<Link
									to="/org/$slug/settings/auto-draft"
									params={{ slug: org.slug }}
								>
									Auto-draft settings
								</Link>
							</Button>
						)}
					</div>
				</Empty>
			) : (
				<ul className="space-y-2">
					{drafts.map((d) => (
						<DraftListItem
							key={d._id}
							draft={d}
							slug={org.slug}
							orgId={org.orgId}
							canDelete={isAdmin}
						/>
					))}
				</ul>
			)}
		</div>
	);
}

function DraftListItem({
	draft,
	slug,
	orgId,
	canDelete,
}: {
	draft: Doc<"drafts"> & { entryCount: number };
	slug: string;
	orgId: Id<"organizations">;
	canDelete: boolean;
}) {
	const remove = useMutation(api.drafts.remove);
	const [deleting, setDeleting] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const onDelete = async () => {
		setDeleting(true);
		try {
			await remove({ orgId, draftId: draft._id });
		} catch (err) {
			setError(
				err instanceof ConvexError
					? typeof err.data === "string"
						? err.data
						: "Failed to delete"
					: err instanceof Error
						? err.message
						: "Failed to delete",
			);
		} finally {
			setDeleting(false);
		}
	};

	return (
		<li>
			<Card className="group hover:bg-accent/50 transition-colors">
				<CardContent className="p-4 flex items-start gap-3">
					<FileText className="size-5 text-muted-foreground mt-0.5 shrink-0" />
					<div className="min-w-0 flex-1">
						<div className="flex items-center gap-2 flex-wrap">
							<Link
								to="/org/$slug/drafts/$draftId"
								params={{ slug, draftId: draft._id }}
								className="font-medium hover:underline truncate"
							>
								{draft.title}
							</Link>
							<Badge
								variant={draftStatusVariant(draft.status)}
								className="gap-1 text-xs"
							>
								{draft.status === "generating" && (
									<Spinner className="size-3" />
								)}
								{draftStatusLabel(draft.status)}
							</Badge>
						</div>
						<p className="text-xs text-muted-foreground mt-1">
							Created{" "}
							{formatDistanceToNow(new Date(draft.createdAt), {
								addSuffix: true,
							})}
							{" · "}
							{draft.entryCount} stor
							{draft.entryCount === 1 ? "y" : "ies"}
						</p>
						{error && (
							<p className="text-xs text-destructive mt-1">{error}</p>
						)}
					</div>
					{canDelete && (
						<AlertDialog>
							<AlertDialogTrigger asChild>
								<Button
									variant="ghost"
									size="icon"
									className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
									aria-label="Delete draft"
									disabled={deleting}
								>
									<Trash2 className="size-4" />
								</Button>
							</AlertDialogTrigger>
							<AlertDialogContent>
								<AlertDialogHeader>
									<AlertDialogTitle>Delete this draft?</AlertDialogTitle>
									<AlertDialogDescription>
										This action cannot be undone. The draft and its links to
										source stories will be permanently removed.
									</AlertDialogDescription>
								</AlertDialogHeader>
								<AlertDialogFooter>
									<AlertDialogCancel>Cancel</AlertDialogCancel>
									<AlertDialogAction onClick={onDelete}>
										Delete
									</AlertDialogAction>
								</AlertDialogFooter>
							</AlertDialogContent>
						</AlertDialog>
					)}
				</CardContent>
			</Card>
		</li>
	);
}
