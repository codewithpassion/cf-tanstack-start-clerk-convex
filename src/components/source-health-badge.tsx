import { AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type SourceHealth = "healthy" | "warning" | "failing";

const styles: Record<
	SourceHealth,
	{ label: string; className: string; Icon: typeof CheckCircle2 }
> = {
	healthy: {
		label: "Healthy",
		className:
			"border-green-200 bg-green-50 text-green-800 dark:border-green-900 dark:bg-green-950 dark:text-green-300",
		Icon: CheckCircle2,
	},
	warning: {
		label: "Warning",
		className:
			"border-yellow-200 bg-yellow-50 text-yellow-800 dark:border-yellow-900 dark:bg-yellow-950 dark:text-yellow-300",
		Icon: AlertTriangle,
	},
	failing: {
		label: "Failing",
		className:
			"border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-300",
		Icon: XCircle,
	},
};

export function SourceHealthBadge({
	health,
	className,
}: {
	health: SourceHealth;
	className?: string;
}) {
	const s = styles[health];
	const Icon = s.Icon;
	return (
		<Badge variant="outline" className={cn(s.className, className)}>
			<Icon className="size-3" />
			{s.label}
		</Badge>
	);
}
