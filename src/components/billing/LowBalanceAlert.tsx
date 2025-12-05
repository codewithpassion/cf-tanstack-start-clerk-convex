import { Link } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { AlertTriangle } from "lucide-react";
import { api } from "@/convex/api";

interface LowBalanceAlertProps {
	className?: string;
	threshold?: number;
}

/**
 * LowBalanceAlert component displays a warning banner when user's token balance
 * is below the specified threshold.
 *
 * Shows an alert with different severity levels:
 * - Critical (destructive): balance < 100 tokens
 * - Warning (default): balance < threshold (default 1000)
 *
 * Provides a link to the billing settings page to purchase more tokens.
 *
 * @param className - Optional additional CSS classes
 * @param threshold - Token balance threshold to trigger alert (default: 1000)
 */
export function LowBalanceAlert({
	className = "",
	threshold = 1000,
}: LowBalanceAlertProps) {
	// Get current user from Convex
	const user = useQuery(api.users.getMe);

	// Get token account for the user
	const account = useQuery(
		api.billing.accounts.getAccount,
		user?._id ? { userId: user._id } : "skip",
	);

	// Don't render if no account exists or balance is sufficient
	if (!account || account.balance >= threshold) {
		return null;
	}

	const isCritical = account.balance < 100;
	const balance = account.balance.toLocaleString();

	return (
		<div
			role="alert"
			className={`
				rounded-lg border p-4 mb-4
				${
					isCritical
						? "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900"
						: "bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900"
				}
				${className}
			`.trim()}
		>
			<div className="flex items-start gap-3">
				<AlertTriangle
					size={20}
					className={
						isCritical
							? "text-red-600 dark:text-red-500 mt-0.5 flex-shrink-0"
							: "text-amber-600 dark:text-amber-500 mt-0.5 flex-shrink-0"
					}
				/>
				<div className="flex-1">
					<h3
						className={`font-semibold text-sm mb-1 ${
							isCritical
								? "text-red-900 dark:text-red-100"
								: "text-amber-900 dark:text-amber-100"
						}`}
					>
						Low Token Balance
					</h3>
					<p
						className={`text-sm mb-3 ${
							isCritical
								? "text-red-800 dark:text-red-200"
								: "text-amber-800 dark:text-amber-200"
						}`}
					>
						You have {balance} tokens remaining. Purchase more to continue
						using AI features.
					</p>
					<Link to="/profile" className="inline-block">
						<button
							type="button"
							className={`
								px-4 py-2 rounded-lg font-medium text-sm transition-colors
								${
									isCritical
										? "bg-red-600 hover:bg-red-700 text-white"
										: "bg-amber-600 hover:bg-amber-700 text-white"
								}
							`.trim()}
						>
							Buy More Tokens
						</button>
					</Link>
				</div>
			</div>
		</div>
	);
}
