import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { api } from "@/convex/api";
import { LoadingState } from "@/components/shared/LoadingState";
import { PageHeader } from "@/components/shared/PageHeader";
import { useState } from "react";
import {
	DollarSign,
	TrendingUp,
	Users,
	BarChart3,
	Eye,
	Coins,
	Percent,
} from "lucide-react";
import type { Id } from "@/convex/dataModel";

export const Route = createFileRoute("/_authed/admin/billing")({
	component: AdminBillingPage,
});

// Type definitions for admin API responses
// These match the return types from convex/billing/admin.ts
type TokenStats = {
	totalBillableTokensUsed: number;
	totalActualTokensUsed: number;
	totalRevenueCents: number;
	activeAccounts: number;
	totalAccounts: number;
	totalBalance: number;
	averageBalance: number;
	profitMargin: number;
};

type ModelUsageStat = {
	model: string;
	operationCount: number;
	billableTokens: number;
	actualTokens: number;
};

type OperationStat = {
	operationType: string;
	operationCount: number;
	billableTokens: number;
};

type UserAccount = {
	_id: Id<"tokenAccounts">;
	userId: Id<"users">;
	balance: number;
	status: string;
	lifetimeTokensUsed: number;
	user: {
		_id: Id<"users">;
		email?: string;
		name?: string;
		imageUrl?: string;
		roles?: string[];
	} | null;
};

