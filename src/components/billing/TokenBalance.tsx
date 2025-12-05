import { Link } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { AlertTriangle, Coins } from "lucide-react";
import { api } from "../../../convex/_generated/api";

export function TokenBalance() {
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

	return (
		<div className="flex items-center gap-2">
			{/* Balance Display */}
			<div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg">
				<Coins size={18} className="text-amber-600 dark:text-amber-500" />
				<span className="font-semibold text-sm text-slate-900 dark:text-white">
					{balance.toLocaleString()}
				</span>
				<span className="text-xs text-slate-600 dark:text-slate-400">
					tokens
				</span>
			</div>

			{/* Low Balance Warning Button */}
			{isLow && (
				<Link to="/profile">
					<button
						type="button"
						className={`flex items-center gap-2 px-3 py-1.5 rounded-lg font-medium text-sm transition-colors ${
							isCritical
								? "bg-red-600 hover:bg-red-700 text-white"
								: "bg-amber-600 hover:bg-amber-700 text-white"
						}`}
					>
						{isCritical && <AlertTriangle size={16} />}
						Buy Tokens
					</button>
				</Link>
			)}
		</div>
	);
}
