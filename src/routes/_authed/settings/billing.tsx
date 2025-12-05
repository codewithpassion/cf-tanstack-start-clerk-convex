import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { api } from "@/convex/api";
import { LoadingState } from "@/components/shared/LoadingState";
import { PageHeader } from "@/components/shared/PageHeader";
import { useState } from "react";
import { Coins, CreditCard, History, Zap, TrendingUp, DollarSign, Clock } from "lucide-react";

export const Route = createFileRoute("/_authed/settings/billing")({
	component: BillingPage,
});

function BillingPage() {
	const [activeTab, setActiveTab] = useState<"buy" | "auto-recharge" | "history">("buy");

	// Fetch current user
	const user = useQuery(api.users.getMe);

	// Fetch token account
	const account = useQuery(
		api.billing.accounts.getAccount,
		user?._id ? { userId: user._id } : "skip",
	);

	// Fetch active packages
	const packages = useQuery(api.billing.pricing.listActivePackages);

	// Fetch transactions
	const transactions = useQuery(
		api.billing.accounts.getTransactions,
		user?._id ? { userId: user._id, limit: 50 } : "skip",
	);

	// Show loading state while data is being fetched
	if (user === undefined || account === undefined || packages === undefined || transactions === undefined) {
		return <LoadingState message="Loading billing information..." />;
	}

	if (!account) {
		return (
			<div className="max-w-6xl mx-auto">
				<div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
					<h2 className="text-xl font-semibold text-red-900 dark:text-red-200 mb-2">
						Account Not Found
					</h2>
					<p className="text-red-700 dark:text-red-300">
						Unable to load your token account. Please contact support if this issue persists.
					</p>
				</div>
			</div>
		);
	}

	const balance = account.balance;
	const lifetimeUsed = account.lifetimeTokensUsed;
	const lifetimePurchased = account.lifetimeTokensPurchased;
	const lifetimeSpent = account.lifetimeSpentCents / 100; // Convert cents to dollars

	return (
		<div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
			<PageHeader
				title="Billing & Tokens"
				description="Manage your token balance and purchase history"
			/>

			{/* Balance Card */}
			<div className="bg-gradient-to-br from-cyan-500 to-blue-600 rounded-2xl shadow-lg p-8 mb-8 text-white">
				<div className="flex items-center justify-between mb-6">
					<div className="flex items-center gap-3">
						<div className="bg-white/20 p-3 rounded-xl backdrop-blur-sm">
							<Coins className="w-8 h-8" />
						</div>
						<div>
							<p className="text-white/80 text-sm font-medium">Current Balance</p>
							<p className="text-5xl font-bold">{balance.toLocaleString()}</p>
							<p className="text-white/80 text-sm mt-1">tokens available</p>
						</div>
					</div>
				</div>

				{/* Lifetime Stats */}
				<div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-6 border-t border-white/20">
					<div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
						<div className="flex items-center gap-2 mb-2">
							<TrendingUp className="w-4 h-4 text-white/80" />
							<p className="text-white/80 text-xs font-medium uppercase tracking-wide">
								Total Used
							</p>
						</div>
						<p className="text-2xl font-bold">{lifetimeUsed.toLocaleString()}</p>
						<p className="text-white/60 text-xs mt-1">tokens consumed</p>
					</div>

					<div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
						<div className="flex items-center gap-2 mb-2">
							<Coins className="w-4 h-4 text-white/80" />
							<p className="text-white/80 text-xs font-medium uppercase tracking-wide">
								Total Purchased
							</p>
						</div>
						<p className="text-2xl font-bold">{lifetimePurchased.toLocaleString()}</p>
						<p className="text-white/60 text-xs mt-1">tokens acquired</p>
					</div>

					<div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
						<div className="flex items-center gap-2 mb-2">
							<DollarSign className="w-4 h-4 text-white/80" />
							<p className="text-white/80 text-xs font-medium uppercase tracking-wide">
								Total Spent
							</p>
						</div>
						<p className="text-2xl font-bold">${lifetimeSpent.toFixed(2)}</p>
						<p className="text-white/60 text-xs mt-1">lifetime investment</p>
					</div>
				</div>
			</div>

			{/* Tabs */}
			<div className="bg-white dark:bg-slate-900 shadow-sm rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
				{/* Tab List */}
				<div className="border-b border-slate-200 dark:border-slate-800">
					<nav className="flex -mb-px">
						<button
							type="button"
							onClick={() => setActiveTab("buy")}
							className={`flex-1 px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
								activeTab === "buy"
									? "border-cyan-500 text-cyan-600 dark:text-cyan-400"
									: "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700"
							}`}
						>
							<div className="flex items-center justify-center gap-2">
								<CreditCard className="w-4 h-4" />
								<span>Buy Tokens</span>
							</div>
						</button>
						<button
							type="button"
							onClick={() => setActiveTab("auto-recharge")}
							className={`flex-1 px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
								activeTab === "auto-recharge"
									? "border-cyan-500 text-cyan-600 dark:text-cyan-400"
									: "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700"
							}`}
						>
							<div className="flex items-center justify-center gap-2">
								<Zap className="w-4 h-4" />
								<span>Auto-Recharge</span>
							</div>
						</button>
						<button
							type="button"
							onClick={() => setActiveTab("history")}
							className={`flex-1 px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
								activeTab === "history"
									? "border-cyan-500 text-cyan-600 dark:text-cyan-400"
									: "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700"
							}`}
						>
							<div className="flex items-center justify-center gap-2">
								<History className="w-4 h-4" />
								<span>Transaction History</span>
							</div>
						</button>
					</nav>
				</div>

				{/* Tab Content */}
				<div className="p-6">
					{activeTab === "buy" && <BuyTokensTab packages={packages} />}
					{activeTab === "auto-recharge" && <AutoRechargeTab account={account} />}
					{activeTab === "history" && <TransactionHistoryTab transactions={transactions} />}
				</div>
			</div>
		</div>
	);
}

