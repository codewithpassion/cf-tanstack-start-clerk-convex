import { createFileRoute } from "@tanstack/react-router";
import { useMutation } from "convex/react";
import { ConvexError } from "convex/values";
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
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/_authed/org/$slug/settings/")({
	component: SettingsPage,
});

function SettingsPage() {
	const org = useOrg();
	const isAdmin = org.role === "admin";
	const update = useMutation(api.organizations.update);
	const [name, setName] = useState(org.name);
	const [description, setDescription] = useState("");
	const [status, setStatus] = useState<string | null>(null);
	const [submitting, setSubmitting] = useState(false);

	const onSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setStatus(null);
		setSubmitting(true);
		try {
			await update({
				orgId: org.orgId,
				name,
				description: description || undefined,
			});
			setStatus("Saved");
		} catch (err) {
			const msg =
				err instanceof ConvexError
					? typeof err.data === "string"
						? err.data
						: "Failed to save"
					: "Failed to save";
			setStatus(msg);
		} finally {
			setSubmitting(false);
		}
	};

	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-3xl font-bold">Settings</h1>
				<p className="text-muted-foreground mt-1">
					Manage your organization's profile.
				</p>
			</div>

			<Card>
				<CardHeader>
					<CardTitle>General</CardTitle>
					<CardDescription>
						Name and description. Slug cannot be changed.
					</CardDescription>
				</CardHeader>
				<CardContent>
					<form onSubmit={onSubmit} className="space-y-4">
						<div className="space-y-2">
							<Label htmlFor="slug">URL slug</Label>
							<Input id="slug" value={org.slug} readOnly disabled />
						</div>
						<div className="space-y-2">
							<Label htmlFor="name">Name</Label>
							<Input
								id="name"
								value={name}
								onChange={(e) => setName(e.target.value)}
								required
								disabled={!isAdmin}
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="description">Description</Label>
							<Textarea
								id="description"
								value={description}
								onChange={(e) => setDescription(e.target.value)}
								rows={3}
								disabled={!isAdmin}
							/>
						</div>
						{status && <p className="text-sm text-muted-foreground">{status}</p>}
						{isAdmin && (
							<Button type="submit" disabled={submitting}>
								{submitting ? "Saving..." : "Save changes"}
							</Button>
						)}
					</form>
				</CardContent>
			</Card>
		</div>
	);
}
