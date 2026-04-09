import { Link, useMatchRoute } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import {
	canManageHackathon,
	canCurateProblems,
	canJudge,
	type HackathonRole,
} from "@/lib/hackathon-permissions";

interface HackathonNavProps {
	hackathonId: string;
	hackathonSlug?: string;
	role: HackathonRole;
}

interface NavItem {
	label: string;
	to: string;
	show: boolean;
}

export function HackathonNav({ hackathonId, role }: HackathonNavProps) {
	const matchRoute = useMatchRoute();
	const base = `/hackathons/${hackathonId}` as const;

	const isManage = canManageHackathon(role);
	const isCurate = canCurateProblems(role);
	const isJudge = canJudge(role);

	const items: NavItem[] = [
		{ label: "Overview", to: base, show: role !== null },
		{ label: "Dashboard", to: `${base}/dashboard`, show: role !== null },

		// Organiser / Owner
		{ label: "Settings", to: `${base}/settings`, show: isManage },
		{ label: "Categories", to: `${base}/categories`, show: isManage },
		{ label: "Content Pages", to: `${base}/content`, show: isManage },
		{ label: "Team", to: `${base}/team`, show: isManage },
		{ label: "Analytics", to: `${base}/analytics`, show: isManage },

		// Curator
		{
			label: "Curate Problems",
			to: `${base}/curate-problems`,
			show: isCurate,
		},
		{
			label: "Curate Solutions",
			to: `${base}/curate-solutions`,
			show: isCurate,
		},

		// Judge
		{ label: "Judging", to: `${base}/judging`, show: isJudge },

		// Everyone
		{ label: "Problems", to: `${base}/problems`, show: role !== null },
		{ label: "Teams", to: `${base}/teams`, show: role !== null },
		{
			label: "My Submission",
			to: `${base}/my-submission`,
			show: role !== null,
		},
	];

	const visibleItems = items.filter((i) => i.show);

	return (
		<nav className="flex flex-col gap-1">
			{visibleItems.map((item) => {
				const isActive = matchRoute({ to: item.to, fuzzy: false });
				return (
					<Link
						key={item.to}
						to={item.to}
						className={cn(
							"rounded-md px-3 py-2 text-sm font-medium transition-colors",
							isActive
								? "bg-primary text-primary-foreground"
								: "text-muted-foreground hover:bg-muted hover:text-foreground",
						)}
					>
						{item.label}
					</Link>
				);
			})}
		</nav>
	);
}
