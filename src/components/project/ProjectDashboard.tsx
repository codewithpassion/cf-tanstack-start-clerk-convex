import { Link } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { api } from "@/convex/api";
import type { Id } from "@/convex/dataModel";
import type { ProjectId } from "@/types/entities";
import { LoadingState } from "@/components/shared/LoadingState";

export interface ProjectDashboardProps {
	projectId: ProjectId;
}

/**
 * Project dashboard overview.
 * Shows stats, overview cards, and recent content for a project.
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

	const knowledgeBaseItems = useQuery(api.knowledgeBase.listKnowledgeBaseItemsByProject, {
		projectId: projectId as Id<"projects">,
	});

	const examples = useQuery(api.examples.listExamplesByProject, {
		projectId: projectId as Id<"projects">,
	});

	// Loading state
	if (
		contentPiecesResult === undefined ||
		categories === undefined ||
		personas === undefined ||
		brandVoices === undefined ||
		knowledgeBaseItems === undefined ||
		examples === undefined
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
		<div className="p-6 space-y-6">
			{/* Stats Row */}
			<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
				<div className="bg-white overflow-hidden shadow rounded-lg">
					<div className="p-5">
						<div className="flex items-center">
							<div className="flex-shrink-0">
								<svg
									className="h-6 w-6 text-gray-400"
									fill="none"
									viewBox="0 0 24 24"
									stroke="currentColor"
								>
									<title>Content</title>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={2}
										d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
									/>
								</svg>
							</div>
							<div className="ml-5 w-0 flex-1">
								<dl>
									<dt className="text-sm font-medium text-gray-500 truncate">Total Content</dt>
									<dd className="text-2xl font-semibold text-gray-900">{totalCount}</dd>
								</dl>
							</div>
						</div>
					</div>
				</div>

				<div className="bg-white overflow-hidden shadow rounded-lg">
					<div className="p-5">
						<div className="flex items-center">
							<div className="flex-shrink-0">
								<svg
									className="h-6 w-6 text-yellow-400"
									fill="none"
									viewBox="0 0 24 24"
									stroke="currentColor"
								>
									<title>Drafts</title>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={2}
										d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
									/>
								</svg>
							</div>
							<div className="ml-5 w-0 flex-1">
								<dl>
									<dt className="text-sm font-medium text-gray-500 truncate">Drafts</dt>
									<dd className="text-2xl font-semibold text-gray-900">{draftCount}</dd>
								</dl>
							</div>
						</div>
					</div>
				</div>

				<div className="bg-white overflow-hidden shadow rounded-lg">
					<div className="p-5">
						<div className="flex items-center">
							<div className="flex-shrink-0">
								<svg
									className="h-6 w-6 text-green-400"
									fill="none"
									viewBox="0 0 24 24"
									stroke="currentColor"
								>
									<title>Finalized</title>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={2}
										d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
									/>
								</svg>
							</div>
							<div className="ml-5 w-0 flex-1">
								<dl>
									<dt className="text-sm font-medium text-gray-500 truncate">Finalized</dt>
									<dd className="text-2xl font-semibold text-gray-900">{finalizedCount}</dd>
								</dl>
							</div>
						</div>
					</div>
				</div>

				<div className="bg-white overflow-hidden shadow rounded-lg">
					<div className="p-5">
						<div className="flex items-center">
							<div className="flex-shrink-0">
								<svg
									className="h-6 w-6 text-cyan-400"
									fill="none"
									viewBox="0 0 24 24"
									stroke="currentColor"
								>
									<title>Categories</title>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={2}
										d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
									/>
								</svg>
							</div>
							<div className="ml-5 w-0 flex-1">
								<dl>
									<dt className="text-sm font-medium text-gray-500 truncate">Categories</dt>
									<dd className="text-2xl font-semibold text-gray-900">{categories.length}</dd>
								</dl>
							</div>
						</div>
					</div>
				</div>
			</div>

			{/* Overview Cards */}
			<div>
				<h2 className="text-lg font-medium text-gray-900 mb-4">Configuration Overview</h2>
				<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
					<Link
						to="/projects/$projectId/categories"
						params={{ projectId }}
						className="bg-white overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow"
					>
						<div className="p-5">
							<div className="flex items-center justify-between">
								<div>
									<p className="text-sm font-medium text-gray-500">Categories</p>
									<p className="mt-1 text-3xl font-semibold text-gray-900">{categories.length}</p>
								</div>
								<div className="flex-shrink-0">
									<svg
										className="h-8 w-8 text-gray-400"
										fill="none"
										viewBox="0 0 24 24"
										stroke="currentColor"
									>
										<title>Categories</title>
										<path
											strokeLinecap="round"
											strokeLinejoin="round"
											strokeWidth={2}
											d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
										/>
									</svg>
								</div>
							</div>
						</div>
					</Link>

					<Link
						to="/projects/$projectId/brand-voices"
						params={{ projectId }}
						className="bg-white overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow"
					>
						<div className="p-5">
							<div className="flex items-center justify-between">
								<div>
									<p className="text-sm font-medium text-gray-500">Brand Voices</p>
									<p className="mt-1 text-3xl font-semibold text-gray-900">{brandVoices.length}</p>
								</div>
								<div className="flex-shrink-0">
									<svg
										className="h-8 w-8 text-gray-400"
										fill="none"
										viewBox="0 0 24 24"
										stroke="currentColor"
									>
										<title>Brand Voices</title>
										<path
											strokeLinecap="round"
											strokeLinejoin="round"
											strokeWidth={2}
											d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
										/>
									</svg>
								</div>
							</div>
						</div>
					</Link>

					<Link
						to="/projects/$projectId/personas"
						params={{ projectId }}
						className="bg-white overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow"
					>
						<div className="p-5">
							<div className="flex items-center justify-between">
								<div>
									<p className="text-sm font-medium text-gray-500">Personas</p>
									<p className="mt-1 text-3xl font-semibold text-gray-900">{personas.length}</p>
								</div>
								<div className="flex-shrink-0">
									<svg
										className="h-8 w-8 text-gray-400"
										fill="none"
										viewBox="0 0 24 24"
										stroke="currentColor"
									>
										<title>Personas</title>
										<path
											strokeLinecap="round"
											strokeLinejoin="round"
											strokeWidth={2}
											d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
										/>
									</svg>
								</div>
							</div>
						</div>
					</Link>

					<Link
						to="/projects/$projectId/knowledge-base"
						params={{ projectId }}
						className="bg-white overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow"
					>
						<div className="p-5">
							<div className="flex items-center justify-between">
								<div>
									<p className="text-sm font-medium text-gray-500">Knowledge Base</p>
									<p className="mt-1 text-3xl font-semibold text-gray-900">
										{knowledgeBaseItems.length}
									</p>
								</div>
								<div className="flex-shrink-0">
									<svg
										className="h-8 w-8 text-gray-400"
										fill="none"
										viewBox="0 0 24 24"
										stroke="currentColor"
									>
										<title>Knowledge Base</title>
										<path
											strokeLinecap="round"
											strokeLinejoin="round"
											strokeWidth={2}
											d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
										/>
									</svg>
								</div>
							</div>
						</div>
					</Link>
				</div>
			</div>

			{/* Recent Content */}
			<div className="bg-white shadow rounded-lg">
				<div className="px-4 py-5 sm:px-6 flex items-center justify-between">
					<h2 className="text-lg font-medium text-gray-900">Recent Content</h2>
					<Link
						to="/projects/$projectId/content"
						params={{ projectId }}
						search={{ page: 1, pageSize: 25 }}
						className="text-sm font-medium text-cyan-600 hover:text-cyan-500"
					>
						View All →
					</Link>
				</div>
				<div className="border-t border-gray-200">
					{contentPieces.length === 0 ? (
						<div className="px-4 py-12 text-center">
							<p className="text-sm text-gray-500">No content yet</p>
							<Link
								to="/projects/$projectId/content/new"
								params={{ projectId }}
								className="mt-2 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-cyan-600 hover:bg-cyan-700"
							>
								Create your first content
							</Link>
						</div>
					) : (
						<ul className="divide-y divide-gray-200">
							{contentPieces.map((contentPiece) => {
								const category = categories.find((c) => c._id === contentPiece.categoryId);
								return (
									<li key={contentPiece._id}>
										<Link
											to="/projects/$projectId/content/$contentId"
											params={{ projectId, contentId: contentPiece._id }}
											className="block hover:bg-gray-50 transition-colors"
										>
											<div className="px-4 py-4 sm:px-6">
												<div className="flex items-center justify-between">
													<div className="flex-1 min-w-0">
														<p className="text-sm font-medium text-gray-900 truncate">
															{contentPiece.title}
														</p>
														{category && (
															<p className="text-sm text-gray-500 mt-1">{category.name}</p>
														)}
													</div>
													<div className="ml-4 flex items-center gap-4">
														<span
															className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
																contentPiece.status === "draft"
																	? "bg-yellow-100 text-yellow-800"
																	: "bg-green-100 text-green-800"
															}`}
														>
															{contentPiece.status === "draft" ? "Draft" : "Finalized"}
														</span>
														<span className="text-sm text-gray-500">
															{formatTimeAgo(contentPiece._creationTime)}
														</span>
													</div>
												</div>
											</div>
										</Link>
									</li>
								);
							})}
						</ul>
					)}
				</div>
			</div>
		</div>
	);
}
