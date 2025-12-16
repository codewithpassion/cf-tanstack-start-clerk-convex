import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/api";
import { LoadingState } from "@/components/shared/LoadingState";
import { PageHeader } from "@/components/shared/PageHeader";
import { useState, useCallback, useContext } from "react";
import {
	DollarSign,
	TrendingUp,
	Users,
	BarChart3,
	Coins,
	Percent,
	Plus,
	Minus,
	Search,
	X,
	AlertCircle,
	CheckCircle2,
} from "lucide-react";
import type { Id } from "@/convex/dataModel";
import { AuthContext } from "@/contexts/auth-context";

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
	const authContext = useContext(AuthContext);
	const isSuperAdmin = authContext?.isSuperAdmin() ?? false;

	// Token management modal state
	const [showTokenModal, setShowTokenModal] = useState(false);
	const [tokenModalMode, setTokenModalMode] = useState<"grant" | "deduct">("grant");

	// Note: The api.billing.admin module will be available once the Convex dev server
	// regenerates the API types. The module exists at convex/billing/admin.ts
	const tokenStats = useQuery(api.billing.admin.getTokenStats) as TokenStats | undefined;
	const modelUsageStats = useQuery(api.billing.admin.getModelUsageStats) as ModelUsageStat[] | undefined;
	const operationStats = useQuery(api.billing.admin.getOperationStats) as OperationStat[] | undefined;
	const userAccounts = useQuery(api.billing.admin.getUserAccounts, {
		limit: 20,
	}) as UserAccount[] | undefined;

	const openGrantModal = useCallback(() => {
		setTokenModalMode("grant");
		setShowTokenModal(true);
	}, []);

	const openDeductModal = useCallback(() => {
		setTokenModalMode("deduct");
		setShowTokenModal(true);
	}, []);

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

			{/* Token Management Actions (Superadmin Only) */}
			{isSuperAdmin && (
				<div className="bg-white dark:bg-slate-900 shadow-sm rounded-xl border border-slate-200 dark:border-slate-800 p-6 mb-8">
					<div className="flex items-center justify-between">
						<div>
							<h2 className="text-lg font-semibold text-slate-900 dark:text-white">
								Token Management
							</h2>
							<p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
								Grant or deduct tokens from user accounts
							</p>
						</div>
						<div className="flex items-center gap-3">
							<button
								type="button"
								onClick={openGrantModal}
								className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-green-600 text-white hover:bg-green-700 transition-colors"
							>
								<Plus className="w-4 h-4" />
								Grant Tokens
							</button>
							<button
								type="button"
								onClick={openDeductModal}
								className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-red-600 text-white hover:bg-red-700 transition-colors"
							>
								<Minus className="w-4 h-4" />
								Deduct Tokens
							</button>
						</div>
					</div>
				</div>
			)}

			{/* Token Modal */}
			{showTokenModal && (
				<TokenManagementModal
					mode={tokenModalMode}
					onClose={() => setShowTokenModal(false)}
				/>
			)}

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
									Roles
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
					<span className="text-xs text-slate-500 dark:text-slate-400">
						{account.user?.roles?.join(", ") || "user"}
					</span>
				</td>
			</tr>
		</>
	);
}

// Type for search results
type SearchUserResult = {
	_id: Id<"users">;
	email?: string;
	name?: string;
	imageUrl?: string;
	roles?: string[];
	tokenAccount: {
		_id: Id<"tokenAccounts">;
		balance: number;
		status: string;
		lifetimeTokensUsed: number;
	} | null;
};

// Token Management Modal Component
interface TokenManagementModalProps {
	mode: "grant" | "deduct";
	onClose: () => void;
}