function AdminBillingPage() {
	// Note: The api.billing.admin module will be available once the Convex dev server
	// regenerates the API types. The module exists at convex/billing/admin.ts
	const tokenStats = useQuery(api.billing.admin.getTokenStats) as TokenStats | undefined;
	const modelUsageStats = useQuery(api.billing.admin.getModelUsageStats) as ModelUsageStat[] | undefined;
	const operationStats = useQuery(api.billing.admin.getOperationStats) as OperationStat[] | undefined;
	const userAccounts = useQuery(api.billing.admin.getUserAccounts, {
		limit: 20,
	}) as UserAccount[] | undefined;

	// Show loading state while data is being fetched
	if (
		tokenStats === undefined ||
		modelUsageStats === undefined ||
		operationStats === undefined ||
		userAccounts === undefined
	) {
		return <LoadingState message="Loading billing administration data..." />;
	}

	const totalRevenue = tokenStats.totalRevenueCents / 100; // Convert cents to dollars

	return (
		<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
			<PageHeader
				title="Token Billing Administration"
				description="System-wide token usage and billing statistics"
			/>

			{/* Stats Cards */}
			<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
				{/* Total Revenue */}
				<StatsCard
					title="Total Revenue"
					value={`$${totalRevenue.toFixed(2)}`}
					icon={<DollarSign className="w-6 h-6" />}
					iconBgColor="bg-green-100 dark:bg-green-900/20"
					iconColor="text-green-600 dark:text-green-400"
				/>

				{/* Total Tokens Used */}
				<StatsCard
					title="Total Tokens Used"
					value={tokenStats.totalBillableTokensUsed.toLocaleString()}
					subtitle="billable tokens"
					icon={<Coins className="w-6 h-6" />}
					iconBgColor="bg-cyan-100 dark:bg-cyan-900/20"
					iconColor="text-cyan-600 dark:text-cyan-400"
				/>

				{/* Active Accounts */}
				<StatsCard
					title="Active Accounts"
					value={tokenStats.activeAccounts.toString()}
					subtitle={`of ${tokenStats.totalAccounts} total`}
					icon={<Users className="w-6 h-6" />}
					iconBgColor="bg-blue-100 dark:bg-blue-900/20"
					iconColor="text-blue-600 dark:text-blue-400"
				/>

				{/* Profit Margin */}
				<StatsCard
					title="Profit Margin"
					value={`${tokenStats.profitMargin.toFixed(2)}%`}
					icon={<Percent className="w-6 h-6" />}
					iconBgColor="bg-purple-100 dark:bg-purple-900/20"
					iconColor="text-purple-600 dark:text-purple-400"
				/>
			</div>

			{/* Model Usage Table */}
			<div className="bg-white dark:bg-slate-900 shadow-sm rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden mb-8">
				<div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800">
					<div className="flex items-center gap-2">
						<BarChart3 className="w-5 h-5 text-slate-600 dark:text-slate-400" />
						<h2 className="text-lg font-semibold text-slate-900 dark:text-white">
							Model Usage Breakdown
						</h2>
					</div>
				</div>
				<div className="overflow-x-auto">
					<table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800">
						<thead className="bg-slate-50 dark:bg-slate-950">
							<tr>
								<th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
									Model
								</th>
								<th className="px-6 py-3 text-right text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
									Operations
								</th>
								<th className="px-6 py-3 text-right text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
									Billable Tokens
								</th>
								<th className="px-6 py-3 text-right text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
									Actual Tokens
								</th>
							</tr>
						</thead>
						<tbody className="bg-white dark:bg-slate-900 divide-y divide-slate-200 dark:divide-slate-800">
							{modelUsageStats.length === 0 ? (
								<tr>
									<td
										colSpan={4}
										className="px-6 py-8 text-center text-sm text-slate-500 dark:text-slate-400"
									>
										No model usage data available
									</td>
								</tr>
							) : (
								modelUsageStats.map((stat) => (
									<tr
										key={stat.model}
										className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
									>
										<td className="px-6 py-4 whitespace-nowrap">
											<span className="text-sm font-medium text-slate-900 dark:text-white">
												{stat.model}
											</span>
										</td>
										<td className="px-6 py-4 whitespace-nowrap text-right">
											<span className="text-sm text-slate-900 dark:text-white">
												{stat.operationCount.toLocaleString()}
											</span>
										</td>
										<td className="px-6 py-4 whitespace-nowrap text-right">
											<span className="text-sm font-semibold text-cyan-600 dark:text-cyan-400">
												{stat.billableTokens.toLocaleString()}
											</span>
										</td>
										<td className="px-6 py-4 whitespace-nowrap text-right">
											<span className="text-sm text-slate-600 dark:text-slate-400">
												{stat.actualTokens.toLocaleString()}
											</span>
										</td>
									</tr>
								))
							)}
						</tbody>
					</table>
				</div>
			</div>

			{/* Operation Type Table */}
			<div className="bg-white dark:bg-slate-900 shadow-sm rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden mb-8">
				<div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800">
					<div className="flex items-center gap-2">
						<TrendingUp className="w-5 h-5 text-slate-600 dark:text-slate-400" />
						<h2 className="text-lg font-semibold text-slate-900 dark:text-white">
							Operation Type Breakdown
						</h2>
					</div>
				</div>
				<div className="overflow-x-auto">
					<table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800">
						<thead className="bg-slate-50 dark:bg-slate-950">
							<tr>
								<th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
									Operation Type
								</th>
								<th className="px-6 py-3 text-right text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
									Count
								</th>
								<th className="px-6 py-3 text-right text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
									Billable Tokens
								</th>
							</tr>
						</thead>
						<tbody className="bg-white dark:bg-slate-900 divide-y divide-slate-200 dark:divide-slate-800">
							{operationStats.length === 0 ? (
								<tr>
									<td
										colSpan={3}
										className="px-6 py-8 text-center text-sm text-slate-500 dark:text-slate-400"
									>
										No operation data available
									</td>
								</tr>
							) : (
								operationStats.map((stat) => (
									<tr
										key={stat.operationType}
										className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
									>
										<td className="px-6 py-4 whitespace-nowrap">
											<span className="text-sm font-medium text-slate-900 dark:text-white capitalize">
												{stat.operationType.replace(/_/g, " ")}
											</span>
										</td>
										<td className="px-6 py-4 whitespace-nowrap text-right">
											<span className="text-sm text-slate-900 dark:text-white">
												{stat.operationCount.toLocaleString()}
											</span>
										</td>
										<td className="px-6 py-4 whitespace-nowrap text-right">
											<span className="text-sm font-semibold text-cyan-600 dark:text-cyan-400">
												{stat.billableTokens.toLocaleString()}
											</span>
										</td>
									</tr>
								))
							)}
						</tbody>
					</table>
				</div>
			</div>

			{/* User Accounts Table */}
			<div className="bg-white dark:bg-slate-900 shadow-sm rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
				<div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800">
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-2">
							<Users className="w-5 h-5 text-slate-600 dark:text-slate-400" />
							<h2 className="text-lg font-semibold text-slate-900 dark:text-white">
								User Accounts
							</h2>
						</div>
						<span className="text-sm text-slate-500 dark:text-slate-400">
							Showing top 20 accounts
						</span>
					</div>
				</div>
				<div className="overflow-x-auto">
					<table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800">
						<thead className="bg-slate-50 dark:bg-slate-950">
							<tr>
								<th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
									User
								</th>
								<th className="px-6 py-3 text-right text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
									Balance
								</th>
								<th className="px-6 py-3 text-center text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
									Status
								</th>
								<th className="px-6 py-3 text-right text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
									Lifetime Used
								</th>
								<th className="px-6 py-3 text-center text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
									Actions
								</th>
							</tr>
						</thead>
						<tbody className="bg-white dark:bg-slate-900 divide-y divide-slate-200 dark:divide-slate-800">
							{userAccounts.length === 0 ? (
								<tr>
									<td
										colSpan={5}
										className="px-6 py-8 text-center text-sm text-slate-500 dark:text-slate-400"
									>
										No user accounts found
									</td>
								</tr>
							) : (
								userAccounts.map((account) => (
									<UserAccountRow key={account._id} account={account} />
								))
							)}
						</tbody>
					</table>
				</div>
			</div>
		</div>
	);
}

