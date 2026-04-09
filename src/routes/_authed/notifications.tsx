import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import {
	Bell,
	CheckCheck,
	Trash2,
	MessageSquare,
	Users,
	Trophy,
	FileCheck,
	HelpCircle,
	Clock,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { timeAgo } from "@/lib/time";

export const Route = createFileRoute("/_authed/notifications")({
	component: NotificationsPage,
});

const typeIcons: Record<string, React.ReactNode> = {
	team_invite: <Users className="h-4 w-4" />,
	join_request: <Users className="h-4 w-4" />,
	submission_approved: <FileCheck className="h-4 w-4" />,
	problem_approved: <FileCheck className="h-4 w-4" />,
	result_published: <Trophy className="h-4 w-4" />,
	qa_answered: <HelpCircle className="h-4 w-4" />,
	deadline_reminder: <Clock className="h-4 w-4" />,
};

function NotificationsPage() {
	const [filter, setFilter] = useState<"all" | "unread">("all");
	const [limit, setLimit] = useState(20);

	const notifications = useQuery(api.notifications.listForUser, { limit });
	const unreadCount = useQuery(api.notifications.getUnreadCount);
	const markAsRead = useMutation(api.notifications.markAsRead);
	const markAllAsRead = useMutation(api.notifications.markAllAsRead);
	const deleteNotification = useMutation(api.notifications.deleteNotification);

	const filtered =
		filter === "unread"
			? notifications?.filter((n) => !n.isRead)
			: notifications;

	return (
		<div className="max-w-2xl mx-auto space-y-6">
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-3">
					<h1 className="text-2xl font-bold">Notifications</h1>
					{(unreadCount ?? 0) > 0 && (
						<Badge variant="destructive">{unreadCount} unread</Badge>
					)}
				</div>
				{(unreadCount ?? 0) > 0 && (
					<Button variant="outline" size="sm" onClick={() => markAllAsRead()}>
						<CheckCheck className="mr-2 h-4 w-4" />
						Mark all as read
					</Button>
				)}
			</div>

			<div className="flex gap-2">
				<Button
					variant={filter === "all" ? "default" : "outline"}
					size="sm"
					onClick={() => setFilter("all")}
				>
					All
				</Button>
				<Button
					variant={filter === "unread" ? "default" : "outline"}
					size="sm"
					onClick={() => setFilter("unread")}
				>
					Unread
				</Button>
			</div>

			<div className="space-y-2">
				{filtered?.length === 0 && (
					<Card>
						<CardContent className="flex flex-col items-center justify-center py-12">
							<Bell className="h-10 w-10 text-muted-foreground mb-3" />
							<p className="text-muted-foreground">No notifications yet</p>
						</CardContent>
					</Card>
				)}

				{filtered?.map((n) => (
					<Card
						key={n._id}
						className={!n.isRead ? "border-primary/30 bg-accent/20" : ""}
					>
						<CardContent className="flex items-start gap-3 py-3">
							<div className="mt-0.5 text-muted-foreground">
								{typeIcons[n.type] ?? (
									<MessageSquare className="h-4 w-4" />
								)}
							</div>
							<div className="flex-1 min-w-0">
								<div className="flex items-start justify-between gap-2">
									<div>
										<p className="text-sm font-medium">{n.title}</p>
										<p className="text-sm text-muted-foreground mt-0.5">
											{n.message}
										</p>
									</div>
									{!n.isRead && (
										<div className="h-2 w-2 rounded-full bg-primary shrink-0 mt-1.5" />
									)}
								</div>
								<div className="flex items-center gap-2 mt-2">
									<span className="text-xs text-muted-foreground">
										{timeAgo(n.createdAt)}
									</span>
									{!n.isRead && (
										<>
											<Separator orientation="vertical" className="h-3" />
											<Button
												variant="ghost"
												size="sm"
												className="h-auto p-0 text-xs"
												onClick={() =>
													markAsRead({ notificationId: n._id })
												}
											>
												Mark as read
											</Button>
										</>
									)}
								</div>
							</div>
							<Button
								variant="ghost"
								size="icon"
								className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
								onClick={() =>
									deleteNotification({ notificationId: n._id })
								}
							>
								<Trash2 className="h-3.5 w-3.5" />
							</Button>
						</CardContent>
					</Card>
				))}

				{notifications && notifications.length >= limit && (
					<div className="flex justify-center pt-2">
						<Button
							variant="outline"
							size="sm"
							onClick={() => setLimit((l) => l + 20)}
						>
							Load more
						</Button>
					</div>
				)}
			</div>
		</div>
	);
}
