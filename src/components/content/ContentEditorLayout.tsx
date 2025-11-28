/**
 * ContentEditorLayout component provides a responsive layout for the content editor
 * with an optional AI chat panel.
 *
 * Layout: Editor takes full width, AI panel positioned below
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
 * Vertical layout for content editor with AI panel below.
 */
export function ContentEditorLayout({ editor, aiPanel }: ContentEditorLayoutProps) {
	return (
		<div className="flex flex-col gap-6 w-full" data-testid="editor-layout">
			{/* Main editor area - full width */}
			<div className="w-full">
				{editor}
			</div>

			{/* AI panel - below editor, full width */}
			{aiPanel && (
				<div className="w-full">
					{aiPanel}
				</div>
			)}
		</div>
	);
}
