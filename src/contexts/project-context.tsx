import { createContext, useContext, useState, useLayoutEffect, useRef, useMemo, type ReactNode } from "react";
import type { Project } from "@/types/entities";

export interface ProjectContextValue {
	project: Project | null;
	onOpenBrandVoices: () => void;
	onOpenPersonas: () => void;
	onOpenKnowledgeBase: () => void;
	onOpenExamples: () => void;
}

interface ProjectContextState {
	value: ProjectContextValue | null;
	setProject: (project: Project | null) => void;
	setCallbacks: (callbacks: {
		onOpenBrandVoices: () => void;
		onOpenPersonas: () => void;
		onOpenKnowledgeBase: () => void;
		onOpenExamples: () => void;
	}) => void;
}

const ProjectContext = createContext<ProjectContextState | null>(null);

/**
 * Root provider for project context - placed in __root.tsx
 * Provides the state container that child components can update
 */
export function ProjectContextProvider({ children }: { children: ReactNode }) {
	const [project, setProject] = useState<Project | null>(null);
	const callbacksRef = useRef<{
		onOpenBrandVoices: () => void;
		onOpenPersonas: () => void;
		onOpenKnowledgeBase: () => void;
		onOpenExamples: () => void;
	} | null>(null);

	const setCallbacks = useMemo(
		() => (callbacks: {
			onOpenBrandVoices: () => void;
			onOpenPersonas: () => void;
			onOpenKnowledgeBase: () => void;
			onOpenExamples: () => void;
		}) => {
			callbacksRef.current = callbacks;
		},
		[]
	);

	const contextState = useMemo(
		(): ProjectContextState => ({
			value: project
				? {
						project,
						onOpenBrandVoices: () => callbacksRef.current?.onOpenBrandVoices(),
						onOpenPersonas: () => callbacksRef.current?.onOpenPersonas(),
						onOpenKnowledgeBase: () => callbacksRef.current?.onOpenKnowledgeBase(),
						onOpenExamples: () => callbacksRef.current?.onOpenExamples(),
					}
				: null,
			setProject,
			setCallbacks,
		}),
		[project, setCallbacks]
	);

	return (
		<ProjectContext.Provider value={contextState}>
			{children}
		</ProjectContext.Provider>
	);
}

export interface ProjectProviderProps {
	children: ReactNode;
	project: Project | null;
	onOpenBrandVoices: () => void;
	onOpenPersonas: () => void;
	onOpenKnowledgeBase: () => void;
	onOpenExamples: () => void;
}

/**
 * Sets the project context value - used in ProjectLayout
 * Updates the root context when project data is available
 */
export function ProjectProvider({
	children,
	project,
	onOpenBrandVoices,
	onOpenPersonas,
	onOpenKnowledgeBase,
	onOpenExamples,
}: ProjectProviderProps) {
	const context = useContext(ProjectContext);

	// Store callbacks in a ref to avoid them being dependencies
	const callbacksRef = useRef({
		onOpenBrandVoices,
		onOpenPersonas,
		onOpenKnowledgeBase,
		onOpenExamples,
	});

	// Update ref synchronously on every render
	callbacksRef.current = {
		onOpenBrandVoices,
		onOpenPersonas,
		onOpenKnowledgeBase,
		onOpenExamples,
	};

	// Use layout effect to update synchronously before paint
	// Only depend on project changes, not callback changes
	useLayoutEffect(() => {
		if (context) {
			context.setProject(project);
			context.setCallbacks(callbacksRef.current);
		}

		return () => {
			if (context) {
				context.setProject(null);
			}
		};
	}, [context, project]);

	return <>{children}</>;
}

/**
 * Hook to access project context - used in Header
 */
export function useProjectContext() {
	const context = useContext(ProjectContext);
	return context?.value ?? null;
}
