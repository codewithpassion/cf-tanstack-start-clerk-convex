import { Outlet } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { ProjectId } from "@/types/entities";
import { LoadingState } from "../shared/LoadingState";
import { useModalQueryParam } from "@/hooks/useModalQueryParam";
import { BrandVoicesModal } from "../brand-voices/BrandVoicesModal";
import { PersonasModal } from "../personas/PersonasModal";
import { KnowledgeBaseModal } from "../knowledge-base/KnowledgeBaseModal";
import { ExamplesModal } from "../examples/ExamplesModal";
import { ProjectProvider } from "@/contexts/project-context";

export interface ProjectLayoutProps {
	projectId: ProjectId;
}

/**
 * Layout wrapper for all project pages.
 * Provides project context to header and renders modals.
 * No longer renders ProjectHeader - navigation is in the global header.
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
		<ProjectProvider
			project={project}
			onOpenBrandVoices={openBrandVoices}
			onOpenPersonas={openPersonas}
			onOpenKnowledgeBase={openKnowledgeBase}
			onOpenExamples={openExamples}
		>
			<div className="min-h-screen flex flex-col bg-slate-950">
				<main className="flex-1 flex flex-col overflow-hidden">
					<Outlet />
				</main>

				{/* Configuration Modals */}
				{brandVoicesOpen && <BrandVoicesModal isOpen onClose={closeBrandVoices} projectId={projectId} />}
				{personasOpen && <PersonasModal isOpen onClose={closePersonas} projectId={projectId} />}
				{knowledgeBaseOpen && <KnowledgeBaseModal isOpen onClose={closeKnowledgeBase} projectId={projectId} />}
				{examplesOpen && <ExamplesModal isOpen onClose={closeExamples} projectId={projectId} />}
			</div>
		</ProjectProvider>
	);
}
