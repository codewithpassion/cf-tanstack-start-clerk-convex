import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery } from "convex/react";
import { ConvexError } from "convex/values";
import { formatDistanceToNow } from "date-fns";
import { Pause, Play, Plus, Settings2, Trash2 } from "lucide-react";
import { useState } from "react";
import { api } from "../../../../../convex/_generated/api";
import type { Doc } from "../../../../../convex/_generated/dataModel";
import { useOrg } from "@/contexts/org-context";
import { SourceHealthBadge } from "@/components/source-health-badge";
import { SourceHealthSparkline } from "@/components/source-health-sparkline";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

export const Route = createFileRoute("/_authed/org/$slug/sources")({
	component: SourcesPage,
});

type SourceType = "rss" | "website" | "web_search";
type Schedule = "15m" | "1h" | "6h" | "daily" | "weekly";

function errorMessage(err: unknown, fallback: string): string {
	if (err instanceof ConvexError) {
		return typeof err.data === "string" ? err.data : fallback;
	}
	if (err instanceof Error) return err.message;
	return fallback;
}

function scheduleLabel(s: string | undefined): string {
	switch (s) {
		case "15m":
			return "Every 15 min";
		case "1h":
			return "Hourly";
		case "6h":
			return "Every 6 hours";
		case "daily":
			return "Daily";
		case "weekly":
			return "Weekly";
		default:
			return s ?? "—";
	}
}

function relativeTime(ts: number | undefined): string {
	if (!ts) return "—";
	return formatDistanceToNow(new Date(ts), { addSuffix: true });
}

function SourcesPage() {
	const org = useOrg();
	const isAdmin = org.role === "admin";
	const sources = useQuery(api.sources.list, { orgId: org.orgId });

	return (
		<div className="space-y-6">
			<div className="flex items-end justify-between gap-4">
				<div>
					<h1 className="text-3xl font-bold">Sources</h1>
					<p className="text-muted-foreground mt-1">
						RSS feeds, scheduled web searches, and specific websites we pull
						into your inbox.
					</p>
				</div>
				{isAdmin && <AddSourceDialog />}
			</div>

			{sources === undefined ? (
				<Card>
					<CardContent className="p-6 text-sm text-muted-foreground">
						Loading…
					</CardContent>
				</Card>
			) : sources.length === 0 ? (
				<Empty>
					<EmptyHeader>
						<EmptyTitle>No sources yet</EmptyTitle>
						<EmptyDescription>
							{isAdmin
								? "Add an RSS feed, scheduled web search, or specific website to start collecting news."
								: "Ask an admin to add a news source."}
						</EmptyDescription>
					</EmptyHeader>
				</Empty>
			) : (
				<Card>
					<CardContent className="p-0">
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Name</TableHead>
									<TableHead>Type</TableHead>
									<TableHead>Schedule</TableHead>
									<TableHead>Last run</TableHead>
									<TableHead>Next run</TableHead>
									<TableHead>Health</TableHead>
									<TableHead className="text-right">Actions</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{sources.map((s) => (
									<SourceRow
										key={s._id}
										source={s}
										orgSlug={org.slug}
										isAdmin={isAdmin}
									/>
								))}
							</TableBody>
						</Table>
					</CardContent>
				</Card>
			)}
		</div>
	);
}

function SourceRow({
	source,
	orgSlug,
	isAdmin,
}: {
	source: Doc<"sources">;
	orgSlug: string;
	isAdmin: boolean;
}) {
	const org = useOrg();
	const setStatus = useMutation(api.sources.setStatus);
	const softDelete = useMutation(api.sources.softDelete);
	const [rowError, setRowError] = useState<string | null>(null);
	const [busy, setBusy] = useState(false);

	const togglePause = async () => {
		setRowError(null);
		setBusy(true);
		try {
			await setStatus({
				orgId: org.orgId,
				sourceId: source._id,
				status: source.status === "paused" ? "active" : "paused",
			});
		} catch (err) {
			setRowError(errorMessage(err, "Failed to update source"));
		} finally {
			setBusy(false);
		}
	};

	const onDelete = async () => {
		if (
			!window.confirm(`Delete "${source.name}"? Existing entries will remain.`)
		) {
			return;
		}
		setRowError(null);
		setBusy(true);
		try {
			await softDelete({ orgId: org.orgId, sourceId: source._id });
		} catch (err) {
			setRowError(errorMessage(err, "Failed to delete source"));
		} finally {
			setBusy(false);
		}
	};

	return (
		<TableRow>
			<TableCell className="font-medium">
				<Link
					to="/org/$slug/sources/$sourceId"
					params={{ slug: orgSlug, sourceId: source._id }}
					className="hover:underline"
				>
					{source.name}
				</Link>
				{rowError && (
					<div className="text-xs text-destructive mt-1">{rowError}</div>
				)}
			</TableCell>
			<TableCell className="text-muted-foreground capitalize">
				{source.type.replace("_", " ")}
			</TableCell>
			<TableCell className="text-muted-foreground">
				{source.type === "manual" ? "—" : scheduleLabel(source.schedule)}
			</TableCell>
			<TableCell className="text-muted-foreground">
				{relativeTime(source.lastRunAt)}
			</TableCell>
			<TableCell className="text-muted-foreground">
				{source.status === "paused"
					? "Paused"
					: source.type === "manual"
						? "—"
						: relativeTime(source.nextRunAt)}
			</TableCell>
			<TableCell>
				<div className="flex flex-col items-start gap-1">
					<SourceHealthBadge health={source.health} />
					{source.type !== "manual" && (
						<SourceHealthSparkline
							orgId={org.orgId}
							sourceId={source._id}
						/>
					)}
				</div>
			</TableCell>
			<TableCell className="text-right space-x-1">
				<Button variant="ghost" size="sm" asChild>
					<Link
						to="/org/$slug/sources/$sourceId"
						params={{ slug: orgSlug, sourceId: source._id }}
					>
						<Settings2 className="size-4" />
					</Link>
				</Button>
				{isAdmin && source.type !== "manual" && (
					<>
						<Button
							variant="ghost"
							size="sm"
							onClick={togglePause}
							disabled={busy}
							title={source.status === "paused" ? "Resume" : "Pause"}
						>
							{source.status === "paused" ? (
								<Play className="size-4" />
							) : (
								<Pause className="size-4" />
							)}
						</Button>
						<Button
							variant="ghost"
							size="sm"
							onClick={onDelete}
							disabled={busy}
							title="Delete"
						>
							<Trash2 className="size-4" />
						</Button>
					</>
				)}
			</TableCell>
		</TableRow>
	);
}

