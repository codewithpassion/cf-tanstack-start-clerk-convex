/**
 * AIChatPanel component provides an AI chat interface for content editing assistance.
 *
 * Features:
 * - Collapsible panel with toggle button
 * - Resizable width via drag handle (desktop only)
 * - Chat message history display
 * - Message input with streaming responses
 * - Quick action buttons for common tasks
 * - Mobile: slides from bottom
 */
import {
	useState,
	useRef,
	useEffect,
	type FormEvent,
	type KeyboardEvent,
} from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import {
	generateChatResponse,
	applyQuickAction,
	type QuickAction,
} from "@/server/ai";

export interface AIChatPanelProps {
	/**
	 * ID of the content piece for chat context
	 */
	contentPieceId: Id<"contentPieces">;

	/**
	 * Current editor content for AI context
	 */
	currentContent: string;

	/**
	 * Whether the panel is open or collapsed
	 */
	isOpen: boolean;

	/**
	 * Callback to toggle panel open/closed state
	 */
	onToggle: () => void;

	/**
	 * Optional callback when user wants to apply AI suggestion to editor
	 */
	onApplyToContent?: (content: string) => void;
}

/**
 * Collapsible AI chat panel for content editing assistance.
 */
export function AIChatPanel({
	contentPieceId,
	currentContent,
	isOpen,
	onToggle,
	onApplyToContent,
}: AIChatPanelProps) {
	// Fetch chat history from Convex
	const chatMessages = useQuery(api.contentChatMessages.listChatMessages, {
		contentPieceId,
	});

	// Mutation to add chat messages
	const addChatMessage = useMutation(api.contentChatMessages.addChatMessage);

	// Local state
	const [message, setMessage] = useState("");
	const [isGenerating, setIsGenerating] = useState(false);
	const [streamingMessage, setStreamingMessage] = useState("");
	const [selectedTone, setSelectedTone] = useState<string>("professional");

	// Refs
	const messagesEndRef = useRef<HTMLDivElement>(null);
	const textareaRef = useRef<HTMLTextAreaElement>(null);

	// Auto-scroll to bottom when new messages arrive
	useEffect(() => {
		messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
	}, [chatMessages, streamingMessage]);

	// Handle message submission
	const handleSubmit = async (e: FormEvent) => {
		e.preventDefault();
		if (!message.trim() || isGenerating) return;

		const userMessage = message.trim();
		setMessage("");
		setIsGenerating(true);
		setStreamingMessage("");

		try {
			// Save user message to database
			await addChatMessage({
				contentPieceId,
				role: "user",
				content: userMessage,
			});

			// Generate AI response with streaming
			const response = await generateChatResponse({
				data: {
					contentPieceId,
					message: userMessage,
					currentContent,
				},
			});

			// Handle streaming response
			let fullResponse = "";

			// Read the response body as a text stream
			const reader = response.body?.getReader();
			const decoder = new TextDecoder();

			if (!reader) {
				throw new Error("No response body");
			}

			while (true) {
				const { done, value } = await reader.read();

				if (done) break;

				const chunk = decoder.decode(value, { stream: true });
				fullResponse += chunk;
				setStreamingMessage(fullResponse);
			}

			// Clear streaming state (message is now saved by server function)
			setStreamingMessage("");
		} catch (error) {
			console.error("Error generating chat response:", error);
			// Show error to user
			const errorMsg =
				error instanceof Error ? error.message : "Failed to generate response";
			setStreamingMessage(`Error: ${errorMsg}`);
		} finally {
			setIsGenerating(false);
		}
	};

	// Handle quick action buttons
	const handleQuickAction = async (action: QuickAction, tone?: string) => {
		if (isGenerating) return;

		// Use current content or selected text as context
		const contextText = currentContent.slice(0, 500); // Limit context size
		const promptText = applyQuickAction(action, contextText, tone);

		setMessage(promptText);
		textareaRef.current?.focus();

		// Optionally auto-submit
		// Uncomment to auto-submit quick actions:
		// await handleSubmit(new Event('submit') as any);
	};

	// Handle Enter key (submit) vs Shift+Enter (newline)
	const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
		if (e.key === "Enter" && !e.shiftKey) {
			e.preventDefault();
			handleSubmit(e as never);
		}
	};

	// Copy message to clipboard
	const handleCopyToClipboard = (text: string) => {
		navigator.clipboard.writeText(text);
		// TODO: Show toast notification
	};

	// Apply AI suggestion to editor
	const handleApplyToEditor = (text: string) => {
		if (onApplyToContent) {
			onApplyToContent(text);
		}
	};

	// Render message list
	const renderMessages = () => {
		const messages = chatMessages || [];
		const allMessages = [...messages];

		// Add streaming message if present (with _creationTime for type compatibility)
		if (streamingMessage) {
			allMessages.push({
				_id: "streaming" as Id<"contentChatMessages">,
				_creationTime: Date.now(),
				contentPieceId,
				role: "assistant" as const,
				content: streamingMessage,
				createdAt: Date.now(),
			});
		}

		return allMessages.map((msg) => (
			<div
				key={msg._id}
				className={`mb-4 ${msg.role === "user" ? "text-right" : "text-left"}`}
			>
				<div
					className={`inline-block max-w-[85%] rounded-lg px-4 py-2 ${
						msg.role === "user"
							? "bg-cyan-600 text-white"
							: "bg-gray-100 text-gray-900"
					}`}
				>
					<div className="whitespace-pre-wrap break-words text-sm">
						{msg.content}
					</div>
					{msg._id === "streaming" && (
						<span className="inline-block w-2 h-3 bg-cyan-600 animate-pulse ml-1" />
					)}
				</div>

				{/* Action buttons for assistant messages */}
				{msg.role === "assistant" && msg._id !== "streaming" && (
					<div className="flex gap-2 mt-2 text-xs">
						<button
							type="button"
							onClick={() => handleCopyToClipboard(msg.content)}
							className="text-gray-500 hover:text-gray-700"
							title="Copy to clipboard"
						>
							Copy
						</button>
						{onApplyToContent && (
							<button
								type="button"
								onClick={() => handleApplyToEditor(msg.content)}
								className="text-cyan-600 hover:text-cyan-700"
								title="Apply to content"
							>
								Apply to Content
							</button>
						)}
					</div>
				)}
			</div>
		));
	};

	return (
		<div
			data-testid="ai-chat-panel"
			className={`
				flex flex-col h-full bg-white border border-gray-300 rounded-lg shadow-sm
				${isOpen ? "" : "hidden"}
			`}
			style={{ minWidth: "250px", maxWidth: "500px" }}
		>
			{/* Panel Header */}
			<div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
				<h3 className="font-semibold text-gray-900">AI Assistant</h3>
				<button
					type="button"
					onClick={onToggle}
					className="text-gray-500 hover:text-gray-700"
					title="Close panel"
				>
					<svg
						className="w-5 h-5"
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
					>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth={2}
							d="M6 18L18 6M6 6l12 12"
						/>
					</svg>
				</button>
			</div>

			{/* Quick Action Buttons */}
			<div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
				<p className="text-xs text-gray-600 mb-2">Quick Actions</p>
				<div className="flex flex-wrap gap-2">
					<button
						type="button"
						onClick={() => handleQuickAction("improve")}
						disabled={isGenerating}
						className="px-3 py-1.5 text-xs bg-white border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50"
					>
						Improve this paragraph
					</button>
					<button
						type="button"
						onClick={() => handleQuickAction("shorten")}
						disabled={isGenerating}
						className="px-3 py-1.5 text-xs bg-white border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50"
					>
						Make it shorter
					</button>
					<div className="flex items-center gap-2">
						<select
							value={selectedTone}
							onChange={(e) => setSelectedTone(e.target.value)}
							disabled={isGenerating}
							className="px-2 py-1 text-xs border border-gray-300 rounded disabled:opacity-50 text-gray-900 bg-white"
						>
							<option value="professional">Professional</option>
							<option value="casual">Casual</option>
							<option value="friendly">Friendly</option>
							<option value="formal">Formal</option>
							<option value="enthusiastic">Enthusiastic</option>
						</select>
						<button
							type="button"
							onClick={() => handleQuickAction("changeTone", selectedTone)}
							disabled={isGenerating}
							className="px-3 py-1.5 text-xs bg-white border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50"
						>
							Change tone
						</button>
					</div>
				</div>
			</div>

			{/* Chat Messages */}
			<div className="flex-1 overflow-y-auto px-4 py-4 min-h-0">
				{(!chatMessages || chatMessages.length === 0) && !streamingMessage && (
					<div className="text-center text-gray-500 text-sm py-8">
						<p>No messages yet.</p>
						<p className="mt-1">Ask the AI assistant for help with your content.</p>
					</div>
				)}
				{renderMessages()}
				<div ref={messagesEndRef} />
			</div>

			{/* Message Input Form */}
			<form onSubmit={handleSubmit} className="border-t border-gray-200 p-4">
				<div className="flex flex-col gap-2">
					<textarea
						ref={textareaRef}
						value={message}
						onChange={(e) => setMessage(e.target.value)}
						onKeyDown={handleKeyDown}
						disabled={isGenerating}
						placeholder="Ask AI to help with your content... (Enter to send, Shift+Enter for newline)"
						className="w-full px-3 py-2 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-cyan-500 disabled:opacity-50 disabled:bg-gray-100"
						rows={3}
					/>
					<div className="flex justify-between items-center">
						<span className="text-xs text-gray-500">
							{isGenerating ? "AI is thinking..." : "Press Enter to send"}
						</span>
						<button
							type="submit"
							disabled={!message.trim() || isGenerating}
							className="px-4 py-2 bg-cyan-600 text-white text-sm rounded-lg hover:bg-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed"
						>
							{isGenerating ? "Sending..." : "Send"}
						</button>
					</div>
				</div>
			</form>
		</div>
	);
}
