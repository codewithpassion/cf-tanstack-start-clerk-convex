import { useState, useEffect } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { generateDraft } from "@/server/ai";

export interface GenerationStepProps {
	projectId: Id<"projects">;
	categoryId: Id<"categories">;
	personaId: Id<"personas"> | null;
	brandVoiceId: Id<"brandVoices"> | null;
	title: string;
	topic: string;
	draftContent: string;
	onComplete: (contentPieceId: Id<"contentPieces">, content: string) => void;
}

type GenerationState = "creating" | "streaming" | "complete" | "error";

/**
 * Step 6: AI draft generation with streaming display.
 * Creates content piece then streams AI-generated content.
 */
export function GenerationStep({
	projectId,
	categoryId,
	personaId,
	brandVoiceId,
	title,
	topic,
	draftContent,
	onComplete,
}: GenerationStepProps) {
	const createContentPiece = useMutation(api.contentPieces.createContentPiece);
	const updateContentPiece = useMutation(api.contentPieces.updateContentPiece);

	const [state, setState] = useState<GenerationState>("creating");
	const [streamedContent, setStreamedContent] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [contentPieceId, setContentPieceId] =
		useState<Id<"contentPieces"> | null>(null);

	useEffect(() => {
		let cancelled = false;

		async function generate() {
			try {
				// First, create the content piece
				const pieceId = await createContentPiece({
					projectId,
					categoryId,
					personaId: personaId || undefined,
					brandVoiceId: brandVoiceId || undefined,
					title,
					content: draftContent || "Generating...",
				});

				if (cancelled) return;

				setContentPieceId(pieceId.contentPieceId);
				setState("streaming");

				// Now generate the actual content using AI
				const response = await generateDraft({
					data: {
						contentPieceId: pieceId.contentPieceId,
						categoryId,
						personaId: personaId || undefined,
						brandVoiceId: brandVoiceId || undefined,
						title,
						topic,
						draftContent,
					},
				});

				if (cancelled) return;

				// Handle the streaming response
				let fullContent = "";

				// Read the response body as a text stream
				const reader = response.body?.getReader();
				const decoder = new TextDecoder();

				if (!reader) {
					throw new Error("No response body");
				}

				while (true) {
					const { done, value } = await reader.read();

					if (done || cancelled) break;

					const chunk = decoder.decode(value, { stream: true });
					fullContent += chunk;
					setStreamedContent(fullContent);
				}

				if (cancelled) return;

				// Update the content piece with the final generated content
				await updateContentPiece({
					contentPieceId: pieceId.contentPieceId,
					content: fullContent,
				});

				if (cancelled) return;

				setState("complete");
			} catch (err) {
				if (cancelled) return;

				console.error("Generation error:", err);
				setError(err instanceof Error ? err.message : "Generation failed");
				setState("error");
			}
		}

		generate();

		return () => {
			cancelled = true;
		};
	}, [
		projectId,
		categoryId,
		personaId,
		brandVoiceId,
		title,
		topic,
		draftContent,
		createContentPiece,
		updateContentPiece,
	]);

	// When generation is complete, notify parent
	useEffect(() => {
		if (state === "complete" && contentPieceId && streamedContent) {
			onComplete(contentPieceId, streamedContent);
		}
	}, [state, contentPieceId, streamedContent, onComplete]);

	if (state === "error") {
		return (
			<div className="flex flex-col items-center justify-center p-8">
				<div className="text-red-600 mb-4">
					<svg
						className="w-16 h-16"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<title>Error generating content</title>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth={2}
							d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
						/>
					</svg>
				</div>
				<h3 className="text-lg font-semibold text-gray-900 mb-2">
					Generation Failed
				</h3>
				<p className="text-gray-600 mb-4">{error}</p>
				<button
					type="button"
					onClick={() => window.location.reload()}
					className="px-4 py-2 bg-cyan-600 text-white rounded-md hover:bg-cyan-700"
				>
					Try Again
				</button>
			</div>
		);
	}

	return (
		<div className="flex flex-col h-full p-6">
			<div className="mb-6">
				<h2 className="text-2xl font-bold text-gray-900 mb-2">
					Generating Your Content
				</h2>
				<p className="text-gray-600">
					{state === "creating"
						? "Creating content piece..."
						: state === "streaming"
							? "AI is generating your content..."
							: "Generation complete!"}
				</p>
			</div>

			{/* Progress indicator */}
			<div className="mb-6">
				<div className="flex items-center">
					<div
						className={`w-8 h-8 rounded-full flex items-center justify-center ${
							state !== "creating"
								? "bg-green-500 text-white"
								: "bg-cyan-500 text-white animate-pulse"
						}`}
					>
						{state !== "creating" ? "✓" : "1"}
					</div>
					<div className="flex-1 h-1 bg-gray-200 mx-2">
						<div
							className={`h-full bg-cyan-500 transition-all duration-500 ${
								state !== "creating" ? "w-full" : "w-0"
							}`}
						/>
					</div>
					<div
						className={`w-8 h-8 rounded-full flex items-center justify-center ${
							state === "complete"
								? "bg-green-500 text-white"
								: state === "streaming"
									? "bg-cyan-500 text-white animate-pulse"
									: "bg-gray-300 text-gray-600"
						}`}
					>
						{state === "complete" ? "✓" : "2"}
					</div>
				</div>
				<div className="flex justify-between text-sm text-gray-600 mt-2">
					<span>Content piece created</span>
					<span>AI generation</span>
				</div>
			</div>

			{/* Streaming content display */}
			{streamedContent && (
				<div className="flex-1 overflow-auto bg-white border border-gray-200 rounded-lg p-6">
					<div className="prose prose-sm max-w-none">
						<div className="whitespace-pre-wrap">{streamedContent}</div>
						{state === "streaming" && (
							<span className="inline-block w-2 h-4 bg-cyan-600 animate-pulse ml-1" />
						)}
					</div>
				</div>
			)}
		</div>
	);
}
