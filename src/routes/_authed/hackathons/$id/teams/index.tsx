import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../../../convex/_generated/api";
import type { Id } from "../../../../../../convex/_generated/dataModel";
import { useState } from "react";
import { toast } from "sonner";
import { Users, Plus, KeyRound } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
	DialogFooter,
} from "@/components/ui/dialog";

export const Route = createFileRoute(
	"/_authed/hackathons/$id/teams/",
)({
	component: TeamsIndexPage,
});

function TeamsIndexPage() {
	const { id } = Route.useParams();
	const hackathonId = id as Id<"hackathons">;

	const myTeam = useQuery(api.teams.getMyTeam, { hackathonId });
	const openTeams = useQuery(api.teams.listOpenTeams, { hackathonId });
	const myRequests = useQuery(api.teamManagement.getMyJoinRequests, {
		hackathonId,
	});

	const joinByCode = useMutation(api.teams.joinByInviteCode);

	const [inviteCode, setInviteCode] = useState("");
	const [joiningByCode, setJoiningByCode] = useState(false);

	async function handleJoinByCode() {
		if (!inviteCode.trim()) return;
		setJoiningByCode(true);
		try {
			await joinByCode({
				hackathonId,
				inviteCode: inviteCode.trim().toUpperCase(),
			});
			toast.success("Joined team successfully!");
			setInviteCode("");
		} catch (err) {
			toast.error(
				err instanceof Error ? err.message : "Failed to join team",
			);
		} finally {
			setJoiningByCode(false);
		}
	}

	return (
		<div className="max-w-4xl mx-auto space-y-6">
			<div className="flex items-center justify-between">
				<h1 className="text-2xl font-bold">Teams</h1>
				{myTeam === null && (
					<Button asChild>
						<Link
							to="/hackathons/$id/teams/new"
							params={{ id }}
						>
							<Plus className="mr-2 h-4 w-4" />
							Create Team
						</Link>
					</Button>
				)}
			</div>

			{/* My Team */}
			{myTeam === undefined ? (
				<Skeleton className="h-32" />
			) : myTeam ? (
				<Card className="border-primary/30">
					<CardHeader>
						<div className="flex items-center justify-between">
							<CardTitle>My Team: {myTeam.name}</CardTitle>
							<Badge variant="default">Member</Badge>
						</div>
						{myTeam.description && (
							<CardDescription>
								{myTeam.description}
							</CardDescription>
						)}
					</CardHeader>
					<CardContent className="flex gap-4">
						<Button asChild variant="outline">
							<Link
								to="/hackathons/$id/teams/$teamId"
								params={{ id, teamId: myTeam._id }}
							>
								View Team
							</Link>
						</Button>
						<Button asChild>
							<Link
								to="/hackathons/$id/teams/$teamId/manage"
								params={{ id, teamId: myTeam._id }}
							>
								Manage Team
							</Link>
						</Button>
					</CardContent>
				</Card>
			) : (
				<>
					{/* Join by Invite Code */}
					<Card>
						<CardHeader>
							<CardTitle className="flex items-center gap-2 text-lg">
								<KeyRound className="h-5 w-5" />
								Join by Invite Code
							</CardTitle>
						</CardHeader>
						<CardContent>
							<div className="flex gap-2">
								<Input
									placeholder="Enter invite code"
									value={inviteCode}
									onChange={(e) =>
										setInviteCode(e.target.value)
									}
									className="max-w-xs uppercase"
								/>
								<Button
									onClick={handleJoinByCode}
									disabled={
										joiningByCode || !inviteCode.trim()
									}
								>
									{joiningByCode ? "Joining..." : "Join"}
								</Button>
							</div>
						</CardContent>
					</Card>

					{/* Pending Requests */}
					{myRequests && myRequests.length > 0 && (
						<Card>
							<CardHeader>
								<CardTitle className="text-lg">
									My Join Requests
								</CardTitle>
							</CardHeader>
							<CardContent>
								<div className="space-y-2">
									{myRequests.map((req) => (
										<div
											key={req._id}
											className="flex items-center justify-between rounded-md border p-3"
										>
											<span className="text-sm">
												{req.teamName}
											</span>
											<Badge
												variant={
													req.status === "pending"
														? "secondary"
														: req.status ===
															  "approved"
															? "default"
															: "destructive"
												}
											>
												{req.status}
											</Badge>
										</div>
									))}
								</div>
							</CardContent>
						</Card>
					)}
				</>
			)}

			{/* Open Teams */}
			<div>
				<h2 className="text-lg font-semibold mb-3">Open Teams</h2>
				{openTeams === undefined ? (
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						{[1, 2, 3].map((i) => (
							<Skeleton key={i} className="h-36" />
						))}
					</div>
				) : openTeams.length === 0 ? (
					<Card>
						<CardContent className="py-8 text-center text-muted-foreground">
							No open teams yet. Be the first to create one!
						</CardContent>
					</Card>
				) : (
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						{openTeams.map((team) => (
							<OpenTeamCard
								key={team._id}
								team={team}
								hackathonId={hackathonId}
								hasTeam={!!myTeam}
								hasPendingRequest={
									myRequests?.some(
										(r) =>
											r.teamId === team._id &&
											r.status === "pending",
									) ?? false
								}
								onRequestSent={() =>
									toast.success("Join request sent!")
								}
							/>
						))}
					</div>
				)}
			</div>
		</div>
	);
}

