import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation } from "convex/react";
import { useAuth } from "@clerk/tanstack-react-start";
import { api } from "../../../convex/_generated/api";
import { toast } from "sonner";
import { useState } from "react";

import {
	Card,
	CardContent,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getRoleDisplayName } from "@/lib/hackathon-permissions";

export const Route = createFileRoute("/invite/$token")({
	component: InvitePage,
});

function InvitePage() {
	const { token } = Route.useParams();
	const { isSignedIn } = useAuth();
	const navigate = useNavigate();
	const [accepting, setAccepting] = useState(false);

	const invitation = useQuery(api.hackathonRoles.getInvitationByToken, {
		token,
	});
	const acceptInvitation = useMutation(api.hackathonRoles.acceptInvitation);

	if (invitation === undefined) {
		return (
			<div className="mx-auto mt-20 max-w-md">
				<Card>
					<CardContent className="py-8 text-center text-muted-foreground">
						Loading invitation...
					</CardContent>
				</Card>
			</div>
		);
	}

	if (invitation === null) {
		return (
			<div className="mx-auto mt-20 max-w-md">
				<Card>
					<CardContent className="py-8 text-center text-muted-foreground">
						Invitation not found or has been removed.
					</CardContent>
				</Card>
			</div>
		);
	}

	const isExpired = invitation.expiresAt < Date.now();
	const isUsable = invitation.status === "pending" && !isExpired;

	async function handleAccept() {
		setAccepting(true);
		try {
			const result = await acceptInvitation({ token });
			toast.success("Invitation accepted!");
			navigate({
				to: `/hackathons/${result.hackathonId}/dashboard`,
			});
		} catch (err) {
			toast.error(
				err instanceof Error ? err.message : "Failed to accept invitation",
			);
			setAccepting(false);
		}
	}

	return (
		<div className="mx-auto mt-20 max-w-md">
			<Card>
				<CardHeader>
					<CardTitle>Hackathon Invitation</CardTitle>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="space-y-2">
						<div className="flex justify-between">
							<span className="text-muted-foreground">Hackathon</span>
							<span className="font-medium">
								{invitation.hackathonName}
							</span>
						</div>
						<div className="flex justify-between">
							<span className="text-muted-foreground">Role</span>
							<Badge variant="secondary">
								{getRoleDisplayName(invitation.role)}
							</Badge>
						</div>
						{invitation.inviterName && (
							<div className="flex justify-between">
								<span className="text-muted-foreground">
									Invited by
								</span>
								<span>{invitation.inviterName}</span>
							</div>
						)}
						<div className="flex justify-between">
							<span className="text-muted-foreground">Status</span>
							<Badge
								variant={isUsable ? "default" : "destructive"}
							>
								{isExpired
									? "Expired"
									: invitation.status.charAt(0).toUpperCase() +
										invitation.status.slice(1)}
							</Badge>
						</div>
					</div>
				</CardContent>
				<CardFooter>
					{!isUsable ? (
						<p className="text-sm text-muted-foreground">
							This invitation is no longer valid.
						</p>
					) : !isSignedIn ? (
						<Button asChild className="w-full">
							<a href={`/sign-in?redirect=/invite/${token}`}>
								Sign in to accept
							</a>
						</Button>
					) : (
						<Button
							className="w-full"
							onClick={handleAccept}
							disabled={accepting}
						>
							{accepting ? "Accepting..." : "Accept Invitation"}
						</Button>
					)}
				</CardFooter>
			</Card>
		</div>
	);
}
