import { auth } from "@clerk/tanstack-react-start/server";
import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { Newspaper, Sparkles, Users } from "lucide-react";
import { api } from "../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { getServerConvex } from "@/lib/convex-server";

const routeSignedInUser = createServerFn({ method: "GET" }).handler(
	async () => {
		const { userId } = await auth();
		if (!userId) return { signedIn: false as const };
		const convex = await getServerConvex();
		const orgs = await convex.query(api.organizations.listMine, {});
		return { signedIn: true as const, orgs };
	},
);

export const Route = createFileRoute("/")({
	beforeLoad: async () => {
		const result = await routeSignedInUser();
		if (!result.signedIn) return;
		if (result.orgs.length === 0) {
			throw redirect({ to: "/onboarding/create-org" });
		}
		if (result.orgs.length === 1) {
			throw redirect({
				to: "/org/$slug/dashboard",
				params: { slug: result.orgs[0].slug },
			});
		}
		throw redirect({ to: "/orgs" });
	},
	component: LandingPage,
});

function LandingPage() {
	const features = [
		{
			icon: <Newspaper className="h-10 w-10" />,
			title: "Aggregate your sources",
			description:
				"Pull RSS feeds, scheduled web searches, and specific websites into one inbox.",
		},
		{
			icon: <Sparkles className="h-10 w-10" />,
			title: "Draft with your voice",
			description:
				"Generate newsletter drafts via Claude using your organization's tone-of-voice profile.",
		},
		{
			icon: <Users className="h-10 w-10" />,
			title: "Collaborate with your team",
			description:
				"Invite teammates per organization with admin or member roles.",
		},
	];

	return (
		<div className="min-h-screen">
			<section className="relative py-20 px-6 text-center">
				<div className="max-w-3xl mx-auto">
					<h1 className="text-5xl md:text-6xl font-black tracking-tight mb-6">
						NewsGator
					</h1>
					<p className="text-xl text-muted-foreground mb-8">
						A multi-tenant news aggregator and newsletter drafting tool.
					</p>
					<div className="flex justify-center gap-3">
						<Button asChild size="lg">
							<Link to="/sign-in" search={{ redirect: "/" }}>
								Sign in
							</Link>
						</Button>
						<Button asChild size="lg" variant="outline">
							<Link to="/sign-up" search={{ redirect: "/" }}>
								Create account
							</Link>
						</Button>
					</div>
				</div>
			</section>

			<section className="py-16 px-6 max-w-6xl mx-auto">
				<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
					{features.map((feature) => (
						<Card key={feature.title}>
							<CardHeader>
								<div className="mb-2 text-primary">{feature.icon}</div>
								<CardTitle>{feature.title}</CardTitle>
							</CardHeader>
							<CardContent>
								<CardDescription className="text-base">
									{feature.description}
								</CardDescription>
							</CardContent>
						</Card>
					))}
				</div>
			</section>
		</div>
	);
}
