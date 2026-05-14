import { useNavigate, useRouterState } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { Check, ChevronsUpDown, Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { api } from "../../convex/_generated/api";
import {
	SHORTCUT_EVENTS,
	subscribeShortcutEvent,
} from "@/lib/shortcut-events";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
	CommandSeparator,
} from "@/components/ui/command";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

function getRouteTail(pathname: string): string {
	const match = pathname.match(/^\/org\/[^/]+(\/.*)?$/);
	return match?.[1] ?? "/dashboard";
}

export function OrgSwitcher() {
	const [open, setOpen] = useState(false);
	const navigate = useNavigate();
	const router = useRouterState();
	const orgs = useQuery(api.organizations.listMine);

	useEffect(() => {
		return subscribeShortcutEvent(SHORTCUT_EVENTS.openOrgSwitcher, () =>
			setOpen((s) => !s),
		);
	}, []);

	const pathname = router.location.pathname;
	const currentSlug = pathname.match(/^\/org\/([^/]+)/)?.[1] ?? null;
	const current = orgs?.find((o) => o.slug === currentSlug);
	const tail = getRouteTail(pathname);

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger asChild>
				<Button
					variant="outline"
					role="combobox"
					aria-expanded={open}
					className="w-[220px] justify-between"
				>
					<span className="truncate">
						{current ? current.name : "Select organization..."}
					</span>
					<ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
				</Button>
			</PopoverTrigger>
			<PopoverContent className="w-[260px] p-0" align="start">
				<Command>
					<CommandInput placeholder="Search organizations..." />
					<CommandList>
						<CommandEmpty>No organizations found.</CommandEmpty>
						{orgs && orgs.length > 0 && (
							<CommandGroup heading="Your organizations">
								{orgs.map((org) => (
									<CommandItem
										key={org._id}
										value={`${org.name} ${org.slug}`}
										onSelect={() => {
											setOpen(false);
											navigate({ href: `/org/${org.slug}${tail}` });
										}}
									>
										<Check
											className={cn(
												"mr-2 h-4 w-4",
												currentSlug === org.slug ? "opacity-100" : "opacity-0",
											)}
										/>
										<span className="flex-1 truncate">{org.name}</span>
										<Badge variant="secondary" className="ml-2 text-xs">
											{org.role}
										</Badge>
									</CommandItem>
								))}
							</CommandGroup>
						)}
						<CommandSeparator />
						<CommandGroup>
							<CommandItem
								onSelect={() => {
									setOpen(false);
									navigate({ to: "/onboarding/create-org" });
								}}
							>
								<Plus className="mr-2 h-4 w-4" />
								Create new organization
							</CommandItem>
						</CommandGroup>
					</CommandList>
				</Command>
			</PopoverContent>
		</Popover>
	);
}
