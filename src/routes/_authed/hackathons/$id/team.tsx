import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import type { Id } from "../../../../../convex/_generated/dataModel";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";

import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import {
	Form,
	FormControl,
	FormField,
	FormLabel,
	FormMessage,
} from "@/components/ui/form";
import { HackathonNav } from "@/components/HackathonNav";
import type { HackathonRole } from "@/lib/hackathon-permissions";
import { getRoleDisplayName } from "@/lib/hackathon-permissions";

export const Route = createFileRoute("/_authed/hackathons/$id/team")({
	component: TeamPage,
});

const inviteSchema = z.object({
	email: z.string().email("Invalid email address"),
	role: z.enum(["organiser", "curator", "judge", "participant"]),
});

type InviteFormValues = z.infer<typeof inviteSchema>;

function TeamPage() {
	const { id } = Route.useParams();
	const hackathonId = id as Id<"hackathons">;

	const myRole = useQuery(api.hackathonRoles.getMyRole, { hackathonId });
	const roles = useQuery(api.hackathonRoles.listByHackathon, { hackathonId });
	const invitations = useQuery(api.hackathonRoles.listInvitations, {
		hackathonId,
	});

	const assignRole = useMutation(api.hackathonRoles.assignRole);
	const removeRole = useMutation(api.hackathonRoles.removeRole);
	const createInvitation = useMutation(api.hackathonRoles.createInvitation);
	const revokeInvitation = useMutation(api.hackathonRoles.revokeInvitation);

	const form = useForm<InviteFormValues>({
		resolver: zodResolver(inviteSchema),
		defaultValues: { email: "", role: "participant" },
	});

	async function onInvite(values: InviteFormValues) {
		try {
			await createInvitation({
				hackathonId,
				email: values.email,
				role: values.role,
			});
			toast.success(`Invitation sent to ${values.email}`);
			form.reset();
		} catch (err) {
			toast.error(
				err instanceof Error ? err.message : "Failed to send invitation",
			);
		}
	}

	async function handleRemoveRole(userId: string) {
		try {
			await removeRole({ hackathonId, userId });
			toast.success("Role removed");
		} catch (err) {
			toast.error(
				err instanceof Error ? err.message : "Failed to remove role",
			);
		}
	}

	async function handleChangeRole(
		userId: string,
		role: "organiser" | "curator" | "judge" | "participant",
	) {
		try {
			await assignRole({ hackathonId, userId, role });
			toast.success("Role updated");
		} catch (err) {
			toast.error(
				err instanceof Error ? err.message : "Failed to update role",
			);
		}
	}

	async function handleRevoke(invitationId: Id<"roleInvitations">) {
		try {
			await revokeInvitation({ invitationId });
			toast.success("Invitation revoked");
		} catch (err) {
			toast.error(
				err instanceof Error ? err.message : "Failed to revoke invitation",
			);
		}
	}

	return (
		<div className="flex gap-6">
			<aside className="w-48 shrink-0">
				<HackathonNav
					hackathonId={id}
					role={(myRole ?? null) as HackathonRole}
				/>
			</aside>

			<div className="flex-1 space-y-6">
				<h1 className="text-2xl font-bold">Team &amp; Roles</h1>

				{/* Current role assignments */}
				<Card>
					<CardHeader>
						<CardTitle>Role Assignments</CardTitle>
					</CardHeader>
					<CardContent>
						{roles === undefined ? (
							<p className="text-muted-foreground text-sm">Loading...</p>
						) : roles.length === 0 ? (
							<p className="text-muted-foreground text-sm">
								No roles assigned yet.
							</p>
						) : (
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead>Name</TableHead>
										<TableHead>Email</TableHead>
										<TableHead>Role</TableHead>
										<TableHead className="w-[200px]">Actions</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{roles.map((r) => (
										<TableRow key={r._id}>
											<TableCell>{r.userName ?? "Unknown"}</TableCell>
											<TableCell>{r.userEmail ?? "-"}</TableCell>
											<TableCell>
												<Badge variant="secondary">
													{r.isOwner
														? "Owner"
														: getRoleDisplayName(r.role)}
												</Badge>
											</TableCell>
											<TableCell>
												{!r.isOwner && (
													<div className="flex gap-2">
														<Select
															defaultValue={r.role}
															onValueChange={(val) =>
																handleChangeRole(
																	r.userId,
																	val as InviteFormValues["role"],
																)
															}
														>
															<SelectTrigger className="h-8 w-[130px]">
																<SelectValue />
															</SelectTrigger>
															<SelectContent>
																<SelectItem value="organiser">
																	Organiser
																</SelectItem>
																<SelectItem value="curator">
																	Curator
																</SelectItem>
																<SelectItem value="judge">
																	Judge
																</SelectItem>
																<SelectItem value="participant">
																	Participant
																</SelectItem>
															</SelectContent>
														</Select>
														<Button
															variant="destructive"
															size="sm"
															onClick={() => handleRemoveRole(r.userId)}
														>
															Remove
														</Button>
													</div>
												)}
											</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
						)}
					</CardContent>
				</Card>

				{/* Invite by email */}
				<Card>
					<CardHeader>
						<CardTitle>Invite by Email</CardTitle>
					</CardHeader>
					<CardContent>
						<Form {...form}>
							<form
								onSubmit={form.handleSubmit(onInvite)}
								className="flex items-end gap-4"
							>
								<FormField
									control={form.control}
									name="email"
									render={({ field }) => (
										<div className="flex-1 space-y-1">
											<FormLabel>Email</FormLabel>
											<FormControl>
												<Input
													placeholder="user@example.com"
													{...field}
												/>
											</FormControl>
											<FormMessage />
										</div>
									)}
								/>
								<FormField
									control={form.control}
									name="role"
									render={({ field }) => (
										<div className="w-[160px] space-y-1">
											<FormLabel>Role</FormLabel>
											<FormControl>
												<Select
													value={field.value}
													onValueChange={field.onChange}
												>
													<SelectTrigger>
														<SelectValue />
													</SelectTrigger>
													<SelectContent>
														<SelectItem value="organiser">
															Organiser
														</SelectItem>
														<SelectItem value="curator">
															Curator
														</SelectItem>
														<SelectItem value="judge">
															Judge
														</SelectItem>
														<SelectItem value="participant">
															Participant
														</SelectItem>
													</SelectContent>
												</Select>
											</FormControl>
											<FormMessage />
										</div>
									)}
								/>
								<Button type="submit">Send Invite</Button>
							</form>
						</Form>
					</CardContent>
				</Card>

				{/* Pending invitations */}
				<Card>
					<CardHeader>
						<CardTitle>Pending Invitations</CardTitle>
					</CardHeader>
					<CardContent>
						{invitations === undefined ? (
							<p className="text-muted-foreground text-sm">Loading...</p>
						) : invitations.length === 0 ? (
							<p className="text-muted-foreground text-sm">
								No pending invitations.
							</p>
						) : (
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead>Email</TableHead>
										<TableHead>Role</TableHead>
										<TableHead>Expires</TableHead>
										<TableHead className="w-[100px]">Actions</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{invitations.map((inv) => (
										<TableRow key={inv._id}>
											<TableCell>{inv.email}</TableCell>
											<TableCell>
												<Badge variant="outline">
													{getRoleDisplayName(inv.role)}
												</Badge>
											</TableCell>
											<TableCell>
												{new Date(inv.expiresAt).toLocaleDateString()}
											</TableCell>
											<TableCell>
												<Button
													variant="destructive"
													size="sm"
													onClick={() => handleRevoke(inv._id)}
												>
													Revoke
												</Button>
											</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
						)}
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
