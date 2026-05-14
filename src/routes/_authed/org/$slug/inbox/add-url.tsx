import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useAction } from "convex/react";
import { ConvexError } from "convex/values";
import { ArrowLeft } from "lucide-react";
import { useState } from "react";
import { api } from "../../../../../../convex/_generated/api";
import { useOrg } from "@/contexts/org-context";
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

export const Route = createFileRoute("/_authed/org/$slug/inbox/add-url")({
	component: AddUrlPage,
});

function errorMessage(err: unknown, fallback: string): string {
	if (err instanceof ConvexError) {
		return typeof err.data === "string" ? err.data : fallback;
	}
	if (err instanceof Error) return err.message;
	return fallback;
}

function AddUrlPage() {
	const { slug } = Route.useParams();
	const org = useOrg();
	const navigate = useNavigate();
	const manualPaste = useAction(api.entries.manualPaste);

	const [url, setUrl] = useState("");
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const onSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setBusy(true);
		setError(null);
		try {
			const result = await manualPaste({ orgId: org.orgId, url });
			navigate({
				to: "/org/$slug/inbox/$entryId",
				params: { slug, entryId: result.entryId },
			});
		} catch (err) {
			setError(errorMessage(err, "Failed to fetch URL"));
			setBusy(false);
		}
	};

	return (
		<div className="space-y-6 max-w-2xl">
			<div>
				<Button variant="ghost" size="sm" asChild>
					<Link to="/org/$slug/inbox" params={{ slug }}>
						<ArrowLeft className="size-4" />
						Back to inbox
					</Link>
				</Button>
				<h1 className="text-3xl font-bold mt-2">Add URL</h1>
				<p className="text-muted-foreground mt-1">
					Paste a link to ingest a one-off story.
				</p>
			</div>

			<Card>
				<CardHeader>
					<CardTitle>Paste a URL</CardTitle>
					<CardDescription>
						We'll fetch the page, extract the main content, and add it to
						your inbox.
					</CardDescription>
				</CardHeader>
				<CardContent>
					<form className="space-y-4" onSubmit={onSubmit}>
						<div className="space-y-2">
							<Label htmlFor="url">URL</Label>
							<Input
								id="url"
								type="url"
								value={url}
								onChange={(e) => setUrl(e.target.value)}
								placeholder="https://example.com/article"
								required
								autoFocus
							/>
						</div>
						{error && <p className="text-sm text-destructive">{error}</p>}
						<Button type="submit" disabled={busy || !url}>
							{busy ? "Fetching…" : "Add to inbox"}
						</Button>
					</form>
				</CardContent>
			</Card>
		</div>
	);
}
