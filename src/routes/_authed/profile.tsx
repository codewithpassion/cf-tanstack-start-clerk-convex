import { createFileRoute, Link } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { auth } from "@clerk/tanstack-react-start/server";
import { useUser } from "@clerk/tanstack-react-start";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useState, useEffect } from "react";
import { Server, Settings } from "lucide-react";

import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
	CardDescription,
} from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

const getUserData = createServerFn({ method: "GET" }).handler(async () => {
	const { userId } = await auth();

	return {
		userId,
		serverMessage: "This data was fetched from the server",
	};
});

export const Route = createFileRoute("/_authed/profile")({
	component: ProfilePage,
	loader: async () => {
		const data = await getUserData();
		return data;
	},
});

function ProfilePage() {
	const { user, isLoaded } = useUser();
	const loaderData = Route.useLoaderData();

	const profile = useQuery(api.userProfiles.getMyProfile);
	const updateProfile = useMutation(api.userProfiles.updateProfile);

	const [bio, setBio] = useState("");
	const [location, setLocation] = useState("");
	const [skillsInput, setSkillsInput] = useState("");
	const [githubUrl, setGithubUrl] = useState("");
	const [linkedinUrl, setLinkedinUrl] = useState("");
	const [portfolioUrl, setPortfolioUrl] = useState("");
	const [saving, setSaving] = useState(false);
	const [initialized, setInitialized] = useState(false);

	useEffect(() => {
		if (profile && !initialized) {
			setBio(profile.bio ?? "");
			setLocation(profile.location ?? "");
			setSkillsInput(profile.skills?.join(", ") ?? "");
			setGithubUrl(profile.githubUrl ?? "");
			setLinkedinUrl(profile.linkedinUrl ?? "");
			setPortfolioUrl(profile.portfolioUrl ?? "");
			setInitialized(true);
		}
		// If profile is null (not set yet), mark as initialized so we don't wait forever
		if (profile === null && !initialized) {
			setInitialized(true);
		}
	}, [profile, initialized]);

	const handleSaveProfile = async () => {
		setSaving(true);
		try {
			const skills = skillsInput
				.split(",")
				.map((s) => s.trim())
				.filter(Boolean);
			await updateProfile({
				bio: bio || undefined,
				location: location || undefined,
				skills: skills.length > 0 ? skills : undefined,
				githubUrl: githubUrl || undefined,
				linkedinUrl: linkedinUrl || undefined,
				portfolioUrl: portfolioUrl || undefined,
			});
		} finally {
			setSaving(false);
		}
	};

	if (!isLoaded) {
		return (
			<div className="max-w-2xl mx-auto p-6">
				<Skeleton className="h-10 w-48 mb-6" />
				<Skeleton className="h-48 mb-6" />
				<Skeleton className="h-32" />
			</div>
		);
	}

	return (
		<div className="max-w-2xl mx-auto space-y-6">
			<div className="flex items-center justify-between">
				<h1 className="text-3xl font-bold">User Profile</h1>
				<Link to="/profile/preferences">
					<Button variant="outline" size="sm">
						<Settings className="mr-2 h-4 w-4" />
						Notification Preferences
					</Button>
				</Link>
			</div>

			<Card>
				<CardHeader>
					<CardTitle>Account Info</CardTitle>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="flex items-center justify-between">
						<span className="text-muted-foreground">Name</span>
						<span className="font-medium">
							{user?.fullName || "Not provided"}
						</span>
					</div>
					<Separator />
					<div className="flex items-center justify-between">
						<span className="text-muted-foreground">Email</span>
						<span className="font-medium">
							{user?.primaryEmailAddress?.emailAddress || "Not provided"}
						</span>
					</div>
					<Separator />
					<div className="flex items-center justify-between">
						<span className="text-muted-foreground">User ID</span>
						<code className="text-xs bg-muted px-2 py-1 rounded">
							{user?.id}
						</code>
					</div>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>Extended Profile</CardTitle>
					<CardDescription>
						Add more details to your public profile.
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="space-y-2">
						<Label htmlFor="bio">Bio</Label>
						<Textarea
							id="bio"
							placeholder="Tell us about yourself..."
							value={bio}
							onChange={(e) => setBio(e.target.value)}
							rows={3}
						/>
					</div>

					<div className="space-y-2">
						<Label htmlFor="location">Location</Label>
						<Input
							id="location"
							placeholder="City, Country"
							value={location}
							onChange={(e) => setLocation(e.target.value)}
						/>
					</div>

					<div className="space-y-2">
						<Label htmlFor="skills">Skills</Label>
						<Input
							id="skills"
							placeholder="React, TypeScript, Python (comma-separated)"
							value={skillsInput}
							onChange={(e) => setSkillsInput(e.target.value)}
						/>
						{skillsInput && (
							<div className="flex flex-wrap gap-1 mt-1">
								{skillsInput
									.split(",")
									.map((s) => s.trim())
									.filter(Boolean)
									.map((skill) => (
										<Badge key={skill} variant="secondary">
											{skill}
										</Badge>
									))}
							</div>
						)}
					</div>

					<Separator />

					<div className="space-y-2">
						<Label htmlFor="github">GitHub URL</Label>
						<Input
							id="github"
							placeholder="https://github.com/username"
							value={githubUrl}
							onChange={(e) => setGithubUrl(e.target.value)}
						/>
					</div>

					<div className="space-y-2">
						<Label htmlFor="linkedin">LinkedIn URL</Label>
						<Input
							id="linkedin"
							placeholder="https://linkedin.com/in/username"
							value={linkedinUrl}
							onChange={(e) => setLinkedinUrl(e.target.value)}
						/>
					</div>

					<div className="space-y-2">
						<Label htmlFor="portfolio">Portfolio URL</Label>
						<Input
							id="portfolio"
							placeholder="https://yoursite.com"
							value={portfolioUrl}
							onChange={(e) => setPortfolioUrl(e.target.value)}
						/>
					</div>

					<div className="flex justify-end pt-2">
						<Button onClick={handleSaveProfile} disabled={saving}>
							{saving ? "Saving..." : "Save Profile"}
						</Button>
					</div>
				</CardContent>
			</Card>

			<Alert>
				<Server className="h-4 w-4" />
				<AlertTitle>Server-Side Data</AlertTitle>
				<AlertDescription>
					<div className="space-y-2 mt-2">
						<div className="flex items-center justify-between">
							<span>User ID from server:</span>
							<code className="text-xs bg-muted px-2 py-1 rounded">
								{loaderData.userId}
							</code>
						</div>
						<div className="flex items-center justify-between">
							<span>Message:</span>
							<span>{loaderData.serverMessage}</span>
						</div>
					</div>
				</AlertDescription>
			</Alert>
		</div>
	);
}
