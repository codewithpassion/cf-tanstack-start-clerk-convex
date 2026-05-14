import { Link } from "@tanstack/react-router";
import { formatDistanceToNow } from "date-fns";
import { Archive, ArchiveRestore, Check, CheckCircle2 } from "lucide-react";
import type { Id } from "../../convex/_generated/dataModel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";

export interface EntryRowSource {
	_id: Id<"sources">;
	name: string;
	type: "rss" | "website" | "web_search" | "manual";
	status: "active" | "paused" | "deleted";
}

export interface EntryRowData {
	_id: Id<"entries">;
	title: string;
	snippet?: string;
	fetchedAt: number;
	used: boolean;
	archived: boolean;
	sources: EntryRowSource[];
}

export function EntryRow({
	entry,
	orgSlug,
	selected,
	onSelectChange,
	onToggleUsed,
	onToggleArchived,
}: {
	entry: EntryRowData;
	orgSlug: string;
	selected: boolean;
	onSelectChange: (next: boolean) => void;
	onToggleUsed: (next: boolean) => void;
	onToggleArchived: (next: boolean) => void;
}) {
	const primary = entry.sources[0];
	const more = entry.sources.length - 1;

	return (
		<li className="group flex items-start gap-3 border-b last:border-b-0 px-4 py-3 hover:bg-accent/40 transition-colors">
			<Checkbox
				checked={selected}
				onCheckedChange={(c) => onSelectChange(c === true)}
				aria-label="Select entry"
				className="mt-1"
			/>
			<div className="flex-1 min-w-0">
				<div className="flex items-center gap-2 flex-wrap">
					<Link
						to="/org/$slug/inbox/$entryId"
						params={{ slug: orgSlug, entryId: entry._id }}
						className="font-medium hover:underline truncate"
					>
						{entry.title}
					</Link>
					{entry.used && (
						<Badge variant="secondary" className="gap-1">
							<CheckCircle2 className="size-3" />
							Used
						</Badge>
					)}
					{entry.archived && (
						<Badge variant="outline" className="gap-1">
							<Archive className="size-3" />
							Archived
						</Badge>
					)}
				</div>
				{entry.snippet && (
					<p className="text-sm text-muted-foreground line-clamp-2 mt-1">
						{entry.snippet}
					</p>
				)}
				<div className="flex items-center gap-2 mt-1.5 text-xs text-muted-foreground flex-wrap">
					{primary && (
						<span className="truncate max-w-[200px]">{primary.name}</span>
					)}
					{more > 0 && (
						<Badge variant="outline" className="text-[10px] py-0">
							+{more} more
						</Badge>
					)}
					<span>·</span>
					<span>
						{formatDistanceToNow(new Date(entry.fetchedAt), {
							addSuffix: true,
						})}
					</span>
				</div>
			</div>
			<div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
				<Button
					variant="ghost"
					size="sm"
					onClick={() => onToggleUsed(!entry.used)}
					title={entry.used ? "Mark unused" : "Mark used"}
				>
					<Check className="size-4" />
				</Button>
				<Button
					variant="ghost"
					size="sm"
					onClick={() => onToggleArchived(!entry.archived)}
					title={entry.archived ? "Unarchive" : "Archive"}
				>
					{entry.archived ? (
						<ArchiveRestore className="size-4" />
					) : (
						<Archive className="size-4" />
					)}
				</Button>
			</div>
		</li>
	);
}
