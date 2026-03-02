import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Bell, Check, CheckCheck } from "lucide-react";
import { Link } from "@tanstack/react-router";

import { Button } from "@/components/ui/button";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { timeAgo } from "@/lib/time";

export function NotificationBell() {
	const unreadCount = useQuery(api.notifications.getUnreadCount);
	const notifications = useQuery(api.notifications.listForUser, {
		limit: 10,
	});
	const markAsRead = useMutation(api.notifications.markAsRead);
	const markAllAsRead = useMutation(api.notifications.markAllAsRead);

	return (
		<Popover>
			<PopoverTrigger asChild>
				<Button variant="ghost" size="icon" className="relative">
					<Bell className="h-5 w-5" />
					{(unreadCount ?? 0) > 0 && (
						<span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-medium text-destructive-foreground">
							{unreadCount}
						</span>
					)}
					<span className="sr-only">Notifications</span>
				</Button>
			</PopoverTrigger>
			<PopoverContent className="w-80 p-0" align="end">
				<div className="flex items-center justify-between p-3">
					<h4 className="text-sm font-semibold">Notifications</h4>
					{(unreadCount ?? 0) > 0 && (
						<Button
							variant="ghost"
							size="sm"
							className="h-auto p-1 text-xs"
							onClick={() => markAllAsRead()}
						>
							<CheckCheck className="mr-1 h-3 w-3" />
							Mark all read
						</Button>
					)}
				</div>
				<Separator />
				<div className="max-h-80 overflow-y-auto">
					{notifications?.length === 0 && (
						<p className="p-4 text-center text-sm text-muted-foreground">
							No notifications yet
						</p>
					)}
					{notifications?.map((n) => {
						const content = (
							<div
								className={`flex items-start gap-3 p-3 hover:bg-accent/50 transition-colors ${!n.isRead ? "bg-accent/30" : ""}`}
							>
								<div className="flex-1 min-w-0">
									<p className="text-sm font-medium leading-tight">
										{n.title}
									</p>
									<p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
										{n.message}
									</p>
									<p className="text-xs text-muted-foreground mt-1">
										{timeAgo(n.createdAt)}
									</p>
								</div>
								{!n.isRead && (
									<Button
										variant="ghost"
										size="icon"
										className="h-6 w-6 shrink-0"
										onClick={(e) => {
											e.preventDefault();
											e.stopPropagation();
											markAsRead({
												notificationId: n._id,
											});
										}}
									>
										<Check className="h-3 w-3" />
									</Button>
								)}
							</div>
						);

						if (n.actionUrl) {
							return (
								<Link
									key={n._id}
									to={n.actionUrl}
									onClick={() => {
										if (!n.isRead) {
											markAsRead({
												notificationId: n._id,
											});
										}
									}}
								>
									{content}
								</Link>
							);
						}

						return <div key={n._id}>{content}</div>;
					})}
				</div>
				<Separator />
				<div className="p-2">
					<Link to="/notifications">
						<Button
							variant="ghost"
							size="sm"
							className="w-full text-xs"
						>
							View all notifications
						</Button>
					</Link>
				</div>
			</PopoverContent>
		</Popover>
	);
}
