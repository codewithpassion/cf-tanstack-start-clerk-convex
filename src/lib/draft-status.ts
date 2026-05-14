import type { Doc } from "../../convex/_generated/dataModel";

export type DraftStatus = Doc<"drafts">["status"];

export function draftStatusVariant(
	status: DraftStatus,
): "outline" | "secondary" | "default" {
	switch (status) {
		case "generating":
			return "outline";
		case "finalized":
			return "default";
		default:
			return "secondary";
	}
}

export function draftStatusLabel(status: DraftStatus): string {
	switch (status) {
		case "generating":
			return "Generating";
		case "ready":
			return "Ready";
		case "finalized":
			return "Finalized";
		case "reopened":
			return "Reopened";
	}
}
