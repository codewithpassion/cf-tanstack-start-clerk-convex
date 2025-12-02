import { useEffect, useRef } from "react";
import Markdown from "react-markdown";

/**
 * Props for the StreamingMarkdown component
 */
export interface StreamingMarkdownProps {
	/**
	 * The markdown content to render
	 */
	content: string;

	/**
	 * Whether content is currently streaming
	 */
	isStreaming: boolean;

	/**
	 * Optional className for the container
	 */
	className?: string;

	/**
	 * Message to show when there's no content yet
	 * @default "Waiting for content..."
	 */
	emptyMessage?: string;
}

/**
 * Component for displaying streaming markdown content with auto-scroll and cursor animation.
 *
 * Features:
 * - Renders markdown using react-markdown
 * - Shows animated blinking cursor while streaming
 * - Auto-scrolls to bottom as new content arrives
 * - Shows empty state when no content
 *
 * @example
 * ```tsx
 * const { content, isStreaming } = useStreamingResponse();
 *
 * <StreamingMarkdown
 *   content={content}
 *   isStreaming={isStreaming}
 *   emptyMessage="Generating content..."
 * />
 * ```
 */
export function StreamingMarkdown({
	content,
	isStreaming,
	className = "",
	emptyMessage = "Waiting for content...",
}: StreamingMarkdownProps) {
	const contentEndRef = useRef<HTMLDivElement>(null);

	// Auto-scroll to bottom as content streams in
	useEffect(() => {
		if (content && contentEndRef.current) {
			contentEndRef.current.scrollIntoView({ behavior: "smooth" });
		}
	}, [content]);

	// Show empty state if no content and not streaming
	if (!content && !isStreaming) {
		return (
			<div className="flex items-center justify-center h-full text-slate-400">
				<div className="text-center">
					<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-600 mx-auto mb-3" />
					<p>{emptyMessage}</p>
				</div>
			</div>
		);
	}

	return (
		<div className={className}>
			<div className="prose prose-sm max-w-none prose-headings:text-slate-900 prose-p:text-slate-700 prose-strong:text-slate-900 prose-li:text-slate-700">
				<Markdown>{content}</Markdown>
				{isStreaming && (
					<span className="inline-block w-2 h-4 bg-cyan-600 animate-pulse ml-1" />
				)}
				<div ref={contentEndRef} />
			</div>
		</div>
	);
}