// Buy Tokens Tab Component
function BuyTokensTab({ packages }: { packages: Array<{
	_id: string;
	packageName: string;
	tokenAmount: number;
	priceCents: number;
	description?: string;
	isPopular: boolean;
}> }) {
	const handlePurchase = (packageId: string) => {
		console.log(`Purchase package: ${packageId}`);
		// TODO: Stripe integration will be added later
	};

	return (
		<div>
			<h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
				Choose a Token Package
			</h3>
			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
				{packages.map((pkg) => {
					const priceInDollars = pkg.priceCents / 100;
					const pricePerThousand = (priceInDollars / (pkg.tokenAmount / 1000)).toFixed(2);

					return (
						<div
							key={pkg._id}
							className={`relative bg-white dark:bg-slate-950 rounded-xl border-2 p-6 transition-all hover:shadow-lg ${
								pkg.isPopular
									? "border-cyan-500 shadow-cyan-100 dark:shadow-cyan-900/20"
									: "border-slate-200 dark:border-slate-800"
							}`}
						>
							{pkg.isPopular && (
								<div className="absolute -top-3 left-1/2 -translate-x-1/2">
									<span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-cyan-500 text-white shadow-lg">
										Best Value
									</span>
								</div>
							)}

							<div className="text-center mb-4">
								<h4 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
									{pkg.packageName}
								</h4>
								<div className="mb-3">
									<span className="text-3xl font-bold text-slate-900 dark:text-white">
										${priceInDollars.toFixed(2)}
									</span>
								</div>
								<div className="flex items-center justify-center gap-2 text-slate-600 dark:text-slate-400 mb-2">
									<Coins className="w-4 h-4" />
									<span className="text-lg font-semibold">
										{pkg.tokenAmount.toLocaleString()}
									</span>
									<span className="text-sm">tokens</span>
								</div>
								<p className="text-xs text-slate-500 dark:text-slate-400">
									${pricePerThousand} per 1,000 tokens
								</p>
							</div>

							{pkg.description && (
								<p className="text-sm text-slate-600 dark:text-slate-400 text-center mb-4">
									{pkg.description}
								</p>
							)}

							<button
								type="button"
								onClick={() => handlePurchase(pkg._id)}
								className={`w-full py-2.5 px-4 rounded-lg font-medium text-sm transition-colors ${
									pkg.isPopular
										? "bg-cyan-600 hover:bg-cyan-700 text-white shadow-lg shadow-cyan-100 dark:shadow-cyan-900/20"
										: "bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-900 dark:text-white"
								}`}
							>
								Purchase
							</button>
						</div>
					);
				})}
			</div>
		</div>
	);
}

