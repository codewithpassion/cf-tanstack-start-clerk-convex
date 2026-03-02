import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../../../../convex/_generated/api";
import type { Id } from "../../../../../../../convex/_generated/dataModel";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState } from "react";
import { toast } from "sonner";
import { Copy, RefreshCw, Users, Shield, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
	Form,
	FormField,
	FormItem,
	FormLabel,
	FormControl,
	FormDescription,
	FormMessage,
} from "@/components/ui/form";
import {
	Avatar,
	AvatarFallback,
	AvatarImage,
} from "@/components/ui/avatar";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";

export const Route = createFileRoute(
	"/_authed/hackathons/$id/teams/$teamId/manage",
)({
	component: ManageTeamPage,
});

const settingsSchema = z.object({
	name: z.string().min(2, "Team name must be at least 2 characters"),
	description: z.string().optional(),
	isOpen: z.boolean(),
});

type SettingsValues = z.infer<typeof settingsSchema>;

function ManageTeamPage() {
	const { id, teamId } = Route.useParams();
	const hackathonId = id as Id<"hackathons">;
	const teamDocId = teamId as Id<"teams">;
	const navigate = useNavigate();

	const team = useQuery(api.teams.getById, { id: teamDocId });
	const joinRequests = useQuery(api.teamManagement.listJoinRequests, {
		teamId: teamDocId,
		status: "pending",
	});
	const approvedProblems = useQuery(api.problems.listByHackathon, {
		hackathonId,
	});

	const updateTeam = useMutation(api.teams.update);
	const kickMember = useMutation(api.teams.kick);
	const transferLeadership = useMutation(api.teams.transferLeadership);
	const regenerateInviteCode = useMutation(api.teams.regenerateInviteCode);
	const selectProblems = useMutation(api.teams.selectProblems);
	const disbandTeam = useMutation(api.teams.disbandTeam);
	const approveRequest = useMutation(api.teamManagement.approveJoinRequest);
	const rejectRequest = useMutation(api.teamManagement.rejectJoinRequest);
	const leaveTeam = useMutation(api.teams.leave);

	if (team === undefined) {
		return (
			<div className="max-w-3xl mx-auto">
				<p className="text-muted-foreground">Loading...</p>
			</div>
		);
	}

	if (!team) {
		return (
			<div className="max-w-3xl mx-auto">
				<p className="text-muted-foreground">Team not found.</p>
			</div>
		);
	}

	return (
		<div className="max-w-3xl mx-auto space-y-6">
			<h1 className="text-2xl font-bold">Manage Team</h1>

			{/* Team Settings */}
			<TeamSettingsForm
				team={team}
				onSave={async (values) => {
					await updateTeam({
						id: teamDocId,
						name: values.name,
						description: values.description || undefined,
						isOpen: values.isOpen,
					});
					toast.success("Team settings updated");
				}}
			/>

			{/* Invite Code */}
			<Card>
				<CardHeader>
					<CardTitle className="text-lg">Invite Code</CardTitle>
					<CardDescription>
						Share this code with others so they can join your team
						directly.
					</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="flex items-center gap-2">
						<code className="rounded bg-muted px-3 py-2 font-mono text-lg tracking-wider">
							{team.inviteCode}
						</code>
						<Button
							variant="outline"
							size="icon"
							onClick={() => {
								navigator.clipboard.writeText(team.inviteCode);
								toast.success("Invite code copied!");
							}}
						>
							<Copy className="h-4 w-4" />
						</Button>
						<Button
							variant="outline"
							size="icon"
							onClick={async () => {
								await regenerateInviteCode({
									teamId: teamDocId,
								});
								toast.success("Invite code regenerated");
							}}
						>
							<RefreshCw className="h-4 w-4" />
						</Button>
					</div>
				</CardContent>
			</Card>

			{/* Members */}
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2 text-lg">
						<Users className="h-5 w-5" />
						Members ({team.members.length})
					</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="space-y-3">
						{team.members.map((member) => (
							<div
								key={member.userId}
								className="flex items-center gap-3"
							>
								<Avatar className="h-8 w-8">
									<AvatarImage
										src={member.imageUrl}
										alt={member.name}
									/>
									<AvatarFallback>
										{member.name
											.substring(0, 2)
											.toUpperCase()}
									</AvatarFallback>
								</Avatar>
								<div className="flex-1">
									<p className="text-sm font-medium">
										{member.name}
									</p>
									<p className="text-xs text-muted-foreground">
										{member.email}
									</p>
								</div>
								{member.isLeader ? (
									<Badge
										variant="outline"
										className="text-xs"
									>
										Leader
									</Badge>
								) : (
									<div className="flex gap-1">
										<AlertDialog>
											<AlertDialogTrigger asChild>
												<Button
													variant="outline"
													size="sm"
												>
													<Shield className="mr-1 h-3 w-3" />
													Make Leader
												</Button>
											</AlertDialogTrigger>
											<AlertDialogContent>
												<AlertDialogHeader>
													<AlertDialogTitle>
														Transfer Leadership
													</AlertDialogTitle>
													<AlertDialogDescription>
														Are you sure you want
														to make{" "}
														<strong>
															{member.name}
														</strong>{" "}
														the team leader? You
														will lose leader
														privileges.
													</AlertDialogDescription>
												</AlertDialogHeader>
												<AlertDialogFooter>
													<AlertDialogCancel>
														Cancel
													</AlertDialogCancel>
													<AlertDialogAction
														onClick={async () => {
															try {
																await transferLeadership(
																	{
																		teamId: teamDocId,
																		newLeaderId:
																			member.userId,
																	},
																);
																toast.success(
																	"Leadership transferred",
																);
															} catch (err) {
																toast.error(
																	err instanceof
																		Error
																		? err.message
																		: "Failed to transfer leadership",
																);
															}
														}}
													>
														Transfer
													</AlertDialogAction>
												</AlertDialogFooter>
											</AlertDialogContent>
										</AlertDialog>
										<Button
											variant="destructive"
											size="sm"
											onClick={async () => {
												try {
													await kickMember({
														teamId: teamDocId,
														userId: member.userId,
													});
													toast.success(
														"Member removed",
													);
												} catch (err) {
													toast.error(
														err instanceof Error
															? err.message
															: "Failed to remove member",
													);
												}
											}}
										>
											Kick
										</Button>
									</div>
								)}
							</div>
						))}
					</div>
				</CardContent>
			</Card>

			{/* Problem Selection */}
			<ProblemSelection
				teamId={teamDocId}
				currentProblemIds={team.problemIds}
				problems={approvedProblems}
				onSave={selectProblems}
			/>

			{/* Join Requests */}
			<Card>
				<CardHeader>
					<CardTitle className="text-lg">
						Pending Join Requests
					</CardTitle>
				</CardHeader>
				<CardContent>
					{joinRequests === undefined ? (
						<p className="text-sm text-muted-foreground">
							Loading...
						</p>
					) : joinRequests.length === 0 ? (
						<p className="text-sm text-muted-foreground">
							No pending join requests.
						</p>
					) : (
						<div className="space-y-3">
							{joinRequests.map((req) => (
								<div
									key={req._id}
									className="flex items-center justify-between rounded-md border p-3"
								>
									<div>
										<p className="text-sm font-medium">
											{req.userName}
										</p>
										<p className="text-xs text-muted-foreground">
											{req.userEmail}
										</p>
										{req.message && (
											<p className="mt-1 text-sm italic text-muted-foreground">
												&quot;{req.message}&quot;
											</p>
										)}
									</div>
									<div className="flex gap-2">
										<Button
											size="sm"
											onClick={async () => {
												try {
													await approveRequest({
														requestId: req._id,
													});
													toast.success(
														"Request approved",
													);
												} catch (err) {
													toast.error(
														err instanceof Error
															? err.message
															: "Failed to approve",
													);
												}
											}}
										>
											Approve
										</Button>
										<Button
											size="sm"
											variant="outline"
											onClick={async () => {
												try {
													await rejectRequest({
														requestId: req._id,
													});
													toast.success(
														"Request rejected",
													);
												} catch (err) {
													toast.error(
														err instanceof Error
															? err.message
															: "Failed to reject",
													);
												}
											}}
										>
											Reject
										</Button>
									</div>
								</div>
							))}
						</div>
					)}
				</CardContent>
			</Card>

			{/* Danger Zone */}
			<Card className="border-destructive/50">
				<CardHeader>
					<CardTitle className="text-lg text-destructive">
						Danger Zone
					</CardTitle>
				</CardHeader>
				<CardContent className="space-y-3">
					<div className="flex items-center justify-between">
						<div>
							<p className="text-sm font-medium">Leave Team</p>
							<p className="text-xs text-muted-foreground">
								Leave this team. You must transfer leadership
								first if you are the leader.
							</p>
						</div>
						<AlertDialog>
							<AlertDialogTrigger asChild>
								<Button variant="outline">Leave</Button>
							</AlertDialogTrigger>
							<AlertDialogContent>
								<AlertDialogHeader>
									<AlertDialogTitle>
										Leave Team
									</AlertDialogTitle>
									<AlertDialogDescription>
										Are you sure you want to leave this
										team?
									</AlertDialogDescription>
								</AlertDialogHeader>
								<AlertDialogFooter>
									<AlertDialogCancel>
										Cancel
									</AlertDialogCancel>
									<AlertDialogAction
										onClick={async () => {
											try {
												await leaveTeam({
													teamId: teamDocId,
												});
												toast.success("Left team");
												navigate({
													to: "/hackathons/$id/teams",
													params: { id },
												});
											} catch (err) {
												toast.error(
													err instanceof Error
														? err.message
														: "Failed to leave team",
												);
											}
										}}
									>
										Leave
									</AlertDialogAction>
								</AlertDialogFooter>
							</AlertDialogContent>
						</AlertDialog>
					</div>

					<Separator />

					<div className="flex items-center justify-between">
						<div>
							<p className="text-sm font-medium">Disband Team</p>
							<p className="text-xs text-muted-foreground">
								Permanently delete this team and remove all
								members.
							</p>
						</div>
						<AlertDialog>
							<AlertDialogTrigger asChild>
								<Button variant="destructive">
									<Trash2 className="mr-2 h-4 w-4" />
									Disband
								</Button>
							</AlertDialogTrigger>
							<AlertDialogContent>
								<AlertDialogHeader>
									<AlertDialogTitle>
										Disband Team
									</AlertDialogTitle>
									<AlertDialogDescription>
										This action cannot be undone. This will
										permanently delete the team and remove
										all members.
									</AlertDialogDescription>
								</AlertDialogHeader>
								<AlertDialogFooter>
									<AlertDialogCancel>
										Cancel
									</AlertDialogCancel>
									<AlertDialogAction
										className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
										onClick={async () => {
											try {
												await disbandTeam({
													teamId: teamDocId,
												});
												toast.success(
													"Team disbanded",
												);
												navigate({
													to: "/hackathons/$id/teams",
													params: { id },
												});
											} catch (err) {
												toast.error(
													err instanceof Error
														? err.message
														: "Failed to disband team",
												);
											}
										}}
									>
										Disband
									</AlertDialogAction>
								</AlertDialogFooter>
							</AlertDialogContent>
						</AlertDialog>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}

function TeamSettingsForm({
	team,
	onSave,
}: {
	team: { name: string; description?: string; isOpen: boolean };
	onSave: (values: SettingsValues) => Promise<void>;
}) {
	const form = useForm<SettingsValues>({
		resolver: zodResolver(settingsSchema),
		defaultValues: {
			name: team.name,
			description: team.description ?? "",
			isOpen: team.isOpen,
		},
	});

	async function onSubmit(values: SettingsValues) {
		try {
			await onSave(values);
		} catch (err) {
			toast.error(
				err instanceof Error ? err.message : "Failed to update team",
			);
		}
	}

	return (
		<Card>
			<CardHeader>
				<CardTitle className="text-lg">Team Settings</CardTitle>
			</CardHeader>
			<CardContent>
				<Form {...form}>
					<form
						onSubmit={form.handleSubmit(onSubmit)}
						className="space-y-4"
					>
						<FormField
							control={form.control}
							name="name"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Team Name</FormLabel>
									<FormControl>
										<Input {...field} />
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						<FormField
							control={form.control}
							name="description"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Description</FormLabel>
									<FormControl>
										<Textarea rows={3} {...field} />
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						<FormField
							control={form.control}
							name="isOpen"
							render={({ field }) => (
								<FormItem className="flex items-center justify-between rounded-lg border p-4">
									<div className="space-y-0.5">
										<FormLabel className="text-base">
											Open Team
										</FormLabel>
										<FormDescription>
											Open teams can receive join requests.
										</FormDescription>
									</div>
									<FormControl>
										<Switch
											checked={field.value}
											onCheckedChange={field.onChange}
										/>
									</FormControl>
								</FormItem>
							)}
						/>

						<Button
							type="submit"
							disabled={form.formState.isSubmitting}
						>
							{form.formState.isSubmitting
								? "Saving..."
								: "Save Settings"}
						</Button>
					</form>
				</Form>
			</CardContent>
		</Card>
	);
}

function ProblemSelection({
	teamId,
	currentProblemIds,
	problems,
	onSave,
}: {
	teamId: Id<"teams">;
	currentProblemIds: Id<"problems">[];
	problems:
		| Array<{
				_id: Id<"problems">;
				title: string;
				status: string;
		  }>
		| undefined;
	onSave: (args: {
		teamId: Id<"teams">;
		problemIds: Id<"problems">[];
	}) => Promise<unknown>;
}) {
	const [selected, setSelected] = useState<Id<"problems">[]>(
		() => currentProblemIds,
	);
	const [saving, setSaving] = useState(false);

	// Filter to only approved problems
	const approvedProblems = problems?.filter((p) => p.status === "approved");

	function toggleProblem(problemId: Id<"problems">) {
		setSelected((prev) =>
			prev.includes(problemId)
				? prev.filter((id) => id !== problemId)
				: [...prev, problemId],
		);
	}

	async function handleSave() {
		setSaving(true);
		try {
			await onSave({ teamId, problemIds: selected });
			toast.success("Problem selection updated");
		} catch (err) {
			toast.error(
				err instanceof Error
					? err.message
					: "Failed to update problem selection",
			);
		} finally {
			setSaving(false);
		}
	}

	return (
		<Card>
			<CardHeader>
				<CardTitle className="text-lg">Problem Selection</CardTitle>
				<CardDescription>
					Select which problems your team will work on.
				</CardDescription>
			</CardHeader>
			<CardContent>
				{approvedProblems === undefined ? (
					<p className="text-sm text-muted-foreground">Loading...</p>
				) : approvedProblems.length === 0 ? (
					<p className="text-sm text-muted-foreground">
						No approved problems available yet.
					</p>
				) : (
					<div className="space-y-3">
						{approvedProblems.map((problem) => (
							<label
								key={problem._id}
								className="flex items-center gap-3 rounded-md border p-3 cursor-pointer hover:bg-muted/50"
							>
								<Checkbox
									checked={selected.includes(problem._id)}
									onCheckedChange={() =>
										toggleProblem(problem._id)
									}
								/>
								<span className="text-sm">
									{problem.title}
								</span>
							</label>
						))}
						<Button
							onClick={handleSave}
							disabled={saving}
							className="mt-2"
						>
							{saving ? "Saving..." : "Save Selection"}
						</Button>
					</div>
				)}
			</CardContent>
		</Card>
	);
}
