import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery } from "convex/react";
import { ConvexError } from "convex/values";
import { formatDistanceToNow } from "date-fns";
import { ArrowLeft } from "lucide-react";
import { useEffect, useState } from "react";
import { api } from "../../../../../../convex/_generated/api";
import type { Id } from "../../../../../../convex/_generated/dataModel";
import { useOrg } from "@/contexts/org-context";
import { SourceHealthBadge } from "@/components/source-health-badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/_authed/org/$slug/sources/$sourceId")({
	component: SourceDetailPage,
});

type Schedule = "15m" | "1h" | "6h" | "daily" | "weekly";

function errorMessage(err: unknown, fallback: string): string {
	if (err instanceof ConvexError) {
		return typeof err.data === "string" ? err.data : fallback;
	}
	if (err instanceof Error) return err.message;
	return fallback;
}

function SourceDetailPage() {
	const { sourceId, slug } = Route.useParams();
	const navigate = useNavigate();
	const org = useOrg();
	const isAdmin = org.role === "admin";
	const source = useQuery(api.sources.get, {
		orgId: org.orgId,
		sourceId: sourceId as Id<"sources">,
	});
	const runs = useQuery(api.sourceRuns.listForSource, {
		orgId: org.orgId,
		sourceId: sourceId as Id<"sources">,
		limit: 20,
	});
	const update = useMutation(api.sources.update);

	const [name, setName] = useState("");
	const [schedule, setSchedule] = useState<Schedule>("1h");
	const [url, setUrl] = useState("");
	const [query, setQuery] = useState("");
	const [saveBusy, setSaveBusy] = useState(false);
	const [saveError, setSaveError] = useState<string | null>(null);
	const [savedAt, setSavedAt] = useState<number | null>(null);

	useEffect(() => {
		if (!source) return;
		setName(source.name);
		if (source.schedule) setSchedule(source.schedule as Schedule);
		const cfg = source.config as { url?: string; query?: string } | undefined;
		setUrl(cfg?.url ?? "");
		setQuery(cfg?.query ?? "");
	}, [source]);

	if (source === undefined) {
		return <p className="text-muted-foreground">Loading…</p>;
	}
	if (source === null) {
		return (
			<div className="space-y-4">
				<p>Source not found.</p>
				<Button variant="outline" asChild>
					<Link to="/org/$slug/sources" params={{ slug }}>
						<ArrowLeft className="size-4" />
						Back to sources
					</Link>
				</Button>
			</div>
		);
	}

	const onSave = async (e: React.FormEvent) => {
		e.preventDefault();
		setSaveBusy(true);
		setSaveError(null);
		try {
			const config: Record<string, unknown> | undefined =
				source.type === "web_search"
					? { query }
					: source.type === "manual"
						? undefined
						: { url };
			await update({
				orgId: org.orgId,
				sourceId: source._id,
				name,
				schedule:
					source.type === "manual" ? undefined : (schedule as Schedule),
				config,
			});
			setSavedAt(Date.now());
		} catch (err) {
			setSaveError(errorMessage(err, "Failed to update source"));
		} finally {
			setSaveBusy(false);
		}
	};

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<div>
					<Button
						variant="ghost"
						size="sm"
						onClick={() => navigate({ to: "/org/$slug/sources", params: { slug } })}
					>
						<ArrowLeft className="size-4" />
						Back
					</Button>
					<h1 className="text-3xl font-bold mt-2">{source.name}</h1>
					<p className="text-muted-foreground capitalize">
						{source.type.replace("_", " ")} source
					</p>
				</div>
				<SourceHealthBadge health={source.health} />
			</div>

			{source.lastError && (
				<Card className="border-destructive/40 bg-destructive/5">
					<CardHeader>
						<CardTitle className="text-base">Most recent error</CardTitle>
					</CardHeader>
					<CardContent>
						<p className="text-sm font-mono whitespace-pre-wrap break-all">
							{source.lastError}
						</p>
					</CardContent>
				</Card>
			)}

			<Card>
				<CardHeader>
					<CardTitle>Configuration</CardTitle>
					{!isAdmin && (
						<CardDescription>
							Only admins can edit source configuration.
						</CardDescription>
					)}
				</CardHeader>
				<CardContent>
					<form className="space-y-4" onSubmit={onSave}>
						<div className="space-y-2">
							<Label htmlFor="src-name">Name</Label>
							<Input
								id="src-name"
								value={name}
								onChange={(e) => setName(e.target.value)}
								disabled={!isAdmin}
							/>
						</div>
						{source.type === "web_search" ? (
							<div className="space-y-2">
								<Label htmlFor="src-query">Search query</Label>
								<Input
									id="src-query"
									value={query}
									onChange={(e) => setQuery(e.target.value)}
									disabled={!isAdmin}
								/>
							</div>
						) : source.type !== "manual" ? (
							<div className="space-y-2">
								<Label htmlFor="src-url">URL</Label>
								<Input
									id="src-url"
									type="url"
									value={url}
									onChange={(e) => setUrl(e.target.value)}
									disabled={!isAdmin}
								/>
							</div>
						) : null}
						{source.type !== "manual" && (
							<div className="space-y-2">
								<Label htmlFor="src-schedule">Schedule</Label>
								<Select
									value={schedule}
									onValueChange={(v) => setSchedule(v as Schedule)}
									disabled={!isAdmin}
								>
									<SelectTrigger id="src-schedule">
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
						)}
						{saveError && <p className="text-sm text-destructive">{saveError}</p>}
						{savedAt && (
							<p className="text-sm text-muted-foreground">
								Saved {formatDistanceToNow(savedAt, { addSuffix: true })}.
							</p>
						)}
						{isAdmin && (
							<Button type="submit" disabled={saveBusy}>
								{saveBusy ? "Saving…" : "Save changes"}
							</Button>
						)}
					</form>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>Recent runs</CardTitle>
				</CardHeader>
				<CardContent>
					{runs === undefined ? (
						<p className="text-sm text-muted-foreground">Loading…</p>
					) : runs.length === 0 ? (
						<p className="text-sm text-muted-foreground">No runs yet.</p>
					) : (
						<ul className="divide-y">
							{runs.map((r) => (
								<li key={r._id} className="py-2 text-sm flex items-center gap-3">
									<span
										className={
											r.status === "error"
												? "text-destructive font-medium"
												: r.status === "success"
													? "text-green-700 dark:text-green-400 font-medium"
													: "text-muted-foreground"
										}
									>
										{r.status}
									</span>
									<span className="text-muted-foreground">
										{formatDistanceToNow(new Date(r.startedAt), {
											addSuffix: true,
										})}
									</span>
									{r.itemsAdded !== undefined && r.status === "success" && (
										<span className="text-muted-foreground">
											+{r.itemsAdded} new
										</span>
									)}
									{r.error && (
										<span className="text-destructive truncate max-w-md">
											{r.error}
										</span>
									)}
								</li>
							))}
						</ul>
					)}
				</CardContent>
			</Card>
		</div>
	);
}
