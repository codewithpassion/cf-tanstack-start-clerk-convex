import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { Building2, Plus } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	Empty,
	EmptyContent,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from "@/components/ui/empty";

export const Route = createFileRoute("/_authed/orgs")({
	component: OrgsPage,
});

function OrgsPage() {
	const orgs = useQuery(api.organizations.listMine);

	return (
		<div className="max-w-4xl mx-auto">
			<div className="flex items-center justify-between mb-6">
				<h1 className="text-3xl font-bold">Your organizations</h1>
				<Button asChild>
					<Link to="/onboarding/create-org">
						<Plus className="h-4 w-4 mr-2" />
						Create new
					</Link>
				</Button>
			</div>

			{orgs === undefined ? (
				<p className="text-muted-foreground">Loading...</p>
			) : orgs.length === 0 ? (
				<Empty>
					<EmptyHeader>
						<EmptyMedia variant="icon">
							<Building2 />
						</EmptyMedia>
						<EmptyTitle>No organizations yet</EmptyTitle>
						<EmptyDescription>
							You're not in any organization yet. Create one to get started.
						</EmptyDescription>
					</EmptyHeader>
					<EmptyContent>
						<Button asChild>
							<Link to="/onboarding/create-org">
								<Plus className="h-4 w-4 mr-2" />
								Create organization
							</Link>
						</Button>
					</EmptyContent>
				</Empty>
			) : (
				<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
					{orgs.map((org) => (
						<Card key={org._id}>
							<CardHeader>
								<div className="flex items-center justify-between">
									<CardTitle className="truncate">{org.name}</CardTitle>
									<Badge variant="secondary">{org.role}</Badge>
								</div>
								<CardDescription className="truncate">
									/org/{org.slug}
								</CardDescription>
							</CardHeader>
							<CardContent>
								{org.description && (
									<p className="text-sm text-muted-foreground mb-3 line-clamp-2">
										{org.description}
									</p>
								)}
								<Button asChild variant="outline" className="w-full">
									<Link
										to="/org/$slug/dashboard"
										params={{ slug: org.slug }}
									>
										Open dashboard
									</Link>
								</Button>
							</CardContent>
						</Card>
					))}
				</div>
			)}
		</div>
	);
}
