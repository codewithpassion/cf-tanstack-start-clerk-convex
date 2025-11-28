/**
 * ContentEditorLayout component provides a responsive layout for the content editor
 * with an optional AI chat panel.
 *
 * Desktop: Editor takes 60-70% width, AI panel 30-40% width
 * Mobile: Full-width editor, AI panel slides from bottom or hidden
 */
import type { ReactNode } from "react";

export interface ContentEditorLayoutProps {
	/**
	 * The main editor component to render.
	 */
	editor: ReactNode;

	/**
	 * Optional AI chat panel component to render.
	 */
	aiPanel: ReactNode | null;
}

/**
 * Responsive layout for content editor with optional AI panel.
 */
export function ContentEditorLayout({ editor, aiPanel }: ContentEditorLayoutProps) {
	return (
		<div className="flex flex-col lg:flex-row gap-6 h-full" data-testid="editor-layout">
			{/* Main editor area - 60-70% width on desktop, full width on mobile */}
			<div className="flex-1 lg:w-[65%] min-w-0">
				<div className="h-full">{editor}</div>
			</div>

			{/* AI panel - 30-40% width on desktop, bottom sheet on mobile */}
			{aiPanel && (
				<div className="lg:w-[35%] lg:min-w-[350px] lg:max-w-[500px]">
					<div className="lg:sticky lg:top-4 h-full">{aiPanel}</div>
				</div>
			)}
		</div>
	);
}
