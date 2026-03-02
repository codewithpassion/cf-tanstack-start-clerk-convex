import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import type { Id } from "../../../../../convex/_generated/dataModel";
import { useState } from "react";

import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/hackathons/$slug/solutions/")({
	component: PublicGalleryPage,
});

function PublicGalleryPage() {
	const { slug } = Route.useParams();
	const hackathon = useQuery(api.hackathons.getBySlug, { slug });
	const [categoryFilter, setCategoryFilter] = useState<string>("all");

	const submissions = useQuery(
		api.submissions.listByHackathon,
		hackathon ? { hackathonId: hackathon._id, status: "approved" } : "skip",
	);

	const categories = useQuery(
		api.categories.listByHackathon,
		hackathon ? { hackathonId: hackathon._id } : "skip",
	);

	if (hackathon === undefined) {
		return (
			<div className="container mx-auto p-6 space-y-4">
				<Skeleton className="h-10 w-64" />
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
					<Skeleton className="h-48" />
					<Skeleton className="h-48" />
					<Skeleton className="h-48" />
				</div>
			</div>
		);
	}

	if (hackathon === null) {
		return (
			<div className="container mx-auto p-6">
				<h1 className="text-2xl font-bold mb-4">Not Found</h1>
				<p className="text-muted-foreground">
					This hackathon does not exist.
				</p>
			</div>
		);
	}

	if (!hackathon.galleryPublic) {
		return (
			<div className="container mx-auto p-6">
				<h1 className="text-2xl font-bold mb-4">{hackathon.name}</h1>
				<p className="text-muted-foreground">
					The solutions gallery is not public yet.
				</p>
			</div>
		);
	}

	const filtered =
		submissions && categoryFilter !== "all"
			? submissions.filter((s) =>
					s.categoryIds.includes(
						categoryFilter as Id<"categories">,
					),
				)
			: submissions;

	return (
		<div className="container mx-auto p-6">
			<div className="mb-8">
				<h1 className="text-3xl font-bold mb-2">{hackathon.name}</h1>
				<p className="text-muted-foreground">Solutions Gallery</p>
			</div>

			{categories && categories.length > 0 && (
				<div className="mb-6">
					<Select
						value={categoryFilter}
						onValueChange={setCategoryFilter}
					>
						<SelectTrigger className="w-[200px]">
							<SelectValue placeholder="All categories" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="all">All categories</SelectItem>
							{categories.map((cat) => (
								<SelectItem key={cat._id} value={cat._id}>
									{cat.name}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>
			)}

			{filtered === undefined ? (
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
					<Skeleton className="h-48" />
					<Skeleton className="h-48" />
					<Skeleton className="h-48" />
				</div>
			) : filtered.length === 0 ? (
				<p className="text-muted-foreground">
					No approved submissions yet.
				</p>
			) : (
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
					{filtered.map((s) => (
						<Link
							key={s._id}
							to="/hackathons/$slug/solutions/$submissionId"
							params={{ slug, submissionId: s._id as string }}
						>
							<Card className="h-full hover:border-primary/50 transition-colors cursor-pointer">
								<CardHeader>
									<CardTitle className="text-base">
										{s.title}
									</CardTitle>
									<CardDescription>
										by {s.teamName}
									</CardDescription>
								</CardHeader>
								<CardContent>
									<p className="text-sm text-muted-foreground mb-3 line-clamp-3">
										{s.description}
									</p>
									{s.categories.length > 0 && (
										<div className="flex flex-wrap gap-1">
											{s.categories.map(
												(cat) =>
													cat && (
														<Badge
															key={cat._id}
															variant="outline"
															className="text-xs"
														>
															{cat.name}
														</Badge>
													),
											)}
										</div>
									)}
								</CardContent>
							</Card>
						</Link>
					))}
				</div>
			)}
		</div>
	);
}