// Stats Card Component
interface StatsCardProps {
	title: string;
	value: string;
	subtitle?: string;
	icon: React.ReactNode;
	iconBgColor: string;
	iconColor: string;
}

function StatsCard({
	title,
	value,
	subtitle,
	icon,
	iconBgColor,
	iconColor,
}: StatsCardProps) {
	return (
		<div className="bg-white dark:bg-slate-900 shadow-sm rounded-xl border border-slate-200 dark:border-slate-800 p-6">
			<div className="flex items-center gap-4">
				<div className={`${iconBgColor} p-3 rounded-lg ${iconColor}`}>
					{icon}
				</div>
				<div className="flex-1">
					<p className="text-sm font-medium text-slate-600 dark:text-slate-400">
						{title}
					</p>
					<p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
						{value}
					</p>
					{subtitle && (
						<p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
							{subtitle}
						</p>
					)}
				</div>
			</div>
		</div>
	);
}

// User Account Row Component
interface UserAccountRowProps {
	account: UserAccount;
}

function UserAccountRow({ account }: UserAccountRowProps) {
	const [showGrantModal, setShowGrantModal] = useState(false);

	const getStatusColor = (status: string) => {
		switch (status) {
			case "active":
				return "bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-400";
			case "suspended":
				return "bg-amber-100 dark:bg-amber-900/20 text-amber-800 dark:text-amber-400";
			case "blocked":
				return "bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-400";
			default:
				return "bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-300";
		}
	};

	const getBalanceColor = (balance: number) => {
		if (balance < 100) return "text-red-600 dark:text-red-400";
		if (balance < 1000) return "text-amber-600 dark:text-amber-400";
		return "text-green-600 dark:text-green-400";
	};

	return (
		<>
			<tr className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
				<td className="px-6 py-4">
					<div className="flex items-center gap-3">
						{account.user?.imageUrl ? (
							<img
								src={account.user.imageUrl}
								alt={account.user.name || "User"}
								className="w-8 h-8 rounded-full"
							/>
						) : (
							<div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center">
								<span className="text-xs font-medium text-slate-600 dark:text-slate-400">
									{account.user?.name?.charAt(0) || "?"}
								</span>
							</div>
						)}
						<div>
							<p className="text-sm font-medium text-slate-900 dark:text-white">
								{account.user?.name || "Unknown User"}
							</p>
							<p className="text-xs text-slate-500 dark:text-slate-400">
								{account.user?.email || "No email"}
							</p>
						</div>
					</div>
				</td>
				<td className="px-6 py-4 whitespace-nowrap text-right">
					<span
						className={`text-sm font-semibold ${getBalanceColor(account.balance)}`}
					>
						{account.balance.toLocaleString()}
					</span>
				</td>
				<td className="px-6 py-4 whitespace-nowrap text-center">
					<span
						className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${getStatusColor(account.status)}`}
					>
						{account.status}
					</span>
				</td>
				<td className="px-6 py-4 whitespace-nowrap text-right">
					<span className="text-sm text-slate-900 dark:text-white">
						{account.lifetimeTokensUsed.toLocaleString()}
					</span>
				</td>
				<td className="px-6 py-4 whitespace-nowrap text-center">
					<button
						type="button"
						onClick={() => setShowGrantModal(true)}
						className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
					>
						<Eye className="w-3.5 h-3.5" />
						View Details
					</button>
				</td>
			</tr>

			{/* Grant Tokens Modal - Placeholder */}
			{showGrantModal && (
				<tr>
					<td colSpan={5} className="px-6 py-4 bg-slate-50 dark:bg-slate-950">
						<div className="text-center">
							<p className="text-sm text-slate-600 dark:text-slate-400">
								Token grant functionality will be implemented in a future update.
							</p>
							<button
								type="button"
								onClick={() => setShowGrantModal(false)}
								className="mt-2 text-xs text-cyan-600 dark:text-cyan-400 hover:underline"
							>
								Close
							</button>
						</div>
					</td>
				</tr>
			)}
		</>
	);
}
