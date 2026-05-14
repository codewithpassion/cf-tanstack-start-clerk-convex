import { Link } from "@tanstack/react-router";
import { ExternalLink } from "lucide-react";
import type { Doc } from "../../convex/_generated/dataModel";
import { Badge } from "@/components/ui/badge";
import {
	Empty,
	EmptyDescription,
	EmptyHeader,
	EmptyTitle,
} from "@/components/ui/empty";

interface SourcePanelProps {
	slug: string;
	entries: Doc<"entries">[];
}

export function SourcePanel({ slug, entries }: SourcePanelProps) {
	if (entries.length === 0) {
		return (
			<Empty>
				<EmptyHeader>
					<EmptyTitle>No source stories</EmptyTitle>
					<EmptyDescription>
						This draft has no linked stories to reference.
					</EmptyDescription>
				</EmptyHeader>
			</Empty>
		);
	}
	return (
		<ul className="space-y-3">
			{entries.map((e) => (
				<li
					key={e._id}
					className="rounded-lg border bg-card p-3 text-sm space-y-1.5"
				>
					<div className="flex items-start justify-between gap-2">
						<Link
							to="/org/$slug/inbox/$entryId"
							params={{ slug, entryId: e._id }}
							className="font-medium hover:underline line-clamp-2"
						>
							{e.title}
						</Link>
						<a
							href={e.canonicalUrl}
							target="_blank"
							rel="noreferrer"
							className="text-muted-foreground hover:text-foreground shrink-0"
							title="Open original"
							aria-label="Open original article"
						>
							<ExternalLink className="size-4" />
						</a>
					</div>
					{e.snippet && (
						<p className="text-xs text-muted-foreground line-clamp-3">
							{e.snippet}
						</p>
					)}
					{e.used && (
						<Badge variant="secondary" className="text-xs">
							Used
						</Badge>
					)}
				</li>
			))}
		</ul>
	);
}
