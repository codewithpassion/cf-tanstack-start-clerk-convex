import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { cn } from "@/lib/utils";

export function SourceHealthSparkline({
	orgId,
	sourceId,
}: {
	orgId: Id<"organizations">;
	sourceId: Id<"sources">;
}) {
	const runs = useQuery(api.sourceRuns.listForSource, {
		orgId,
		sourceId,
		limit: 14,
	});

	if (runs === undefined) {
		return <div className="h-3 w-20 bg-muted rounded animate-pulse" />;
	}
	if (runs.length === 0) {
		return (
			<span className="text-xs text-muted-foreground">No runs yet</span>
		);
	}

	const reversed = [...runs].reverse();

	return (
		<div className="flex items-center gap-0.5" aria-label="Recent runs">
			{reversed.map((run) => {
				const color =
					run.status === "success"
						? "bg-green-500"
						: run.status === "error"
							? "bg-red-500"
							: "bg-yellow-500";
				const date = new Date(run.startedAt).toLocaleString();
				return (
					<span
						key={run._id}
						className={cn("h-3 w-1.5 rounded-sm", color)}
						title={`${run.status} — ${date}${run.error ? ` — ${run.error}` : ""}`}
					/>
				);
			})}
		</div>
	);
}
