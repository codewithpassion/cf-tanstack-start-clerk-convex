import {
	makeFunctionReference,
	type FunctionReference,
} from "convex/server";
import { useConvex } from "convex/react";
import { ConvexError } from "convex/values";
import { Link } from "@tanstack/react-router";
import { formatDistanceToNow } from "date-fns";
import { Search } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import type { Id } from "../../convex/_generated/dataModel";
import { useMaybeOrg } from "@/contexts/org-context";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Kbd } from "@/components/ui/kbd";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";

interface SearchHit {
	entryId: Id<"entries">;
	score: number;
	title: string;
	snippet?: string;
	primarySourceName: string;
	fetchedAt: number;
}

const searchEntriesRef = makeFunctionReference<"action">(
	"ai/search:searchEntries",
) as unknown as FunctionReference<
	"action",
	"public",
	{
		orgId: Id<"organizations">;
		query: string;
		limit?: number;
		includeUsed?: boolean;
	},
	SearchHit[]
>;

export function AiSearchBar() {
	const org = useMaybeOrg();
	const convex = useConvex();
	const [open, setOpen] = useState(false);
	const [q, setQ] = useState("");
	const [includeUsed, setIncludeUsed] = useState(false);
	const [loading, setLoading] = useState(false);
	const [results, setResults] = useState<SearchHit[] | null>(null);
	const [error, setError] = useState<string | null>(null);

	const hasOrg = org !== null;
	useEffect(() => {
		if (!hasOrg) return;
		function onKey(e: KeyboardEvent) {
			if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
				e.preventDefault();
				setOpen((s) => !s);
			}
		}
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [hasOrg]);

	const onSubmit = useCallback(
		async (e: React.FormEvent) => {
			e.preventDefault();
			if (!org) return;
			const trimmed = q.trim();
			if (!trimmed) return;
			setLoading(true);
			setError(null);
			try {
				const hits = await convex.action(searchEntriesRef, {
					orgId: org.orgId,
					query: trimmed,
					includeUsed,
					limit: 20,
				});
				setResults(hits);
			} catch (err) {
				const message =
					err instanceof ConvexError
						? typeof err.data === "string"
							? err.data
							: "Search failed"
						: err instanceof Error
							? err.message
							: "Search failed";
				setError(message);
				setResults(null);
			} finally {
				setLoading(false);
			}
		},
		[convex, includeUsed, org, q],
	);

	if (!org) return null;

	return (
		<>
			<Button
				variant="outline"
				size="sm"
				className="gap-2 text-muted-foreground"
				onClick={() => setOpen(true)}
			>
				<Search className="size-4" />
				<span className="hidden sm:inline">Search</span>
				<Kbd className="ml-2 hidden sm:inline">⌘K</Kbd>
			</Button>
			<Dialog open={open} onOpenChange={setOpen}>
				<DialogContent className="max-w-2xl">
					<DialogHeader>
						<DialogTitle>Search news</DialogTitle>
					</DialogHeader>
					<form onSubmit={onSubmit} className="space-y-3">
						<Input
							autoFocus
							value={q}
							onChange={(e) => setQ(e.target.value)}
							placeholder="e.g. AI safety regulation this week"
						/>
						<div className="flex items-center justify-between">
							<div className="flex items-center gap-2">
								<Switch
									id="include-used"
									checked={includeUsed}
									onCheckedChange={setIncludeUsed}
								/>
								<Label htmlFor="include-used" className="text-sm">
									Include used stories
								</Label>
							</div>
							<Button type="submit" size="sm" disabled={loading || !q.trim()}>
								{loading ? <Spinner /> : <Search className="size-4" />}
								Search
							</Button>
						</div>
					</form>

					<div className="max-h-96 overflow-y-auto">
						{error && (
							<p className="text-sm text-destructive py-3">{error}</p>
						)}
						{loading && !error && (
							<div className="flex items-center justify-center py-6">
								<Spinner />
							</div>
						)}
						{!loading && results && results.length === 0 && (
							<p className="text-sm text-muted-foreground py-4 text-center">
								No results.
							</p>
						)}
						{!loading && results && results.length > 0 && (
							<ul className="divide-y">
								{results.map((hit) => (
									<li key={hit.entryId} className="py-2">
										<Link
											to="/org/$slug/inbox/$entryId"
											params={{ slug: org.slug, entryId: hit.entryId }}
											onClick={() => setOpen(false)}
											className="block hover:bg-accent/40 rounded-md p-2 -mx-2"
										>
											<div className="font-medium text-sm truncate">
												{hit.title}
											</div>
											{hit.snippet && (
												<div className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
													{hit.snippet}
												</div>
											)}
											<div className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
												<span>{hit.primarySourceName}</span>
												<span>·</span>
												<span>
													{formatDistanceToNow(new Date(hit.fetchedAt), {
														addSuffix: true,
													})}
												</span>
												<span>·</span>
												<span>score {hit.score.toFixed(2)}</span>
											</div>
										</Link>
									</li>
								))}
							</ul>
						)}
					</div>
				</DialogContent>
			</Dialog>
		</>
	);
}