function AddSourceDialog() {
	const org = useOrg();
	const create = useMutation(api.sources.create);
	const [open, setOpen] = useState(false);
	const [type, setType] = useState<SourceType>("rss");
	const [name, setName] = useState("");
	const [url, setUrl] = useState("");
	const [query, setQuery] = useState("");
	const [schedule, setSchedule] = useState<Schedule>("1h");
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const reset = () => {
		setName("");
		setUrl("");
		setQuery("");
		setSchedule("1h");
		setType("rss");
		setError(null);
	};

	const onSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setError(null);
		setBusy(true);
		try {
			const config: Record<string, unknown> =
				type === "web_search" ? { query } : { url };
			await create({
				orgId: org.orgId,
				type,
				name: name || (type === "web_search" ? query : url),
				schedule,
				config,
			});
			setOpen(false);
			reset();
		} catch (err) {
			setError(errorMessage(err, "Failed to create source"));
		} finally {
			setBusy(false);
		}
	};

	return (
		<Dialog
			open={open}
			onOpenChange={(o) => {
				setOpen(o);
				if (!o) reset();
			}}
		>
			<DialogTrigger asChild>
				<Button>
					<Plus className="size-4" />
					Add source
				</Button>
			</DialogTrigger>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Add a news source</DialogTitle>
					<DialogDescription>
						Pull entries automatically from an RSS feed, scheduled web search,
						or a specific website.
					</DialogDescription>
				</DialogHeader>
				<form className="space-y-4" onSubmit={onSubmit}>
					<div className="space-y-2">
						<Label htmlFor="source-type">Source type</Label>
						<Select
							value={type}
							onValueChange={(v) => setType(v as SourceType)}
						>
							<SelectTrigger id="source-type">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="rss">RSS / Atom feed</SelectItem>
								<SelectItem value="website">Website (scrape)</SelectItem>
								<SelectItem value="web_search">Web search query</SelectItem>
							</SelectContent>
						</Select>
					</div>
					<div className="space-y-2">
						<Label htmlFor="source-name">Display name</Label>
						<Input
							id="source-name"
							value={name}
							onChange={(e) => setName(e.target.value)}
							placeholder={
								type === "web_search"
									? "e.g. AI safety regulation"
									: "e.g. NYT Tech"
							}
							required
						/>
					</div>
					{type === "web_search" ? (
						<div className="space-y-2">
							<Label htmlFor="source-query">Search query</Label>
							<Input
								id="source-query"
								value={query}
								onChange={(e) => setQuery(e.target.value)}
								placeholder="latest AI safety policy"
								required
							/>
						</div>
					) : (
						<div className="space-y-2">
							<Label htmlFor="source-url">URL</Label>
							<Input
								id="source-url"
								type="url"
								value={url}
								onChange={(e) => setUrl(e.target.value)}
								placeholder={
									type === "rss"
										? "https://example.com/feed.xml"
										: "https://example.com/blog"
								}
								required
							/>
						</div>
					)}
					<div className="space-y-2">
						<Label htmlFor="source-schedule">Schedule</Label>
						<Select
							value={schedule}
							onValueChange={(v) => setSchedule(v as Schedule)}
						>
							<SelectTrigger id="source-schedule">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="15m">Every 15 minutes</SelectItem>
								<SelectItem value="1h">Hourly</SelectItem>
								<SelectItem value="6h">Every 6 hours</SelectItem>
								<SelectItem value="daily">Daily</SelectItem>
								<SelectItem value="weekly">Weekly</SelectItem>
							</SelectContent>
						</Select>
					</div>
					{error && <p className="text-sm text-destructive">{error}</p>}
					<DialogFooter>
						<Button
							type="button"
							variant="outline"
							onClick={() => setOpen(false)}
						>
							Cancel
						</Button>
						<Button type="submit" disabled={busy}>
							{busy ? "Adding…" : "Add source"}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
