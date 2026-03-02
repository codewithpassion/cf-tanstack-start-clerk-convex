import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../../../../convex/_generated/api";
import type { Id } from "../../../../../../../convex/_generated/dataModel";
import { useState } from "react";
import { toast } from "sonner";
import { Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
	Card,
	CardContent,
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
import {
	Avatar,
	AvatarFallback,
	AvatarImage,
} from "@/components/ui/avatar";

export const Route = createFileRoute(
	"/_authed/hackathons/$id/teams/$teamId/",
)({
	component: TeamDetailPage,
});

function TeamDetailPage() {
	const { id, teamId } = Route.useParams();
	const hackathonId = id as Id<"hackathons">;
	const teamDocId = teamId as Id<"teams">;

	const team = useQuery(api.teams.getById, { id: teamDocId });
	const myTeam = useQuery(api.teams.getMyTeam, { hackathonId });
	const requestToJoin = useMutation(api.teams.requestToJoin);
	const myRequests = useQuery(api.teamManagement.getMyJoinRequests, {
		hackathonId,
	});

	const [message, setMessage] = useState("");
	const [dialogOpen, setDialogOpen] = useState(false);
	const [submitting, setSubmitting] = useState(false);

	if (team === undefined) {
		return (
			<div className="max-w-3xl mx-auto space-y-4">
				<Skeleton className="h-8 w-48" />
				<Skeleton className="h-48" />
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

	const hasPendingRequest = myRequests?.some(
		(r) => r.teamId === team._id && r.status === "pending",
	);
	const canRequest = !myTeam && team.isOpen && !hasPendingRequest;

	async function handleRequest() {
		setSubmitting(true);
		try {
			await requestToJoin({
				teamId: teamDocId,
				hackathonId,
				message: message.trim() || undefined,
			});
			setDialogOpen(false);
			setMessage("");
			toast.success("Join request sent!");
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
		<div className="max-w-3xl mx-auto space-y-6">
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-2xl font-bold">{team.name}</h1>
					{team.description && (
						<p className="text-muted-foreground mt-1">
							{team.description}
						</p>
					)}
				</div>
				<div className="flex items-center gap-2">
					<Badge variant={team.isOpen ? "default" : "secondary"}>
						{team.isOpen ? "Open" : "Closed"}
					</Badge>
					{hasPendingRequest && (
						<Badge variant="outline">Request Pending</Badge>
					)}
				</div>
			</div>

			{/* Members */}
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
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
								</div>
								{member.isLeader && (
									<Badge variant="outline" className="text-xs">
										Leader
									</Badge>
								)}
							</div>
						))}
					</div>
				</CardContent>
			</Card>

			{/* Problems */}
			{team.problemIds.length > 0 && (
				<Card>
					<CardHeader>
						<CardTitle>Selected Problems</CardTitle>
					</CardHeader>
					<CardContent>
						<p className="text-sm text-muted-foreground">
							This team is working on {team.problemIds.length}{" "}
							problem
							{team.problemIds.length === 1 ? "" : "s"}.
						</p>
					</CardContent>
				</Card>
			)}

			{/* Request to Join */}
			{canRequest && (
				<Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
					<DialogTrigger asChild>
						<Button className="w-full">Request to Join</Button>
					</DialogTrigger>
					<DialogContent>
						<DialogHeader>
							<DialogTitle>Join {team.name}</DialogTitle>
						</DialogHeader>
						<Textarea
							placeholder="Optional message to the team leader..."
							value={message}
							onChange={(e) => setMessage(e.target.value)}
							rows={3}
						/>
						<DialogFooter>
							<Button
								variant="outline"
								onClick={() => setDialogOpen(false)}
							>
								Cancel
							</Button>
							<Button
								onClick={handleRequest}
								disabled={submitting}
							>
								{submitting ? "Sending..." : "Send Request"}
							</Button>
						</DialogFooter>
					</DialogContent>
				</Dialog>
			)}
		</div>
	);
}