function TokenManagementModal({ mode, onClose }: TokenManagementModalProps) {
	const [searchQuery, setSearchQuery] = useState("");
	const [selectedUser, setSelectedUser] = useState<SearchUserResult | null>(null);
	const [tokenAmount, setTokenAmount] = useState("");
	const [reason, setReason] = useState("");
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [success, setSuccess] = useState<string | null>(null);

	// Search users query
	const searchResults = useQuery(
		api.billing.admin.searchUsers,
		searchQuery.length >= 2 ? { query: searchQuery, limit: 5 } : "skip"
	) as SearchUserResult[] | undefined;

	// Mutations
	const grantTokens = useMutation(api.billing.admin.grantTokens);
	const deductTokens = useMutation(api.billing.admin.deductTokens);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!selectedUser || !tokenAmount || !reason) return;

		const amount = Number.parseInt(tokenAmount, 10);
		if (Number.isNaN(amount) || amount <= 0) {
			setError("Please enter a valid positive number");
			return;
		}

		setIsSubmitting(true);
		setError(null);
		setSuccess(null);

		try {
			if (mode === "grant") {
				const result = await grantTokens({
					targetUserId: selectedUser._id,
					tokenAmount: amount,
					reason,
				});
				setSuccess(`Successfully granted ${amount.toLocaleString()} tokens. New balance: ${result.newBalance.toLocaleString()}`);
			} else {
				const result = await deductTokens({
					targetUserId: selectedUser._id,
					tokenAmount: amount,
					reason,
				});
				setSuccess(`Successfully deducted ${amount.toLocaleString()} tokens. New balance: ${result.newBalance.toLocaleString()}`);
			}
			// Reset form after success
			setSelectedUser(null);
			setTokenAmount("");
			setReason("");
			setSearchQuery("");
		} catch (err) {
			setError(err instanceof Error ? err.message : "An error occurred");
		} finally {
			setIsSubmitting(false);
		}
	};

	const isGrant = mode === "grant";

	return (
		<div className="fixed inset-0 z-50 overflow-y-auto">
			{/* Backdrop */}
			<div
				className="fixed inset-0 bg-black/50 transition-opacity"
				onClick={onClose}
			/>

			{/* Modal */}
			<div className="flex min-h-full items-center justify-center p-4">
				<div className="relative w-full max-w-lg transform rounded-xl bg-white dark:bg-slate-900 shadow-xl transition-all">
					{/* Header */}
					<div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 px-6 py-4">
						<div className="flex items-center gap-3">
							<div className={`p-2 rounded-lg ${isGrant ? "bg-green-100 dark:bg-green-900/20" : "bg-red-100 dark:bg-red-900/20"}`}>
								{isGrant ? (
									<Plus className={`w-5 h-5 ${isGrant ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`} />
								) : (
									<Minus className="w-5 h-5 text-red-600 dark:text-red-400" />
								)}
							</div>
							<h2 className="text-lg font-semibold text-slate-900 dark:text-white">
								{isGrant ? "Grant Tokens" : "Deduct Tokens"}
							</h2>
						</div>
						<button
							type="button"
							onClick={onClose}
							className="p-2 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
						>
							<X className="w-5 h-5" />
						</button>
					</div>

					{/* Content */}
					<form onSubmit={handleSubmit} className="p-6 space-y-6">
						{/* Error/Success Messages */}
						{error && (
							<div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400">
								<AlertCircle className="w-5 h-5 flex-shrink-0" />
								<p className="text-sm">{error}</p>
							</div>
						)}
						{success && (
							<div className="flex items-center gap-2 p-3 rounded-lg bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400">
								<CheckCircle2 className="w-5 h-5 flex-shrink-0" />
								<p className="text-sm">{success}</p>
							</div>
						)}

						{/* User Search */}
						<div>
							<label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
								Search User
							</label>
							<div className="relative">
								<Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
								<input
									type="text"
									value={searchQuery}
									onChange={(e) => {
										setSearchQuery(e.target.value);
										setSelectedUser(null);
									}}
									placeholder="Search by email or name..."
									className="w-full pl-10 pr-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
								/>
							</div>

							{/* Search Results */}
							{searchResults && searchResults.length > 0 && !selectedUser && (
								<div className="mt-2 border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
									{searchResults.map((user) => (
										<button
											key={user._id}
											type="button"
											onClick={() => {
												setSelectedUser(user);
												setSearchQuery(user.email || user.name || "");
											}}
											className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-left"
										>
											{user.imageUrl ? (
												<img
													src={user.imageUrl}
													alt={user.name || "User"}
													className="w-8 h-8 rounded-full"
												/>
											) : (
												<div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center">
													<span className="text-xs font-medium text-slate-600 dark:text-slate-400">
														{user.name?.charAt(0) || "?"}
													</span>
												</div>
											)}
											<div className="flex-1 min-w-0">
												<p className="text-sm font-medium text-slate-900 dark:text-white truncate">
													{user.name || "Unknown"}
												</p>
												<p className="text-xs text-slate-500 dark:text-slate-400 truncate">
													{user.email}
												</p>
											</div>
											{user.tokenAccount && (
												<div className="text-right">
													<p className="text-sm font-semibold text-cyan-600 dark:text-cyan-400">
														{user.tokenAccount.balance.toLocaleString()}
													</p>
													<p className="text-xs text-slate-500 dark:text-slate-400">
														tokens
													</p>
												</div>
											)}
										</button>
									))}
								</div>
							)}

							{searchQuery.length >= 2 && searchResults?.length === 0 && (
								<p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
									No users found matching "{searchQuery}"
								</p>
							)}
						</div>

						{/* Selected User Display */}
						{selectedUser && (
							<div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
								{selectedUser.imageUrl ? (
									<img
										src={selectedUser.imageUrl}
										alt={selectedUser.name || "User"}
										className="w-10 h-10 rounded-full"
									/>
								) : (
									<div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center">
										<span className="text-sm font-medium text-slate-600 dark:text-slate-400">
											{selectedUser.name?.charAt(0) || "?"}
										</span>
									</div>
								)}
								<div className="flex-1">
									<p className="text-sm font-medium text-slate-900 dark:text-white">
										{selectedUser.name || "Unknown User"}
									</p>
									<p className="text-xs text-slate-500 dark:text-slate-400">
										{selectedUser.email}
									</p>
								</div>
								<div className="text-right">
									<p className="text-sm font-semibold text-cyan-600 dark:text-cyan-400">
										{selectedUser.tokenAccount?.balance.toLocaleString() ?? 0}
									</p>
									<p className="text-xs text-slate-500 dark:text-slate-400">
										current balance
									</p>
								</div>
								<button
									type="button"
									onClick={() => {
										setSelectedUser(null);
										setSearchQuery("");
									}}
									className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
								>
									<X className="w-4 h-4 text-slate-400" />
								</button>
							</div>
						)}

						{/* Token Amount */}
						<div>
							<label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
								Token Amount
							</label>
							<input
								type="number"
								value={tokenAmount}
								onChange={(e) => setTokenAmount(e.target.value)}
								placeholder="Enter amount..."
								min="1"
								className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
							/>
							{tokenAmount && selectedUser?.tokenAccount && (
								<p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
									New balance will be:{" "}
									<span className={isGrant ? "text-green-600" : "text-red-600"}>
										{isGrant
											? (selectedUser.tokenAccount.balance + Number.parseInt(tokenAmount, 10) || 0).toLocaleString()
											: (selectedUser.tokenAccount.balance - Number.parseInt(tokenAmount, 10) || 0).toLocaleString()
										}
									</span>
								</p>
							)}
						</div>

						{/* Reason */}
						<div>
							<label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
								Reason
							</label>
							<textarea
								value={reason}
								onChange={(e) => setReason(e.target.value)}
								placeholder="Enter reason for this action..."
								rows={3}
								className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent resize-none"
							/>
						</div>

						{/* Actions */}
						<div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
							<button
								type="button"
								onClick={onClose}
								className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
							>
								Cancel
							</button>
							<button
								type="submit"
								disabled={!selectedUser || !tokenAmount || !reason || isSubmitting}
								className={`px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
									isGrant
										? "bg-green-600 hover:bg-green-700"
										: "bg-red-600 hover:bg-red-700"
								}`}
							>
								{isSubmitting ? (
									<span className="flex items-center gap-2">
										<svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
											<circle
												className="opacity-25"
												cx="12"
												cy="12"
												r="10"
												stroke="currentColor"
												strokeWidth="4"
												fill="none"
											/>
											<path
												className="opacity-75"
												fill="currentColor"
												d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
											/>
										</svg>
										Processing...
									</span>
								) : isGrant ? (
									"Grant Tokens"
								) : (
									"Deduct Tokens"
								)}
							</button>
						</div>
					</form>
				</div>
			</div>
		</div>
	);
}