function OpenTeamCard({
	team,
	hackathonId,
	hasTeam,
	hasPendingRequest,
	onRequestSent,
}: {
	team: {
		_id: Id<"teams">;
		name: string;
		description?: string;
		memberCount: number;
		leaderName: string;
	};
	hackathonId: Id<"hackathons">;
	hasTeam: boolean;
	hasPendingRequest: boolean;
	onRequestSent: () => void;
}) {
	const requestToJoin = useMutation(api.teams.requestToJoin);
	const [message, setMessage] = useState("");
	const [open, setOpen] = useState(false);
	const [submitting, setSubmitting] = useState(false);

	async function handleRequest() {
		setSubmitting(true);
		try {
			await requestToJoin({
				teamId: team._id,
				hackathonId,
				message: message.trim() || undefined,
			});
			setOpen(false);
			setMessage("");
			onRequestSent();
		} catch (err) {
			toast.error(
				err instanceof Error
					? err.message
					: "Failed to send join request",
			);
		} finally {
			setSubmitting(false);
		}
	}

	return (
		<Card>
			<CardHeader>
				<CardTitle className="text-base">{team.name}</CardTitle>
				{team.description && (
					<CardDescription className="line-clamp-2">
						{team.description}
					</CardDescription>
				)}
			</CardHeader>
			<CardContent>
				<div className="flex items-center justify-between">
					<div className="text-sm text-muted-foreground space-y-1">
						<p className="flex items-center gap-1">
							<Users className="h-3.5 w-3.5" />
							{team.memberCount}{" "}
							{team.memberCount === 1 ? "member" : "members"}
						</p>
						<p>Led by {team.leaderName}</p>
					</div>
					{!hasTeam && !hasPendingRequest && (
						<Dialog open={open} onOpenChange={setOpen}>
							<DialogTrigger asChild>
								<Button size="sm">Request to Join</Button>
							</DialogTrigger>
							<DialogContent>
								<DialogHeader>
									<DialogTitle>
										Join {team.name}
									</DialogTitle>
								</DialogHeader>
								<Textarea
									placeholder="Optional message to the team leader..."
									value={message}
									onChange={(e) =>
										setMessage(e.target.value)
									}
									rows={3}
								/>
								<DialogFooter>
									<Button
										variant="outline"
										onClick={() => setOpen(false)}
									>
										Cancel
									</Button>
									<Button
										onClick={handleRequest}
										disabled={submitting}
									>
										{submitting
											? "Sending..."
											: "Send Request"}
									</Button>
								</DialogFooter>
							</DialogContent>
						</Dialog>
					)}
					{hasPendingRequest && (
						<Badge variant="secondary">Request Pending</Badge>
					)}
				</div>
			</CardContent>
		</Card>
	);
}
