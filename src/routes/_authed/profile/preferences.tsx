import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useState, useEffect } from "react";

import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

export const Route = createFileRoute("/_authed/profile/preferences")({
	component: PreferencesPage,
});

interface ChannelPrefs {
	email: boolean;
	inApp: boolean;
}

interface AllPreferences {
	deadlineReminders: ChannelPrefs;
	approvalNotifications: ChannelPrefs;
	resultAnnouncements: ChannelPrefs;
	teamInvitations: ChannelPrefs;
	qnaUpdates: ChannelPrefs;
}

const sections: {
	key: keyof AllPreferences;
	title: string;
	description: string;
}[] = [
	{
		key: "deadlineReminders",
		title: "Deadline Reminders",
		description: "Reminders about upcoming hackathon deadlines",
	},
	{
		key: "approvalNotifications",
		title: "Approval Notifications",
		description: "When your submissions or problems are approved or rejected",
	},
	{
		key: "resultAnnouncements",
		title: "Result Announcements",
		description: "When hackathon results are published",
	},
	{
		key: "teamInvitations",
		title: "Team Invitations",
		description: "When someone invites you to join their team",
	},
	{
		key: "qnaUpdates",
		title: "Q&A Updates",
		description: "When your questions receive answers",
	},
];

function PreferencesPage() {
	const preferences = useQuery(api.notifications.getPreferences);
	const updatePreferences = useMutation(api.notifications.updatePreferences);
	const [prefs, setPrefs] = useState<AllPreferences | null>(null);
	const [saving, setSaving] = useState(false);

	useEffect(() => {
		if (preferences && !prefs) {
			setPrefs(preferences);
		}
	}, [preferences, prefs]);

	const handleToggle = (
		section: keyof AllPreferences,
		channel: "email" | "inApp",
	) => {
		if (!prefs) return;
		setPrefs({
			...prefs,
			[section]: {
				...prefs[section],
				[channel]: !prefs[section][channel],
			},
		});
	};

	const handleSave = async () => {
		if (!prefs) return;
		setSaving(true);
		try {
			await updatePreferences(prefs);
		} finally {
			setSaving(false);
		}
	};

	if (!prefs) {
		return (
			<div className="max-w-2xl mx-auto">
				<h1 className="text-2xl font-bold mb-6">Notification Preferences</h1>
				<p className="text-muted-foreground">Loading...</p>
			</div>
		);
	}

	return (
		<div className="max-w-2xl mx-auto space-y-6">
			<h1 className="text-2xl font-bold">Notification Preferences</h1>

			<Card>
				<CardHeader>
					<CardTitle>Manage Notifications</CardTitle>
					<CardDescription>
						Choose how you want to be notified for each type of activity.
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-6">
					{sections.map((section, i) => (
						<div key={section.key}>
							{i > 0 && <Separator className="mb-6" />}
							<div className="space-y-3">
								<div>
									<h3 className="text-sm font-medium">{section.title}</h3>
									<p className="text-xs text-muted-foreground">
										{section.description}
									</p>
								</div>
								<div className="flex items-center gap-6">
									<div className="flex items-center gap-2">
										<Switch
											id={`${section.key}-inApp`}
											checked={prefs[section.key].inApp}
											onCheckedChange={() =>
												handleToggle(section.key, "inApp")
											}
										/>
										<Label htmlFor={`${section.key}-inApp`}>In-App</Label>
									</div>
									<div className="flex items-center gap-2">
										<Switch
											id={`${section.key}-email`}
											checked={prefs[section.key].email}
											onCheckedChange={() =>
												handleToggle(section.key, "email")
											}
										/>
										<Label htmlFor={`${section.key}-email`}>Email</Label>
									</div>
								</div>
							</div>
						</div>
					))}
				</CardContent>
			</Card>

			<div className="flex justify-end">
				<Button onClick={handleSave} disabled={saving}>
					{saving ? "Saving..." : "Save Preferences"}
				</Button>
			</div>
		</div>
	);
}
