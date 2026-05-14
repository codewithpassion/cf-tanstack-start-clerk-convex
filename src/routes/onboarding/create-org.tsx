import { auth } from "@clerk/tanstack-react-start/server";
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { useAction } from "convex/react";
import { ConvexError } from "convex/values";
import { useState } from "react";
import { api } from "../../../convex/_generated/api";
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
import { Textarea } from "@/components/ui/textarea";

const checkAuth = createServerFn({ method: "GET" }).handler(async () => {
	const { userId } = await auth();
	if (!userId) {
		throw redirect({
			to: "/sign-in",
			search: { redirect: "/onboarding/create-org" },
		});
	}
	return { userId };
});

export const Route = createFileRoute("/onboarding/create-org")({
	beforeLoad: async () => {
		await checkAuth();
	},
	component: CreateOrgPage,
});

function slugify(input: string): string {
	return input
		.toLowerCase()
		.trim()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "")
		.slice(0, 32);
}

function CreateOrgPage() {
	const navigate = useNavigate();
	const createOrg = useAction(api.organizations.create);
	const [name, setName] = useState("");
	const [slug, setSlug] = useState("");
	const [slugTouched, setSlugTouched] = useState(false);
	const [description, setDescription] = useState("");
	const [submitting, setSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const onNameChange = (next: string) => {
		setName(next);
		if (!slugTouched) setSlug(slugify(next));
	};

	const onSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setError(null);
		setSubmitting(true);
		try {
			const result = await createOrg({
				name,
				slug,
				description: description || undefined,
			});
			navigate({
				to: "/org/$slug/dashboard",
				params: { slug: result.slug },
			});
		} catch (err) {
			const msg =
				err instanceof ConvexError
					? typeof err.data === "string"
						? err.data
						: "Failed to create organization"
					: err instanceof Error
						? err.message
						: "Failed to create organization";
			setError(msg);
			setSubmitting(false);
		}
	};

	return (
		<div className="max-w-xl mx-auto p-6">
			<Card>
				<CardHeader>
					<CardTitle>Create a new organization</CardTitle>
					<CardDescription>
						Each organization is an isolated workspace with its own sources,
						entries, drafts, and ghost writer profile.
					</CardDescription>
				</CardHeader>
				<CardContent>
					<form onSubmit={onSubmit} className="space-y-4">
						<div className="space-y-2">
							<Label htmlFor="name">Name</Label>
							<Input
								id="name"
								value={name}
								onChange={(e) => onNameChange(e.target.value)}
								required
								placeholder="Acme Inc."
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="slug">URL slug</Label>
							<Input
								id="slug"
								value={slug}
								onChange={(e) => {
									setSlug(e.target.value);
									setSlugTouched(true);
								}}
								required
								pattern="[a-z0-9]+(-[a-z0-9]+)*"
								minLength={3}
								maxLength={32}
								placeholder="acme"
							/>
							<p className="text-xs text-muted-foreground">
								3-32 chars, lowercase letters, numbers and hyphens. Your org
								will live at <code>/org/{slug || "..."}</code>
							</p>
						</div>
						<div className="space-y-2">
							<Label htmlFor="description">Description (optional)</Label>
							<Textarea
								id="description"
								value={description}
								onChange={(e) => setDescription(e.target.value)}
								rows={3}
								placeholder="Newsletter for our weekly AI roundup"
							/>
						</div>
						{error && (
							<p className="text-sm text-destructive">{error}</p>
						)}
						<Button type="submit" disabled={submitting} className="w-full">
							{submitting ? "Creating..." : "Create organization"}
						</Button>
					</form>
				</CardContent>
			</Card>
		</div>
	);
}
