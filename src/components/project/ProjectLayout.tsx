import { Outlet } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { ProjectId } from "@/types/entities";
import { ProjectHeader } from "./ProjectHeader";
import { LoadingState } from "../shared/LoadingState";
import { useModalQueryParam } from "@/hooks/useModalQueryParam";
import { BrandVoicesModal } from "../brand-voices/BrandVoicesModal";
import { PersonasModal } from "../personas/PersonasModal";
import { KnowledgeBaseModal } from "../knowledge-base/KnowledgeBaseModal";
import { ExamplesModal } from "../examples/ExamplesModal";

export interface ProjectLayoutProps {
	projectId: ProjectId;
}

/**
 * Layout wrapper for all project pages.
 * Includes header with configuration buttons and content area.
 * Configuration panels are displayed in modals.
 */
export function ProjectLayout({ projectId }: ProjectLayoutProps) {
	const project = useQuery(api.projects.getProject, { projectId });

	// Modal state management via query params
	const [brandVoicesOpen, openBrandVoices, closeBrandVoices] = useModalQueryParam("brand-voices");
	const [personasOpen, openPersonas, closePersonas] = useModalQueryParam("personas");
	const [knowledgeBaseOpen, openKnowledgeBase, closeKnowledgeBase] = useModalQueryParam("knowledge-base");
	const [examplesOpen, openExamples, closeExamples] = useModalQueryParam("examples");

	if (project === undefined) {
		return <LoadingState message="Loading project..." />;
	}

	if (project === null) {
		return (
			<div className="max-w-4xl mx-auto py-12">
				<div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
					<h2 className="text-xl font-semibold text-red-900 dark:text-red-100 mb-2">Project not found</h2>
					<p className="text-red-700 dark:text-red-300">
						The project you're looking for doesn't exist or you don't have access to it.
					</p>
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen flex flex-col">
			<ProjectHeader
				project={project}
				onOpenBrandVoices={openBrandVoices}
				onOpenPersonas={openPersonas}
				onOpenKnowledgeBase={openKnowledgeBase}
				onOpenExamples={openExamples}
			/>

			<main className="flex-1 overflow-y-auto bg-gradient-to-br from-slate-50 via-amber-50/20 to-slate-50 dark:bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] dark:from-amber-950/20 dark:via-slate-950 dark:to-slate-950">
				<div className="max-w-7xl mx-auto sm:p-4 md:p-6">
					<Outlet />
				</div>
			</main>

			{/* Configuration Modals */}
			{brandVoicesOpen && <BrandVoicesModal isOpen onClose={closeBrandVoices} projectId={projectId} />}
			{personasOpen && <PersonasModal isOpen onClose={closePersonas} projectId={projectId} />}
			{knowledgeBaseOpen && <KnowledgeBaseModal isOpen onClose={closeKnowledgeBase} projectId={projectId} />}
			{examplesOpen && <ExamplesModal isOpen onClose={closeExamples} projectId={projectId} />}
		</div>
	);
}
