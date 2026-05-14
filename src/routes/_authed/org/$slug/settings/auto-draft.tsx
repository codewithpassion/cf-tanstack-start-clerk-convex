import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery } from "convex/react";
import { ConvexError } from "convex/values";
import { useEffect, useState } from "react";
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
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";

export const Route = createFileRoute("/_authed/org/$slug/settings/auto-draft")({
	component: AutoDraftSettings,
});

const MINUTE_OPTIONS = [0, 15, 30, 45];

function getTimezones(): string[] {
	try {
		// Intl.supportedValuesOf is widely supported in modern browsers + V8.
		const fn = (Intl as unknown as {
			supportedValuesOf?: (key: string) => string[];
		}).supportedValuesOf;
		if (typeof fn === "function") {
			return fn("timeZone");
		}
	} catch {
		// fall through
	}
	return [];
}

function nextRunEstimate(
	enabled: boolean,
	hour: number,
	minute: number,
): string {
	if (!enabled) return "Not scheduled";
	const now = new Date();
	const next = new Date(now);
	next.setUTCSeconds(0, 0);
	next.setUTCHours(hour, minute, 0, 0);
	if (next.getTime() <= now.getTime()) {
		next.setUTCDate(next.getUTCDate() + 1);
	}
	return `${next.toLocaleString(undefined, {
		weekday: "short",
		month: "short",
		day: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	})} (your local time)`;
}

function parseCron(cron: string | undefined): { hour: number; minute: number } {
	if (!cron) return { hour: 6, minute: 0 };
	const parts = cron.trim().split(/\s+/);
	const minute = Number(parts[0]);
	const hour = Number(parts[1]);
	return {
		hour: Number.isFinite(hour) ? hour : 6,
		minute: Number.isFinite(minute) ? minute : 0,
	};
}

function AutoDraftSettings() {
	const org = useOrg();
	const isAdmin = org.role === "admin";
	const schedule = useQuery(api.autoDrafts.getSchedule, { orgId: org.orgId });
	const upsert = useMutation(api.autoDrafts.upsertSchedule);
	const [enabled, setEnabled] = useState(false);
	const [hour, setHour] = useState(6);
	const [minute, setMinute] = useState(0);
	const [timezone, setTimezone] = useState("UTC");
	const [status, setStatus] = useState<string | null>(null);
	const [saving, setSaving] = useState(false);
	const timezones = getTimezones();

	useEffect(() => {
		if (schedule === undefined) return;
		if (schedule === null) {
			setEnabled(false);
			setHour(6);
			setMinute(0);
			setTimezone(
				Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
			);
			return;
		}
		setEnabled(schedule.enabled);
		const parsed = parseCron(schedule.cron);
		setHour(parsed.hour);
		setMinute(parsed.minute);
		setTimezone(schedule.timezone ?? "UTC");
	}, [schedule]);

	if (!isAdmin) {
		return (
			<div className="space-y-4">
				<h1 className="text-3xl font-bold">Auto-draft</h1>
				<p className="text-muted-foreground">
					Only admins can configure the auto-draft schedule.
				</p>
				<Button asChild variant="outline">
					<Link to="/org/$slug/dashboard" params={{ slug: org.slug }}>
						Back to dashboard
					</Link>
				</Button>
			</div>
		);
	}

	const onSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setSaving(true);
		setStatus(null);
		try {
			await upsert({
				orgId: org.orgId,
				enabled,
				hour,
				minute,
				timezone: timezone || undefined,
			});
			setStatus("Saved");
		} catch (err) {
			setStatus(
				err instanceof ConvexError
					? typeof err.data === "string"
						? err.data
						: "Failed to save"
					: err instanceof Error
						? err.message
						: "Failed to save",
			);
		} finally {
			setSaving(false);
		}
	};

	if (schedule === undefined) {
		return (
			<div className="flex items-center justify-center py-12">
				<Spinner />
			</div>
		);
	}

	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-3xl font-bold">Auto-draft</h1>
				<p className="text-muted-foreground mt-1">
					Generate a draft newsletter on a daily schedule from the most recent
					unused stories.
				</p>
			</div>

			<Card>
				<CardHeader>
					<CardTitle>Schedule</CardTitle>
					<CardDescription>
						The cron runs at the chosen hour and minute (UTC). Recent unused
						entries from the last 7 days are bundled into a new draft and
						placed in the "ready" state, waiting for review on the dashboard.
					</CardDescription>
				</CardHeader>
				<CardContent>
					<form onSubmit={onSubmit} className="space-y-5">
						<div className="flex items-center gap-3">
							<Switch
								id="enabled"
								checked={enabled}
								onCheckedChange={setEnabled}
							/>
							<Label htmlFor="enabled">Enable auto-draft</Label>
						</div>

						<div className="grid grid-cols-2 gap-3 max-w-sm">
							<div className="space-y-1.5">
								<Label htmlFor="hour">Hour (UTC)</Label>
								<Select
									value={String(hour)}
									onValueChange={(v) => setHour(Number(v))}
								>
									<SelectTrigger id="hour">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										{Array.from({ length: 24 }, (_, i) => i).map((h) => (
											<SelectItem key={h} value={String(h)}>
												{String(h).padStart(2, "0")}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
							<div className="space-y-1.5">
								<Label htmlFor="minute">Minute</Label>
								<Select
									value={String(minute)}
									onValueChange={(v) => setMinute(Number(v))}
								>
									<SelectTrigger id="minute">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										{MINUTE_OPTIONS.map((m) => (
											<SelectItem key={m} value={String(m)}>
												{String(m).padStart(2, "0")}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
						</div>

						<div className="space-y-1.5 max-w-sm">
							<Label htmlFor="timezone">Timezone (informational)</Label>
							{timezones.length > 0 ? (
								<Select value={timezone} onValueChange={setTimezone}>
									<SelectTrigger id="timezone">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										{timezones.map((tz) => (
											<SelectItem key={tz} value={tz}>
												{tz}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							) : (
								<Input
									id="timezone"
									value={timezone}
									onChange={(e) => setTimezone(e.target.value)}
								/>
							)}
							<p className="text-xs text-muted-foreground">
								Stored alongside the schedule for context. The cron schedule
								itself runs in UTC.
							</p>
						</div>

						<div className="text-sm text-muted-foreground">
							Next run at: {nextRunEstimate(enabled, hour, minute)}
						</div>

						{status && (
							<p className="text-sm text-muted-foreground">{status}</p>
						)}

						<Button type="submit" disabled={saving}>
							{saving ? "Saving…" : "Save schedule"}
						</Button>
					</form>
				</CardContent>
			</Card>
		</div>
	);
}
