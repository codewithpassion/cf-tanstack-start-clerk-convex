import { createFileRoute } from "@tanstack/react-router";
import { useAction, useMutation, useQuery } from "convex/react";
import { ConvexError } from "convex/values";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/_authed/org/$slug/settings/members")({
	component: MembersPage,
});

function errorMessage(err: unknown, fallback: string): string {
	if (err instanceof ConvexError) {
		return typeof err.data === "string" ? err.data : fallback;
	}
	if (err instanceof Error) return err.message;
	return fallback;
}

function MembersPage() {
	const org = useOrg();
	const isAdmin = org.role === "admin";
	const members = useQuery(api.organizations.listMembers, { orgId: org.orgId });
	const updateMember = useMutation(api.organizations.updateMember);
	const removeMember = useMutation(api.organizations.removeMember);
	const invite = useAction(api.organizations.invite);

	const [inviteEmail, setInviteEmail] = useState("");
	const [inviteRole, setInviteRole] = useState<"admin" | "member">("member");
	const [inviting, setInviting] = useState(false);
	const [inviteStatus, setInviteStatus] = useState<string | null>(null);
	const [rowError, setRowError] = useState<string | null>(null);

	const onInvite = async (e: React.FormEvent) => {
		e.preventDefault();
		setInviteStatus(null);
		setInviting(true);
		try {
			await invite({ orgId: org.orgId, email: inviteEmail, role: inviteRole });
			setInviteStatus(`Invitation sent to ${inviteEmail}`);
			setInviteEmail("");
		} catch (err) {
			setInviteStatus(errorMessage(err, "Failed to send invitation"));
		} finally {
			setInviting(false);
		}
	};

	const onChangeRole = async (
		memberId: Id<"organizationMembers">,
		role: "admin" | "member",
	) => {
		setRowError(null);
		try {
			await updateMember({ orgId: org.orgId, memberId, role });
		} catch (err) {
			setRowError(errorMessage(err, "Failed to update role"));
		}
	};

	const onRemove = async (memberId: Id<"organizationMembers">) => {
		setRowError(null);
		try {
			await removeMember({ orgId: org.orgId, memberId });
		} catch (err) {
			setRowError(errorMessage(err, "Failed to remove member"));
		}
	};

	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-3xl font-bold">Members</h1>
				<p className="text-muted-foreground mt-1">
					Manage who has access to this organization.
				</p>
			</div>

			{isAdmin && (
				<Card>
					<CardHeader>
						<CardTitle>Invite a teammate</CardTitle>
						<CardDescription>
							We'll send an invitation email via Clerk.
						</CardDescription>
					</CardHeader>
					<CardContent>
						<form
							onSubmit={onInvite}
							className="flex flex-col md:flex-row gap-3 items-end"
						>
							<div className="flex-1 space-y-2 w-full">
								<Label htmlFor="invite-email">Email</Label>
								<Input
									id="invite-email"
									type="email"
									value={inviteEmail}
									onChange={(e) => setInviteEmail(e.target.value)}
									required
									placeholder="teammate@example.com"
								/>
							</div>
							<div className="space-y-2">
								<Label htmlFor="invite-role">Role</Label>
								<Select
									value={inviteRole}
									onValueChange={(v) =>
										setInviteRole(v as "admin" | "member")
									}
								>
									<SelectTrigger id="invite-role" className="w-32">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="member">Member</SelectItem>
										<SelectItem value="admin">Admin</SelectItem>
									</SelectContent>
								</Select>
							</div>
							<Button type="submit" disabled={inviting}>
								{inviting ? "Sending..." : "Send invite"}
							</Button>
						</form>
						{inviteStatus && (
							<p className="text-sm text-muted-foreground mt-3">
								{inviteStatus}
							</p>
						)}
					</CardContent>
				</Card>
			)}

			<Card>
				<CardHeader>
					<CardTitle>Members</CardTitle>
				</CardHeader>
				<CardContent>
					{rowError && (
						<p className="text-sm text-destructive mb-3">{rowError}</p>
					)}
					{members === undefined ? (
						<p className="text-sm text-muted-foreground">Loading...</p>
					) : members.length === 0 ? (
						<p className="text-sm text-muted-foreground">No members yet.</p>
					) : (
						<ul className="divide-y">
							{members.map((m) => (
								<li
									key={m._id}
									className="flex items-center gap-3 py-3"
								>
									<div className="flex-1 min-w-0">
										<div className="font-medium truncate">
											{m.user?.name || m.user?.email || m.clerkUserId}
										</div>
										{m.user?.email && (
											<div className="text-sm text-muted-foreground truncate">
												{m.user.email}
											</div>
										)}
									</div>
									{isAdmin ? (
										<Select
											value={m.role}
											onValueChange={(v) =>
												onChangeRole(m._id, v as "admin" | "member")
											}
										>
											<SelectTrigger className="w-28">
												<SelectValue />
											</SelectTrigger>
											<SelectContent>
												<SelectItem value="member">Member</SelectItem>
												<SelectItem value="admin">Admin</SelectItem>
											</SelectContent>
										</Select>
									) : (
										<Badge variant="secondary">{m.role}</Badge>
									)}
									{isAdmin && (
										<Button
											variant="outline"
											size="sm"
											onClick={() => onRemove(m._id)}
										>
											Remove
										</Button>
									)}
								</li>
							))}
						</ul>
					)}
				</CardContent>
			</Card>
		</div>
	);
}
