import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { api } from "../../../../../../convex/_generated/api";
import type { Id } from "../../../../../../convex/_generated/dataModel";
import { useOrg } from "@/contexts/org-context";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { DraftEditor } from "@/components/draft-editor";

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
					<Link to="/org/$slug/drafts" params={{ slug: org.slug }}>
						Back to drafts
					</Link>
				</Button>
			</div>
		);
	}

	return <DraftEditor draft={draft} />;
}
