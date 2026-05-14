import { createFileRoute, redirect } from "@tanstack/react-router";
import { useAction, useMutation, useQuery } from "convex/react";
import { ConvexError } from "convex/values";
import { Sparkles, Trash2 } from "lucide-react";
import { useState } from "react";
import { api } from "../../../../../../convex/_generated/api";
import type { Id } from "../../../../../../convex/_generated/dataModel";
import { useOrg } from "@/contexts/org-context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	Empty,
	EmptyDescription,
	EmptyHeader,
	EmptyTitle,
} from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/_authed/org/$slug/settings/ghost-writer")(
	{
		component: GhostWriterPage,
	},
);

function errorMessage(err: unknown, fallback: string): string {
	if (err instanceof ConvexError) {
		return typeof err.data === "string" ? err.data : fallback;
	}
	if (err instanceof Error) return err.message;
	return fallback;
}

function GhostWriterPage() {
	const org = useOrg();
	const isAdmin = org.role === "admin";

	// Non-admins get redirected to the dashboard.
	if (!isAdmin) {
		throw redirect({
			to: "/org/$slug/dashboard",
			params: { slug: org.slug },
		});
	}

	const examples = useQuery(api.ghostWriter.listExamples, { orgId: org.orgId });
	const profile = useQuery(api.ghostWriter.getProfile, { orgId: org.orgId });
	const addExample = useMutation(api.ghostWriter.addExample);
	const removeExample = useMutation(api.ghostWriter.removeExample);
	const deleteProfile = useMutation(api.ghostWriter.deleteProfile);
	const generateProfile = useAction(api.ghostWriter.generateProfile);

	const [title, setTitle] = useState("");
	const [content, setContent] = useState("");
	const [submitting, setSubmitting] = useState(false);
	const [status, setStatus] = useState<string | null>(null);
	const [generating, setGenerating] = useState(false);
	const [genError, setGenError] = useState<string | null>(null);

	const onAdd = async (e: React.FormEvent) => {
		e.preventDefault();
		setStatus(null);
		setSubmitting(true);
		try {
			await addExample({ orgId: org.orgId, title, content });
			setTitle("");
			setContent("");
			setStatus("Example added.");
		} catch (err) {
			setStatus(errorMessage(err, "Failed to add example"));
		} finally {
			setSubmitting(false);
		}
	};

	const onRemove = async (exampleId: Id<"ghostWriterExamples">) => {
		try {
			await removeExample({ orgId: org.orgId, exampleId });
		} catch (err) {
			setStatus(errorMessage(err, "Failed to remove example"));
		}
	};

	const onGenerate = async () => {
		setGenError(null);
		setGenerating(true);
		try {
			await generateProfile({ orgId: org.orgId });
		} catch (err) {
			setGenError(errorMessage(err, "Failed to generate profile"));
		} finally {
			setGenerating(false);
		}
	};

	const onDeleteProfile = async () => {
		setGenError(null);
		try {
			await deleteProfile({ orgId: org.orgId });
		} catch (err) {
			setGenError(errorMessage(err, "Failed to delete profile"));
		}
	};

	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-3xl font-bold">Ghost writer</h1>
				<p className="text-muted-foreground mt-1">
					Upload past newsletters and Claude will learn your organization's
					voice for future drafts.
				</p>
			</div>

			<Card>
				<CardHeader>
					<CardTitle>Add an example</CardTitle>
					<CardDescription>
						Paste the markdown or plain text of a past newsletter.
					</CardDescription>
				</CardHeader>
				<CardContent>
					<form onSubmit={onAdd} className="space-y-4">
						<div className="space-y-2">
							<Label htmlFor="ex-title">Title</Label>
							<Input
								id="ex-title"
								value={title}
								onChange={(e) => setTitle(e.target.value)}
								placeholder="e.g. Weekly digest — Jan 12"
								required
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="ex-content">Content</Label>
							<Textarea
								id="ex-content"
								value={content}
								onChange={(e) => setContent(e.target.value)}
								rows={10}
								placeholder="Paste the newsletter content here"
								required
							/>
						</div>
						{status && (
							<p className="text-sm text-muted-foreground">{status}</p>
						)}
						<Button type="submit" disabled={submitting}>
							{submitting ? "Saving..." : "Add example"}
						</Button>
					</form>
				</CardContent>
			</Card>

			<Card>
				<CardHeader className="flex flex-row items-center justify-between space-y-0">
					<div>
						<CardTitle>Examples</CardTitle>
						<CardDescription>
							{examples?.length ?? 0} stored example
							{examples?.length === 1 ? "" : "s"}
						</CardDescription>
					</div>
					<Button
						onClick={onGenerate}
						disabled={generating || !examples || examples.length === 0}
					>
						{generating ? <Spinner /> : <Sparkles className="size-4" />}
						{profile ? "Regenerate profile" : "Generate profile"}
					</Button>
				</CardHeader>
				<CardContent>
					{genError && (
						<p className="text-sm text-destructive mb-3">{genError}</p>
					)}
					{examples === undefined ? (
						<p className="text-sm text-muted-foreground">Loading...</p>
					) : examples.length === 0 ? (
						<Empty>
							<EmptyHeader>
								<EmptyTitle>No examples yet</EmptyTitle>
								<EmptyDescription>
									Add at least one past newsletter above to unlock profile
									generation.
								</EmptyDescription>
							</EmptyHeader>
						</Empty>
					) : (
						<ul className="divide-y">
							{examples.map((ex) => (
								<li
									key={ex._id}
									className="flex items-start gap-3 py-3"
								>
									<div className="flex-1 min-w-0">
										<div className="font-medium truncate">{ex.title}</div>
										<div className="text-xs text-muted-foreground line-clamp-2">
											{ex.content.slice(0, 200)}
										</div>
									</div>
									<Button
										variant="ghost"
										size="sm"
										onClick={() => onRemove(ex._id)}
										title="Remove"
									>
										<Trash2 className="size-4" />
									</Button>
								</li>
							))}
						</ul>
					)}
				</CardContent>
			</Card>

			<Card>
				<CardHeader className="flex flex-row items-center justify-between space-y-0">
					<div>
						<CardTitle>Current profile</CardTitle>
						<CardDescription>
							Used as the tone-of-voice guide when drafting newsletters.
						</CardDescription>
					</div>
					{profile && (
						<Button
							variant="outline"
							size="sm"
							onClick={onDeleteProfile}
						>
							<Trash2 className="size-4" />
							Delete
						</Button>
					)}
				</CardHeader>
				<CardContent>
					{profile === undefined ? (
						<p className="text-sm text-muted-foreground">Loading...</p>
					) : profile === null ? (
						<Empty>
							<EmptyHeader>
								<EmptyTitle>No profile yet</EmptyTitle>
								<EmptyDescription>
									Add at least one example then click "Generate profile" to
									build one.
								</EmptyDescription>
							</EmptyHeader>
						</Empty>
					) : (
						<div className="space-y-4">
							<div>
								<h3 className="text-sm font-medium mb-1">Summary</h3>
								<p className="text-sm text-muted-foreground whitespace-pre-wrap">
									{profile.summary}
								</p>
							</div>
							{profile.voiceAttributes.length > 0 && (
								<div>
									<h3 className="text-sm font-medium mb-2">Voice attributes</h3>
									<div className="flex flex-wrap gap-1.5">
										{profile.voiceAttributes.map((v) => (
											<Badge key={v} variant="secondary">
												{v}
											</Badge>
										))}
									</div>
								</div>
							)}
							{profile.doExamples.length > 0 && (
								<div>
									<h3 className="text-sm font-medium mb-2">Do</h3>
									<ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
										{profile.doExamples.map((d, i) => (
											<li key={`do-${i}`}>{d}</li>
										))}
									</ul>
								</div>
							)}
							{profile.dontExamples.length > 0 && (
								<div>
									<h3 className="text-sm font-medium mb-2">Don't</h3>
									<ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
										{profile.dontExamples.map((d, i) => (
											<li key={`dont-${i}`}>{d}</li>
										))}
									</ul>
								</div>
							)}
							<p className="text-xs text-muted-foreground pt-2 border-t">
								Generated{" "}
								{new Date(profile.generatedAt).toLocaleString()} via{" "}
								{profile.model}
							</p>
						</div>
					)}
				</CardContent>
			</Card>
		</div>
	);
}