// Auto-Recharge Tab Component
function AutoRechargeTab({ account }: { account: {
	autoRechargeEnabled: boolean;
	autoRechargeThreshold?: number;
	autoRechargeAmount?: number;
} }) {
	return (
		<div className="max-w-2xl">
			<h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
				Auto-Recharge Settings
			</h3>
			<div className="bg-slate-50 dark:bg-slate-950 rounded-lg p-6 border border-slate-200 dark:border-slate-800">
				<div className="flex items-start gap-4 mb-6">
					<div className="bg-cyan-100 dark:bg-cyan-900/20 p-3 rounded-lg">
						<Zap className="w-6 h-6 text-cyan-600 dark:text-cyan-400" />
					</div>
					<div className="flex-1">
						<h4 className="font-semibold text-slate-900 dark:text-white mb-2">
							Automatic Token Recharge
						</h4>
						<p className="text-sm text-slate-600 dark:text-slate-400">
							Never run out of tokens! Set up automatic recharging to maintain your balance without interruption.
						</p>
					</div>
				</div>

				<div className="space-y-4">
					<div className="flex items-center justify-between py-3 border-t border-slate-200 dark:border-slate-800">
						<div>
							<p className="font-medium text-slate-900 dark:text-white">Status</p>
							<p className="text-sm text-slate-500 dark:text-slate-400">
								Auto-recharge is currently {account.autoRechargeEnabled ? "enabled" : "disabled"}
							</p>
						</div>
						<div className={`px-3 py-1 rounded-full text-xs font-medium ${
							account.autoRechargeEnabled
								? "bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-400"
								: "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
						}`}>
							{account.autoRechargeEnabled ? "Active" : "Inactive"}
						</div>
					</div>

					{account.autoRechargeEnabled && (
						<>
							<div className="py-3 border-t border-slate-200 dark:border-slate-800">
								<p className="font-medium text-slate-900 dark:text-white mb-1">Trigger Threshold</p>
								<p className="text-sm text-slate-600 dark:text-slate-400">
									Recharge when balance falls below {account.autoRechargeThreshold?.toLocaleString() || "N/A"} tokens
								</p>
							</div>
							<div className="py-3 border-t border-slate-200 dark:border-slate-800">
								<p className="font-medium text-slate-900 dark:text-white mb-1">Recharge Amount</p>
								<p className="text-sm text-slate-600 dark:text-slate-400">
									Add {account.autoRechargeAmount?.toLocaleString() || "N/A"} tokens automatically
								</p>
							</div>
						</>
					)}
				</div>

				<div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-800">
					<p className="text-sm text-slate-500 dark:text-slate-400 italic">
						Auto-recharge configuration will be available in a future update.
					</p>
				</div>
			</div>
		</div>
	);
}

// Transaction History Tab Component
function TransactionHistoryTab({ transactions }: { transactions: Array<{
	_id: string;
	transactionType: string;
	tokenAmount: number;
	description: string;
	createdAt: number;
}> }) {
	if (transactions.length === 0) {
		return (
			<div className="text-center py-12">
				<div className="bg-slate-100 dark:bg-slate-800 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
					<History className="w-8 h-8 text-slate-400" />
				</div>
				<h3 className="text-lg font-medium text-slate-900 dark:text-white mb-2">
					No transactions yet
				</h3>
				<p className="text-sm text-slate-500 dark:text-slate-400">
					Your transaction history will appear here once you start using tokens.
				</p>
			</div>
		);
	}

	return (
		<div>
			<h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
				Recent Transactions
			</h3>
			<div className="overflow-x-auto">
				<table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800">
					<thead className="bg-slate-50 dark:bg-slate-950">
						<tr>
							<th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
								Date
							</th>
							<th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
								Description
							</th>
							<th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
								Type
							</th>
							<th className="px-6 py-3 text-right text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
								Amount
							</th>
						</tr>
					</thead>
					<tbody className="bg-white dark:bg-slate-900 divide-y divide-slate-200 dark:divide-slate-800">
						{transactions.map((tx) => {
							const isPositive = tx.tokenAmount > 0;
							const formattedDate = new Date(tx.createdAt).toLocaleDateString();

							return (
								<tr key={tx._id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
									<td className="px-6 py-4 whitespace-nowrap">
										<div className="flex items-center gap-2 text-sm text-slate-900 dark:text-white">
											<Clock className="w-4 h-4 text-slate-400" />
											{formattedDate}
										</div>
									</td>
									<td className="px-6 py-4">
										<div className="text-sm text-slate-900 dark:text-white">
											{tx.description}
										</div>
									</td>
									<td className="px-6 py-4 whitespace-nowrap">
										<span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-300 capitalize">
											{tx.transactionType.replace("_", " ")}
										</span>
									</td>
									<td className="px-6 py-4 whitespace-nowrap text-right">
										<span className={`text-sm font-semibold ${
											isPositive
												? "text-green-600 dark:text-green-400"
												: "text-red-600 dark:text-red-400"
										}`}>
											{isPositive ? "+" : ""}{tx.tokenAmount.toLocaleString()}
										</span>
									</td>
								</tr>
							);
						})}
					</tbody>
				</table>
			</div>
		</div>
	);
}
