import { Link } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { Coins } from "lucide-react";
import { api } from "../../../convex/_generated/api";

export function HeaderTokenCounter() {
	// Get current user from Convex
	const user = useQuery(api.users.getMe);

	// Get token account for the user
	const account = useQuery(
		api.billing.accounts.getAccount,
		user?._id ? { userId: user._id } : "skip",
	);

	// Don't render if no account exists yet
	if (!account) {
		return null;
	}

	const balance = account.balance;
	const isLow = balance < 1000;
	const isCritical = balance < 100;

	// Determine color based on balance level
	const getColorClasses = () => {
		if (isCritical) {
			return "bg-red-100 dark:bg-red-900/20 text-red-900 dark:text-red-200";
		}
		if (isLow) {
			return "bg-amber-100 dark:bg-amber-900/20 text-amber-900 dark:text-amber-200";
		}
		return "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white";
	};

	return (
		<Link to="/settings/billing">
			<div
				className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors hover:opacity-80 cursor-pointer ${getColorClasses()}`}
			>
				<Coins size={18} className="text-amber-600 dark:text-amber-500" />
				<span className="font-semibold text-sm hidden md:inline-block">
					{balance.toLocaleString()}
				</span>
				<span className="font-semibold text-sm md:hidden">
					{balance.toLocaleString()}
				</span>
			</div>
		</Link>
	);
}
