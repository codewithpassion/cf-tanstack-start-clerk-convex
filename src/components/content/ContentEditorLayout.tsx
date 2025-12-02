/**
 * ContentEditorLayout component provides a responsive layout for the content editor
 * with an optional tools panel.
 *
 * Layout:
 * - Mobile: Editor on top, tools panel below (stacked vertically)
 * - Desktop: Editor on left (~70%), tools panel on right (~30%)
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
 * Responsive layout for content editor with tools panel.
 * Stacks vertically on mobile, side-by-side on desktop.
 */
export function ContentEditorLayout({
	editor,
	toolsPanel,
}: ContentEditorLayoutProps) {
	return (
		<div
			className="flex flex-col lg:flex-row gap-4 lg:gap-6 h-full w-full"
			data-testid="editor-layout"
		>
			{/* Main editor area - full width on mobile, flexible on desktop */}
			<div className="flex-1 min-w-0 order-1">{editor}</div>

			{/* Tools panel - full width on mobile, fixed width on desktop */}
			{toolsPanel && (
				<div className="w-full lg:w-80 flex-shrink-0 order-2">{toolsPanel}</div>
			)}
		</div>
	);
}
