import { useState } from "react";

/**
 * Return type for the useStreamingResponse hook
 */
export interface UseStreamingResponseReturn {
	content: string;
	isStreaming: boolean;
	isComplete: boolean;
	error: string | null;
	startStream: (response: Response) => Promise<string>;
	reset: () => void;
}

/**
 * Hook for handling streaming text responses from server functions.
 *
 * Manages the state and logic for reading a streaming Response.body,
 * decoding chunks with TextDecoder, and accumulating the content.
 *
 * @example
 * ```tsx
 * const { content, isStreaming, startStream, reset } = useStreamingResponse();
 *
 * const handleGenerate = async () => {
 *   const response = await generateContent({ data: { ... } });
 *   await startStream(response);
 *   // Content is now complete
 * };
 * ```
 */
export function useStreamingResponse(): UseStreamingResponseReturn {
	const [content, setContent] = useState("");
	const [isStreaming, setIsStreaming] = useState(false);
	const [isComplete, setIsComplete] = useState(false);
	const [error, setError] = useState<string | null>(null);

	/**
	 * Start streaming from a Response object.
	 *
	 * Reads the response body as a stream, decodes chunks, and accumulates content.
	 * Updates the content state as each chunk arrives for real-time display.
	 *
	 * @param response - The Response object with a readable body stream
	 * @returns Promise that resolves with the complete content when streaming finishes
	 * @throws Error if the response has no body or streaming fails
	 */
	const startStream = async (response: Response): Promise<string> => {
		setIsStreaming(true);
		setIsComplete(false);
		setContent("");
		setError(null);

		try {
			const reader = response.body?.getReader();
			if (!reader) {
				throw new Error("No response body");
			}

			const decoder = new TextDecoder();
			let fullContent = "";

			while (true) {
				const { done, value } = await reader.read();
				if (done) break;

				const chunk = decoder.decode(value, { stream: true });
				fullContent += chunk;
				setContent(fullContent);
			}

			setIsStreaming(false);
			setIsComplete(true);
			return fullContent;
		} catch (err) {
			const message = err instanceof Error ? err.message : "Streaming failed";
			setError(message);
			setIsStreaming(false);
			throw err;
		}
	};

	/**
	 * Reset all state to initial values.
	 *
	 * Useful for clearing the hook state when starting a new stream
	 * or when unmounting/resetting the component.
	 */
	const reset = () => {
		setContent("");
		setIsStreaming(false);
		setIsComplete(false);
		setError(null);
	};

	return {
		content,
		isStreaming,
		isComplete,
		error,
		startStream,
		reset,
	};
}
