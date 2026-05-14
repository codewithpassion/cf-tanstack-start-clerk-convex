import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery } from "convex/react";
import { ConvexError } from "convex/values";
import { formatDistanceToNow } from "date-fns";
import { Archive, ArchiveRestore, ArrowLeft, Check, ExternalLink } from "lucide-react";
import { useState } from "react";
import { api } from "../../../../../../convex/_generated/api";
import type { Id } from "../../../../../../convex/_generated/dataModel";
import { useOrg } from "@/contexts/org-context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";

export const Route = createFileRoute("/_authed/org/$slug/inbox/$entryId")({
	component: EntryDetailPage,
});

function errorMessage(err: unknown, fallback: string): string {
	if (err instanceof ConvexError) {
		return typeof err.data === "string" ? err.data : fallback;
	}
	if (err instanceof Error) return err.message;
	return fallback;
}

function EntryDetailPage() {
	const { entryId, slug } = Route.useParams();
	const navigate = useNavigate();
	const org = useOrg();
	const entry = useQuery(api.entries.get, {
		orgId: org.orgId,
		entryId: entryId as Id<"entries">,
	});
	const markUsed = useMutation(api.entries.markUsed);
	const setArchived = useMutation(api.entries.setArchived);
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState<string | null>(null);

	if (entry === undefined) {
		return <p className="text-muted-foreground">Loading…</p>;
	}
	if (entry === null) {
		return (
			<div className="space-y-4">
				<p>Entry not found.</p>
				<Button variant="outline" asChild>
					<Link to="/org/$slug/inbox" params={{ slug }}>
						<ArrowLeft className="size-4" />
						Back to inbox
					</Link>
				</Button>
			</div>
		);
	}

	const onToggleUsed = async () => {
		setBusy(true);
		setError(null);
		try {
			await markUsed({
				orgId: org.orgId,
				entryId: entry._id,
				used: !entry.used,
			});
		} catch (err) {
			setError(errorMessage(err, "Failed to update entry"));
		} finally {
			setBusy(false);
		}
	};

	const onToggleArchived = async () => {
		setBusy(true);
		setError(null);
		try {
			await setArchived({
				orgId: org.orgId,
				entryId: entry._id,
				archived: !entry.archived,
			});
		} catch (err) {
			setError(errorMessage(err, "Failed to update entry"));
		} finally {
			setBusy(false);
		}
	};

	return (
		<div className="space-y-6">
			<div>
				<Button
					variant="ghost"
					size="sm"
					onClick={() => navigate({ to: "/org/$slug/inbox", params: { slug } })}
				>
					<ArrowLeft className="size-4" />
					Back to inbox
				</Button>
			</div>

			<div className="space-y-2">
				<div className="flex items-start justify-between gap-3 flex-wrap">
					<h1 className="text-3xl font-bold flex-1 min-w-0">{entry.title}</h1>
					<div className="flex gap-2">
						{entry.used && (
							<Badge variant="secondary">Used</Badge>
						)}
						{entry.archived && (
							<Badge variant="outline">Archived</Badge>
						)}
					</div>
				</div>
				<div className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
					<span>
						Fetched{" "}
						{formatDistanceToNow(new Date(entry.fetchedAt), {
							addSuffix: true,
						})}
					</span>
					{entry.publishedAt && (
						<>
							<span>·</span>
							<span>
								Published{" "}
								{formatDistanceToNow(new Date(entry.publishedAt), {
									addSuffix: true,
								})}
							</span>
						</>
					)}
				</div>
			</div>

			<div className="flex flex-wrap gap-2">
				<Button onClick={onToggleUsed} disabled={busy} variant="outline">
					<Check className="size-4" />
					{entry.used ? "Mark unused" : "Mark used"}
				</Button>
				<Button onClick={onToggleArchived} disabled={busy} variant="outline">
					{entry.archived ? (
						<>
							<ArchiveRestore className="size-4" />
							Unarchive
						</>
					) : (
						<>
							<Archive className="size-4" />
							Archive
						</>
					)}
				</Button>
				<Button variant="outline" asChild>
					<a href={entry.canonicalUrl} target="_blank" rel="noreferrer">
						<ExternalLink className="size-4" />
						Open original
					</a>
				</Button>
			</div>

			{error && <p className="text-sm text-destructive">{error}</p>}

			<Card>
				<CardHeader>
					<CardTitle>Sources</CardTitle>
				</CardHeader>
				<CardContent>
					<ul className="space-y-2">
						{entry.sources.map((s) => (
							<li key={s.linkId} className="flex items-start gap-3 text-sm">
								<span className="font-medium">
									{s.source?.name ?? "Unknown source"}
								</span>
								<span className="text-muted-foreground capitalize">
									{(s.source?.type ?? "").replace("_", " ")}
								</span>
								<a
									href={s.originalUrl}
									target="_blank"
									rel="noreferrer"
									className="text-muted-foreground hover:underline truncate flex-1"
								>
									{s.originalUrl}
								</a>
								<span className="text-muted-foreground text-xs">
									{formatDistanceToNow(new Date(s.foundAt), {
										addSuffix: true,
									})}
								</span>
							</li>
						))}
					</ul>
				</CardContent>
			</Card>

			{entry.content && (
				<Card>
					<CardHeader>
						<CardTitle>Content</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap">
							{entry.content}
						</div>
					</CardContent>
				</Card>
			)}
		</div>
	);
}
