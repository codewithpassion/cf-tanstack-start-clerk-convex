import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery } from "convex/react";
import { ConvexError } from "convex/values";
import { Plus, X } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { z } from "zod";
import { api } from "../../../../../../convex/_generated/api";
import type { Id } from "../../../../../../convex/_generated/dataModel";
import { useOrg } from "@/contexts/org-context";
import { EntryRow } from "@/components/entry-row";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
	Empty,
	EmptyDescription,
	EmptyHeader,
	EmptyTitle,
} from "@/components/ui/empty";
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
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";

const filtersSchema = z.object({
	source: z.string().optional(),
	used: z.enum(["any", "used", "unused"]).optional().default("unused"),
	archived: z.enum(["hide", "only", "all"]).optional().default("hide"),
	from: z.string().optional(),
	to: z.string().optional(),
});

type Filters = z.infer<typeof filtersSchema>;

export const Route = createFileRoute("/_authed/org/$slug/inbox/")({
	validateSearch: filtersSchema,
	component: InboxPage,
});

function errorMessage(err: unknown, fallback: string): string {
	if (err instanceof ConvexError) {
		return typeof err.data === "string" ? err.data : fallback;
	}
	if (err instanceof Error) return err.message;
	return fallback;
}

function dateInputToMs(s: string | undefined): number | undefined {
	if (!s) return undefined;
	const t = Date.parse(s);
	return Number.isFinite(t) ? t : undefined;
}

