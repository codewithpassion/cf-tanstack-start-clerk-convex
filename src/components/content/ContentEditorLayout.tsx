/**
 * ContentEditorLayout component provides a responsive layout for the content editor
 * with an optional tools panel.
 *
 * Layout: Editor on the left (~70%), Tools panel on the right (~30%)
 */
import type { ReactNode } from "react";

export interface ContentEditorLayoutProps {
	/**
	 * The main editor component to render.
	 */
	editor: ReactNode;

	/**
	 * Optional tools panel component to render.
	 */
	toolsPanel: ReactNode | null;
}

/**
 * Horizontal layout for content editor with tools panel on the right.
 */
export function ContentEditorLayout({
	editor,
	toolsPanel,
}: ContentEditorLayoutProps) {
	return (
		<div className="flex gap-6 h-full w-full" data-testid="editor-layout">
			{/* Main editor area - flexible width, grows to fill space */}
			<div className="flex-1 min-w-0">{editor}</div>

			{/* Tools panel - fixed width on the right, always visible */}
			{toolsPanel && (
				<div className="w-80 flex-shrink-0">{toolsPanel}</div>
			)}
		</div>
	);
}
