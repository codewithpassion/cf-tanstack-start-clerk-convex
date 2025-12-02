import { Link } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { api } from "@/convex/api";
import type { Id } from "@/convex/dataModel";
import type { ProjectId } from "@/types/entities";
import { LoadingState } from "@/components/shared/LoadingState";
import { FileText, Users, MessageSquare, Layers, Plus, Settings, ArrowRight, Clock } from "lucide-react";

export interface ProjectDashboardProps {
	projectId: ProjectId;
}

/**
 * Project dashboard overview.
 * Shows stats, quick actions, and recent content for a project.
 */
export function ProjectDashboard({ projectId }: ProjectDashboardProps) {
	// Query all data needed for dashboard
	const contentPiecesResult = useQuery(api.contentPieces.listContentPieces, {
		projectId: projectId as Id<"projects">,
		filters: {},
		pagination: { limit: 5, offset: 0 },
	});

	const categories = useQuery(api.categories.listCategories, {
		projectId: projectId as Id<"projects">,
	});

	const personas = useQuery(api.personas.listPersonas, {
		projectId: projectId as Id<"projects">,
	});

	const brandVoices = useQuery(api.brandVoices.listBrandVoices, {
		projectId: projectId as Id<"projects">,
	});

	// Loading state
	if (
		contentPiecesResult === undefined ||
		categories === undefined ||
		personas === undefined ||
		brandVoices === undefined
	) {
		return <LoadingState message="Loading dashboard..." />;
	}

	const { contentPieces, totalCount } = contentPiecesResult;

	// Calculate stats
	const draftCount = contentPieces.filter((cp) => cp.status === "draft").length;
	const finalizedCount = contentPieces.filter((cp) => cp.status === "finalized").length;

	// Format time ago
	const formatTimeAgo = (timestamp: number) => {
		const now = Date.now();
		const diff = now - timestamp;
		const seconds = Math.floor(diff / 1000);
		const minutes = Math.floor(seconds / 60);
		const hours = Math.floor(minutes / 60);
		const days = Math.floor(hours / 24);

		if (days > 0) return `${days}d ago`;
		if (hours > 0) return `${hours}h ago`;
		if (minutes > 0) return `${minutes}m ago`;
		return "just now";
	};

	return (
		<div className="space-y-8">
			{/* Stats Row */}
			<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
				<div className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
					<div>
						<p className="text-sm font-medium text-slate-500 dark:text-slate-400">Total Content</p>
						<p className="text-2xl font-semibold text-slate-900 dark:text-white mt-1">{totalCount}</p>
					</div>
					<div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-lg">
						<FileText className="w-5 h-5 text-slate-600 dark:text-slate-400" />
					</div>
				</div>

				<div className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
					<div>
						<p className="text-sm font-medium text-slate-500 dark:text-slate-400">Drafts</p>
						<p className="text-2xl font-semibold text-slate-900 dark:text-white mt-1">{draftCount}</p>
					</div>
					<div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
						<FileText className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
					</div>
				</div>

				<div className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
					<div>
						<p className="text-sm font-medium text-slate-500 dark:text-slate-400">Finalized</p>
						<p className="text-2xl font-semibold text-slate-900 dark:text-white mt-1">{finalizedCount}</p>
					</div>
					<div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
						<FileText className="w-5 h-5 text-green-600 dark:text-green-400" />
					</div>
				</div>

				<div className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
					<div>
						<p className="text-sm font-medium text-slate-500 dark:text-slate-400">Assets</p>
						<div className="flex gap-3 mt-1 text-sm">
							<span className="font-medium text-slate-900 dark:text-white">{categories.length} Cats</span>
							<span className="text-slate-300 dark:text-slate-600">|</span>
							<span className="font-medium text-slate-900 dark:text-white">{personas.length} Personas</span>
						</div>
					</div>
					<div className="p-3 bg-cyan-50 dark:bg-cyan-900/20 rounded-lg">
						<Layers className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
					</div>
				</div>
			</div>

			<div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
				{/* Main Content - Recent Content */}
				<div className="lg:col-span-2 space-y-6">
					<div className="flex items-center justify-between">
						<h2 className="text-lg font-medium text-slate-900 dark:text-white">Recent Content</h2>
						<Link
							to="/projects/$projectId/content"
							params={{ projectId }}
							search={{ page: 1, pageSize: 25 }}
							className="text-sm font-medium text-cyan-600 hover:text-cyan-500 flex items-center gap-1"
						>
							View All <ArrowRight className="w-4 h-4" />
						</Link>
					</div>

					<div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
						{contentPieces.length === 0 ? (
							<div className="p-8 text-center">
								<div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 mb-4">
									<FileText className="w-6 h-6 text-slate-400" />
								</div>
								<h3 className="text-sm font-medium text-slate-900 dark:text-white">No content yet</h3>
								<p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Get started by creating your first piece of content.</p>
								<div className="mt-6">
									<Link
										to="/projects/$projectId/content/new"
										params={{ projectId }}
										className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-cyan-600 hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500"
									>
										<Plus className="-ml-1 mr-2 w-5 h-5" />
										Create Content
									</Link>
								</div>
							</div>
						) : (
							<div className="divide-y divide-slate-200 dark:divide-slate-800">
								{contentPieces.map((contentPiece) => {
									const category = categories.find((c) => c._id === contentPiece.categoryId);
									return (
										<Link
											key={contentPiece._id}
											to="/projects/$projectId/content/$contentId"
											params={{ projectId, contentId: contentPiece._id }}
											className="block p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
										>
											<div className="flex items-center justify-between">
												<div className="flex items-center gap-4 min-w-0">
													<div className={`p-2 rounded-lg ${contentPiece.status === "draft"
															? "bg-yellow-50 text-yellow-600 dark:bg-yellow-900/20 dark:text-yellow-400"
															: "bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400"
														}`}>
														<FileText className="w-5 h-5" />
													</div>
													<div className="min-w-0">
														<p className="text-sm font-medium text-slate-900 dark:text-white truncate">
															{contentPiece.title}
														</p>
														<div className="flex items-center gap-2 mt-1">
															{category && (
																<span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300">
																	{category.name}
																</span>
															)}
															<span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
																<Clock className="w-3 h-3" />
																{formatTimeAgo(contentPiece._creationTime)}
															</span>
														</div>
													</div>
												</div>
												<div className="flex items-center gap-4">
													<span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${contentPiece.status === "draft"
															? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200"
															: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200"
														}`}>
														{contentPiece.status === "draft" ? "Draft" : "Finalized"}
													</span>
													<ArrowRight className="w-4 h-4 text-slate-400" />
												</div>
											</div>
										</Link>
									);
								})}
							</div>
						)}
					</div>
				</div>

				{/* Sidebar - Quick Actions */}
				<div className="space-y-6">
					<h2 className="text-lg font-medium text-slate-900 dark:text-white">Quick Actions</h2>
					<div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 space-y-2">
						<Link
							to="/projects/$projectId/content/new"
							params={{ projectId }}
							className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors group"
						>
							<div className="p-2 bg-cyan-50 dark:bg-cyan-900/20 rounded-lg group-hover:bg-cyan-100 dark:group-hover:bg-cyan-900/30 transition-colors">
								<Plus className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
							</div>
							<div>
								<p className="text-sm font-medium text-slate-900 dark:text-white">New Content</p>
								<p className="text-xs text-slate-500 dark:text-slate-400">Create a new post or article</p>
							</div>
						</Link>

						<Link
							to="/projects/$projectId/personas"
							params={{ projectId }}
							className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors group"
						>
							<div className="p-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg group-hover:bg-purple-100 dark:group-hover:bg-purple-900/30 transition-colors">
								<Users className="w-5 h-5 text-purple-600 dark:text-purple-400" />
							</div>
							<div>
								<p className="text-sm font-medium text-slate-900 dark:text-white">Manage Personas</p>
								<p className="text-xs text-slate-500 dark:text-slate-400">Add or edit audience personas</p>
							</div>
						</Link>

						<Link
							to="/projects/$projectId/brand-voices"
							params={{ projectId }}
							className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors group"
						>
							<div className="p-2 bg-pink-50 dark:bg-pink-900/20 rounded-lg group-hover:bg-pink-100 dark:group-hover:bg-pink-900/30 transition-colors">
								<MessageSquare className="w-5 h-5 text-pink-600 dark:text-pink-400" />
							</div>
							<div>
								<p className="text-sm font-medium text-slate-900 dark:text-white">Brand Voices</p>
								<p className="text-xs text-slate-500 dark:text-slate-400">Configure tone and style</p>
							</div>
						</Link>

						<div className="h-px bg-slate-100 dark:bg-slate-800 my-2" />

						<Link
							to="/projects/$projectId/settings"
							params={{ projectId }}
							className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors group"
						>
							<div className="p-2 bg-slate-50 dark:bg-slate-800 rounded-lg group-hover:bg-slate-100 dark:group-hover:bg-slate-700 transition-colors">
								<Settings className="w-5 h-5 text-slate-600 dark:text-slate-400" />
							</div>
							<div>
								<p className="text-sm font-medium text-slate-900 dark:text-white">Project Settings</p>
								<p className="text-xs text-slate-500 dark:text-slate-400">General configuration</p>
							</div>
						</Link>
					</div>
				</div>
			</div>
		</div>
	);
}