function InboxPage() {
	const org = useOrg();
	const navigate = useNavigate();
	const params = Route.useSearch();

	const sources = useQuery(api.sources.list, { orgId: org.orgId });

	const queryArgs = useMemo(() => {
		const args: {
			orgId: Id<"organizations">;
			sourceId?: Id<"sources">;
			used?: boolean;
			archived?: boolean;
			dateFrom?: number;
			dateTo?: number;
			limit: number;
		} = { orgId: org.orgId, limit: 50 };
		if (params.source) args.sourceId = params.source as Id<"sources">;
		if (params.used === "used") args.used = true;
		else if (params.used === "unused") args.used = false;
		if (params.archived === "hide") args.archived = false;
		else if (params.archived === "only") args.archived = true;
		const from = dateInputToMs(params.from);
		const to = dateInputToMs(params.to);
		if (from !== undefined) args.dateFrom = from;
		if (to !== undefined) args.dateTo = to + 24 * 60 * 60 * 1000 - 1;
		return args;
	}, [
		org.orgId,
		params.source,
		params.used,
		params.archived,
		params.from,
		params.to,
	]);

	const data = useQuery(api.entries.list, queryArgs);
	const markUsed = useMutation(api.entries.markUsed);
	const setArchived = useMutation(api.entries.setArchived);

	const [selected, setSelected] = useState<Set<string>>(new Set());
	const [rowError, setRowError] = useState<string | null>(null);

	const update = useCallback(
		(next: Partial<Filters>) => {
			navigate({
				to: "/org/$slug/inbox",
				params: { slug: org.slug },
				search: { ...params, ...next },
				replace: true,
			});
		},
		[navigate, org.slug, params],
	);

	const clearFilters = () => {
		navigate({
			to: "/org/$slug/inbox",
			params: { slug: org.slug },
			search: {},
			replace: true,
		});
	};

	const onToggleUsed = async (entryId: Id<"entries">, used: boolean) => {
		setRowError(null);
		try {
			await markUsed({ orgId: org.orgId, entryId, used });
		} catch (err) {
			setRowError(errorMessage(err, "Failed to update entry"));
		}
	};

	const onToggleArchived = async (
		entryId: Id<"entries">,
		archived: boolean,
	) => {
		setRowError(null);
		try {
			await setArchived({ orgId: org.orgId, entryId, archived });
		} catch (err) {
			setRowError(errorMessage(err, "Failed to update entry"));
		}
	};

	const onSelectChange = (id: string, next: boolean) => {
		setSelected((prev) => {
			const s = new Set(prev);
			if (next) s.add(id);
			else s.delete(id);
			return s;
		});
	};

	const entries = data?.entries ?? [];
	const filtersActive =
		!!params.source ||
		params.used !== "unused" ||
		params.archived !== "hide" ||
		!!params.from ||
		!!params.to;

	return (
		<div className="space-y-4">
			<div className="flex items-end justify-between gap-4 flex-wrap">
				<div>
					<h1 className="text-3xl font-bold">Inbox</h1>
					<p className="text-muted-foreground mt-1">
						Latest entries from your sources, deduplicated by canonical URL.
					</p>
				</div>
				<div className="flex items-center gap-2">
					<TooltipProvider>
						<Tooltip>
							<TooltipTrigger asChild>
								<span>
									<Button variant="outline" disabled>
										Draft newsletter
										{selected.size > 0 && ` (${selected.size})`}
									</Button>
								</span>
							</TooltipTrigger>
							<TooltipContent>Coming in Phase 3</TooltipContent>
						</Tooltip>
					</TooltipProvider>
					<Button asChild>
						<Link to="/org/$slug/inbox/add-url" params={{ slug: org.slug }}>
							<Plus className="size-4" />
							Add URL
						</Link>
					</Button>
				</div>
			</div>

			<Card>
				<CardContent className="p-4">
					<div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
						<div className="space-y-1.5">
							<Label htmlFor="f-source">Source</Label>
							<Select
								value={params.source ?? "__all"}
								onValueChange={(v) =>
									update({ source: v === "__all" ? undefined : v })
								}
							>
								<SelectTrigger id="f-source">
									<SelectValue placeholder="Any source" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="__all">Any source</SelectItem>
									{sources?.map((s) => (
										<SelectItem key={s._id} value={s._id}>
											{s.name}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						<div className="space-y-1.5">
							<Label htmlFor="f-used">Used</Label>
							<Select
								value={params.used ?? "unused"}
								onValueChange={(v) =>
									update({ used: v as Filters["used"] })
								}
							>
								<SelectTrigger id="f-used">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="unused">Unused only</SelectItem>
									<SelectItem value="used">Used only</SelectItem>
									<SelectItem value="any">Any</SelectItem>
								</SelectContent>
							</Select>
						</div>
						<div className="space-y-1.5">
							<Label htmlFor="f-archived">Archived</Label>
							<Select
								value={params.archived ?? "hide"}
								onValueChange={(v) =>
									update({ archived: v as Filters["archived"] })
								}
							>
								<SelectTrigger id="f-archived">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="hide">Hide archived</SelectItem>
									<SelectItem value="only">Only archived</SelectItem>
									<SelectItem value="all">Show all</SelectItem>
								</SelectContent>
							</Select>
						</div>
						<div className="space-y-1.5">
							<Label htmlFor="f-from">From</Label>
							<Input
								id="f-from"
								type="date"
								value={params.from ?? ""}
								onChange={(e) => update({ from: e.target.value || undefined })}
							/>
						</div>
						<div className="space-y-1.5">
							<Label htmlFor="f-to">To</Label>
							<Input
								id="f-to"
								type="date"
								value={params.to ?? ""}
								onChange={(e) => update({ to: e.target.value || undefined })}
							/>
						</div>
					</div>
					{filtersActive && (
						<div className="mt-3">
							<Button
								variant="ghost"
								size="sm"
								onClick={clearFilters}
								className="text-muted-foreground"
							>
								<X className="size-3" />
								Clear filters
							</Button>
						</div>
					)}
				</CardContent>
			</Card>

			{rowError && (
				<p className="text-sm text-destructive">{rowError}</p>
			)}

			{data === undefined ? (
				<Card>
					<CardContent className="p-6 text-sm text-muted-foreground">
						Loading…
					</CardContent>
				</Card>
			) : entries.length === 0 ? (
				<Empty>
					<EmptyHeader>
						<EmptyTitle>No entries yet</EmptyTitle>
						<EmptyDescription>
							{filtersActive
								? "Try clearing filters."
								: "Add a source or paste a URL to get started."}
						</EmptyDescription>
					</EmptyHeader>
				</Empty>
			) : (
				<Card>
					<CardContent className="p-0">
						<ul>
							{entries.map((e) => (
								<EntryRow
									key={e._id}
									entry={e}
									orgSlug={org.slug}
									selected={selected.has(e._id)}
									onSelectChange={(next) => onSelectChange(e._id, next)}
									onToggleUsed={(next) => onToggleUsed(e._id, next)}
									onToggleArchived={(next) =>
										onToggleArchived(e._id, next)
									}
								/>
							))}
						</ul>
					</CardContent>
				</Card>
			)}
		</div>
	);
}
