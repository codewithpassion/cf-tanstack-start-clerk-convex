/**
 * Images Modal Component
 *
 * Unified modal for managing content images:
 * - Gallery view: displays existing images with upload zone
 * - Generate view: simplified AI image generation form
 * - Review prompt view: edit generated prompt before generation
 * - Generating view: loading state during image generation
 * - Preview view: preview generated image before attaching
 */

import { useState, useEffect, useRef, type ChangeEvent, type DragEvent } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/api";
import type { Id } from "@/convex/dataModel";
import { generateImagePrompt, generateImage } from "@/server/ai";
import { uploadFileFn } from "@/server/files";
import { ImageGallery } from "./ImageGallery";
import {
	X,
	Sparkles,
	ArrowLeft,
	ChevronDown,
	ChevronUp,
	Upload,
	Image as ImageIcon,
} from "lucide-react";

type ModalView = "gallery" | "generate" | "review-prompt" | "generating" | "preview";

export interface ImagesModalProps {
	isOpen: boolean;
	onClose: () => void;
	contentPieceId: Id<"contentPieces">;
	projectId: Id<"projects">;
	workspaceId: Id<"workspaces">;
	contentText?: string;
	/**
	 * Initial view to show when modal opens
	 * @default "gallery"
	 */
	initialView?: ModalView;
}

interface GenerationFormState {
	imageType: string;
	subject: string;
	style: string;
	mood: string;
	composition: string;
	colors: string;
	includeContentText: boolean;
}

// Preset options for editable selects
const IMAGE_TYPE_OPTIONS = [
	{ value: "infographic", label: "Infographic - Data visualizations" },
	{ value: "illustration", label: "Illustration - Artistic drawings" },
	{ value: "photo", label: "Photo - Realistic images" },
	{ value: "diagram", label: "Diagram - Technical diagrams" },
];

const STYLE_OPTIONS = [
	{ value: "minimalist", label: "Minimalist" },
	{ value: "watercolor", label: "Watercolor" },
	{ value: "3d-render", label: "3D Render" },
	{ value: "flat-design", label: "Flat Design" },
	{ value: "vintage", label: "Vintage" },
	{ value: "modern", label: "Modern" },
];

const MOOD_OPTIONS = [
	{ value: "calm", label: "Calm" },
	{ value: "energetic", label: "Energetic" },
	{ value: "professional", label: "Professional" },
	{ value: "playful", label: "Playful" },
	{ value: "dramatic", label: "Dramatic" },
	{ value: "serene", label: "Serene" },
];

/**
 * Editable select component - dropdown with ability to type custom values
 */
interface EditableSelectProps {
	id: string;
	value: string;
	onChange: (value: string) => void;
	options: { value: string; label: string }[];
	placeholder?: string;
	maxLength?: number;
}

function EditableSelect({ id, value, onChange, options, placeholder, maxLength = 200 }: EditableSelectProps) {
	const [isOpen, setIsOpen] = useState(false);
	const inputRef = useRef<HTMLInputElement>(null);
	const containerRef = useRef<HTMLDivElement>(null);

	// Close dropdown when clicking outside
	useEffect(() => {
		const handleClickOutside = (e: MouseEvent) => {
			if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
				setIsOpen(false);
			}
		};
		document.addEventListener("mousedown", handleClickOutside);
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, []);

	const handleSelect = (optionValue: string) => {
		onChange(optionValue);
		setIsOpen(false);
		inputRef.current?.blur();
	};

	return (
		<div ref={containerRef} className="relative">
			<div className="relative">
				<input
					ref={inputRef}
					id={id}
					type="text"
					value={value}
					onChange={(e) => onChange(e.target.value)}
					onFocus={() => setIsOpen(true)}
					className="w-full px-4 py-2.5 pr-10 text-gray-900 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 placeholder:text-gray-400"
					placeholder={placeholder}
					maxLength={maxLength}
				/>
				<button
					type="button"
					onClick={() => setIsOpen(!isOpen)}
					className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600"
				>
					<ChevronDown className={`w-5 h-5 transition-transform ${isOpen ? "rotate-180" : ""}`} />
				</button>
			</div>
			{isOpen && (
				<div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-48 overflow-y-auto">
					{options.map((option) => (
						<button
							key={option.value}
							type="button"
							onClick={() => handleSelect(option.value)}
							className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-100 ${
								value === option.value ? "bg-cyan-50 text-cyan-700" : "text-gray-700"
							}`}
						>
							{option.label}
						</button>
					))}
				</div>
			)}
		</div>
	);
}

interface GeneratedImageState {
	fileId: Id<"files">;
	previewUrl: string;
	prompt: string;
}

const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15MB
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];
const ALLOWED_IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".gif", ".webp"];

/**
 * Unified modal for image management
 */
export function ImagesModal({
	isOpen,
	onClose,
	contentPieceId,
	projectId,
	workspaceId,
	contentText,
	initialView = "gallery",
}: ImagesModalProps) {
	// View state
	const [view, setView] = useState<ModalView>("gallery");

	// Generation form state
	const [formState, setFormState] = useState<GenerationFormState>({
		imageType: "illustration",
		subject: "",
		style: "",
		mood: "",
		composition: "",
		colors: "",
		includeContentText: false,
	});
	const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);

	// Prompt state
	const [generatedPrompt, setGeneratedPrompt] = useState("");
	const [isGeneratingPrompt, setIsGeneratingPrompt] = useState(false);

	// Generated image state
	const [generatedImage, setGeneratedImage] = useState<GeneratedImageState | null>(null);

	// Error state
	const [error, setError] = useState<string | null>(null);

	// Upload state
	const [isDragging, setIsDragging] = useState(false);
	const [isUploading, setIsUploading] = useState(false);
	const fileInputRef = useRef<HTMLInputElement>(null);

	// Convex mutations
	const createFile = useMutation(api.files.createFile);
	const attachImage = useMutation(api.contentImages.attachImage);

	// Reset state when modal opens/closes
	useEffect(() => {
		if (isOpen) {
			setView(initialView);
			setFormState({
				imageType: "illustration",
				subject: "",
				style: "",
				mood: "",
				composition: "",
				colors: "",
				includeContentText: false,
			});
			setShowAdvancedOptions(false);
			setGeneratedPrompt("");
			setGeneratedImage(null);
			setError(null);
		}
	}, [isOpen, initialView]);

	// Handle keyboard shortcut (Ctrl+Enter to generate)
	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
			e.preventDefault();
			if (view === "generate" && formState.subject.trim()) {
				handleGenerateImage();
			} else if (view === "review-prompt" && generatedPrompt.trim()) {
				handleGenerateImageFromPrompt();
			}
		}
	};

	// Generate prompt from form inputs
	const handleGeneratePrompt = async () => {
		if (!formState.subject.trim()) {
			setError("Subject is required");
			return;
		}

		setError(null);
		setIsGeneratingPrompt(true);

		try {
			const result = await generateImagePrompt({
				data: {
					imageType: formState.imageType,
					subject: formState.subject,
					style: formState.style || undefined,
					mood: formState.mood || undefined,
					composition: formState.composition || undefined,
					colors: formState.colors || undefined,
				},
			});

			// Store the AI-generated prompt (content context added separately at generation time)
			setGeneratedPrompt(result.prompt);
			setView("review-prompt");
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to generate prompt");
		} finally {
			setIsGeneratingPrompt(false);
		}
	};

	// Generate image directly (skip prompt review)
	const handleGenerateImage = async () => {
		if (!formState.subject.trim()) {
			setError("Subject is required");
			return;
		}

		setError(null);
		setIsGeneratingPrompt(true);

		try {
			// First generate the prompt
			const promptResult = await generateImagePrompt({
				data: {
					imageType: formState.imageType,
					subject: formState.subject,
					style: formState.style || undefined,
					mood: formState.mood || undefined,
					composition: formState.composition || undefined,
					colors: formState.colors || undefined,
				},
			});

			// Store AI-generated prompt for display (without content context)
			setGeneratedPrompt(promptResult.prompt);
			setIsGeneratingPrompt(false);
			setView("generating");

			// Combine prompt with full content context for API call
			let finalPrompt = promptResult.prompt;
			if (formState.includeContentText && contentText) {
				finalPrompt += `\n\nContent context: ${contentText}`;
			}

			// Then generate the image
			const imageResult = await generateImage({
				data: {
					prompt: finalPrompt,
					workspaceId,
					projectId,
				},
			});

			setGeneratedImage({
				fileId: imageResult.fileId,
				previewUrl: imageResult.previewUrl,
				prompt: finalPrompt,
			});
			setView("preview");
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to generate image");
			setView("generate");
		} finally {
			setIsGeneratingPrompt(false);
		}
	};

	// Generate image from reviewed prompt
	const handleGenerateImageFromPrompt = async () => {
		if (!generatedPrompt.trim()) {
			setError("Prompt is required");
			return;
		}

		setError(null);
		setView("generating");

		try {
			// Combine prompt with full content context for API call
			let finalPrompt = generatedPrompt;
			if (formState.includeContentText && contentText) {
				finalPrompt += `\n\nContent context: ${contentText}`;
			}

			const imageResult = await generateImage({
				data: {
					prompt: finalPrompt,
					workspaceId,
					projectId,
				},
			});

			setGeneratedImage({
				fileId: imageResult.fileId,
				previewUrl: imageResult.previewUrl,
				prompt: finalPrompt,
			});
			setView("preview");
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to generate image");
			setView("review-prompt");
		}
	};

	// Attach generated image to content
	const handleAttachGeneratedImage = async () => {
		if (!generatedImage) return;

		try {
			await attachImage({
				contentPieceId,
				fileId: generatedImage.fileId,
				generatedPrompt: generatedImage.prompt,
			});

			// Reset and go back to gallery
			setGeneratedImage(null);
			setGeneratedPrompt("");
			setFormState({
				imageType: "illustration",
				subject: "",
				style: "",
				mood: "",
				composition: "",
				colors: "",
				includeContentText: false,
			});
			setView("gallery");
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to attach image");
		}
	};

	// Discard generated image
	const handleDiscardGeneratedImage = () => {
		setGeneratedImage(null);
		setView("generate");
	};

	// Retry with same form values
	const handleRetry = () => {
		setGeneratedImage(null);
		setView("generate");
	};

	// File validation
	const validateFile = (file: File): string | null => {
		if (file.size > MAX_FILE_SIZE) {
			return `File "${file.name}" exceeds the 15MB size limit`;
		}
		if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
			const extension = file.name.split(".").pop()?.toLowerCase();
			if (!extension || !ALLOWED_IMAGE_EXTENSIONS.includes(`.${extension}`)) {
				return `File "${file.name}" is not a supported image format`;
			}
		}
		return null;
	};

	// Handle file upload
	const handleFileUpload = async (file: File) => {
		const validationError = validateFile(file);
		if (validationError) {
			setError(validationError);
			return;
		}

		setError(null);
		setIsUploading(true);

		try {
			const fileContent = await file.arrayBuffer();

			const uploadResult = await uploadFileFn({
				data: {
					filename: file.name,
					mimeType: file.type,
					sizeBytes: file.size,
					ownerType: "contentPiece",
					ownerId: contentPieceId,
					workspaceId,
					fileContent,
				},
			});

			const fileId = await createFile({
				...uploadResult.validatedData,
			});

			await attachImage({
				contentPieceId,
				fileId,
			});

			// Refresh will happen via Convex subscription
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to upload image");
		} finally {
			setIsUploading(false);
		}
	};

	// Drag handlers
	const handleDragEnter = (e: DragEvent<HTMLDivElement>) => {
		e.preventDefault();
		e.stopPropagation();
		if (view === "gallery" && !isUploading) {
			setIsDragging(true);
		}
	};

	const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
		e.preventDefault();
		e.stopPropagation();
		setIsDragging(false);
	};

	const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
		e.preventDefault();
		e.stopPropagation();
	};

	const handleDrop = (e: DragEvent<HTMLDivElement>) => {
		e.preventDefault();
		e.stopPropagation();
		setIsDragging(false);

		if (view === "gallery" && !isUploading && e.dataTransfer.files.length > 0) {
			handleFileUpload(e.dataTransfer.files[0]);
		}
	};

	const handleFileInputChange = (e: ChangeEvent<HTMLInputElement>) => {
		if (e.target.files && e.target.files.length > 0) {
			handleFileUpload(e.target.files[0]);
		}
		if (fileInputRef.current) {
			fileInputRef.current.value = "";
		}
	};

	if (!isOpen) return null;

	return (
		<>
			{/* Backdrop */}
			<div
				className="fixed inset-0 bg-black bg-opacity-50 z-40"
				onClick={onClose}
			/>

			{/* Modal */}
			<div className="fixed inset-0 z-50 flex items-center justify-center p-4">
				<div
					className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[85vh] flex flex-col"
					onClick={(e) => e.stopPropagation()}
					onKeyDown={handleKeyDown}
					onDragEnter={handleDragEnter}
					onDragLeave={handleDragLeave}
					onDragOver={handleDragOver}
					onDrop={handleDrop}
				>
					{/* Header */}
					<div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
						<div className="flex items-center gap-2">
							{view === "generating" && (
								<div className="animate-spin rounded-full h-5 w-5 border-b-2 border-cyan-600" />
							)}
							<ImageIcon className="w-5 h-5 text-cyan-600" />
							<h2 className="text-xl font-semibold text-gray-900">
								{view === "gallery" && "Images"}
								{view === "generate" && "Generate Image"}
								{view === "review-prompt" && "Review Prompt"}
								{view === "generating" && "Generating..."}
								{view === "preview" && "Generated Image"}
							</h2>
						</div>
						<button
							type="button"
							onClick={onClose}
							className="text-gray-400 hover:text-gray-600 transition-colors"
						>
							<X className="w-5 h-5" />
						</button>
					</div>

					{/* Error message */}
					{error && (
						<div className="mx-6 mt-4 bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded text-sm">
							{error}
						</div>
					)}

					{/* Content */}
					<div className="flex-1 overflow-y-auto px-6 py-6">
						{/* Gallery View */}
						{view === "gallery" && (
							<div className="space-y-6">
								{/* Upload Zone */}
								<div
									className={`
										border-2 border-dashed rounded-lg p-4 text-center transition-colors cursor-pointer
										${isDragging ? "border-cyan-500 bg-cyan-50" : "border-gray-300 hover:border-gray-400"}
										${isUploading ? "opacity-50 cursor-not-allowed" : ""}
									`}
									onClick={() => !isUploading && fileInputRef.current?.click()}
								>
									<input
										ref={fileInputRef}
										type="file"
										className="hidden"
										onChange={handleFileInputChange}
										accept={ALLOWED_IMAGE_EXTENSIONS.join(",")}
										disabled={isUploading}
									/>
									<div className="flex items-center justify-center gap-3">
										<Upload className="w-5 h-5 text-gray-400" />
										<span className="text-sm text-gray-600">
											{isUploading ? (
												"Uploading..."
											) : (
												<>
													<span className="font-medium text-cyan-600">Click to upload</span> or drag and drop
												</>
											)}
										</span>
									</div>
								</div>

								{/* Image Gallery */}
								<ImageGallery contentPieceId={contentPieceId} />
							</div>
						)}

						{/* Generate View */}
						{view === "generate" && (
							<div className="space-y-5">
								{/* Image Type */}
								<div>
									<label htmlFor="image-type" className="block text-sm font-medium text-gray-700 mb-2">
										Image Type
									</label>
									<EditableSelect
										id="image-type"
										value={formState.imageType}
										onChange={(value) => setFormState({ ...formState, imageType: value })}
										options={IMAGE_TYPE_OPTIONS}
										placeholder="Select or type an image type..."
									/>
								</div>

								{/* Subject */}
								<div>
									<label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-2">
										Subject <span className="text-red-500">*</span>
									</label>
									<textarea
										id="subject"
										value={formState.subject}
										onChange={(e) => setFormState({ ...formState, subject: e.target.value })}
										className="w-full h-24 px-4 py-3 text-gray-900 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 resize-none placeholder:text-gray-400"
										placeholder="e.g., A modern office workspace with natural lighting and plants..."
										maxLength={500}
									/>
									<p className="mt-1 text-xs text-gray-500">{formState.subject.length}/500 characters</p>
								</div>

								{/* Include Content Text Switch - moved above Style */}
								{contentText && (
									<div className="flex items-center justify-between py-3 border-t border-b border-gray-200">
										<div>
											<p className="text-sm font-medium text-gray-700">Include content text in prompt</p>
											<p className="text-xs text-gray-500">Add context from your content to the image prompt</p>
										</div>
										<button
											type="button"
											role="switch"
											aria-checked={formState.includeContentText}
											onClick={() => setFormState({ ...formState, includeContentText: !formState.includeContentText })}
											className={`
												relative inline-flex h-6 w-11 items-center rounded-full transition-colors
												${formState.includeContentText ? "bg-cyan-600" : "bg-gray-200"}
											`}
										>
											<span
												className={`
													inline-block h-4 w-4 transform rounded-full bg-white transition-transform
													${formState.includeContentText ? "translate-x-6" : "translate-x-1"}
												`}
											/>
										</button>
									</div>
								)}

								{/* Style */}
								<div>
									<label htmlFor="style" className="block text-sm font-medium text-gray-700 mb-2">
										Style <span className="text-gray-400 font-normal">(optional)</span>
									</label>
									<EditableSelect
										id="style"
										value={formState.style}
										onChange={(value) => setFormState({ ...formState, style: value })}
										options={STYLE_OPTIONS}
										placeholder="Select or type a style..."
									/>
								</div>

								{/* Mood */}
								<div>
									<label htmlFor="mood" className="block text-sm font-medium text-gray-700 mb-2">
										Mood <span className="text-gray-400 font-normal">(optional)</span>
									</label>
									<EditableSelect
										id="mood"
										value={formState.mood}
										onChange={(value) => setFormState({ ...formState, mood: value })}
										options={MOOD_OPTIONS}
										placeholder="Select or type a mood..."
									/>
								</div>

								{/* Advanced Options */}
								<div>
									<button
										type="button"
										onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
										className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-cyan-600"
									>
										{showAdvancedOptions ? (
											<ChevronUp className="w-4 h-4" />
										) : (
											<ChevronDown className="w-4 h-4" />
										)}
										Advanced Options
									</button>

									{showAdvancedOptions && (
										<div className="mt-4 space-y-4 pl-4 border-l-2 border-gray-200">
											<div>
												<label htmlFor="composition" className="block text-sm font-medium text-gray-700 mb-2">
													Composition
												</label>
												<input
													id="composition"
													type="text"
													value={formState.composition}
													onChange={(e) => setFormState({ ...formState, composition: e.target.value })}
													className="w-full px-4 py-2.5 text-gray-900 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 placeholder:text-gray-400"
													placeholder="e.g., Centered, Rule of thirds, Wide angle..."
													maxLength={200}
												/>
											</div>
											<div>
												<label htmlFor="colors" className="block text-sm font-medium text-gray-700 mb-2">
													Colors
												</label>
												<input
													id="colors"
													type="text"
													value={formState.colors}
													onChange={(e) => setFormState({ ...formState, colors: e.target.value })}
													className="w-full px-4 py-2.5 text-gray-900 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 placeholder:text-gray-400"
													placeholder="e.g., Warm tones, Blue and gold, Pastel..."
													maxLength={200}
												/>
											</div>
										</div>
									)}
								</div>
							</div>
						)}

						{/* Review Prompt View */}
						{view === "review-prompt" && (
							<div className="space-y-5">
								<div>
									<label htmlFor="prompt" className="block text-sm font-medium text-gray-700 mb-2">
										Generated Prompt
									</label>
									<textarea
										id="prompt"
										value={generatedPrompt}
										onChange={(e) => setGeneratedPrompt(e.target.value)}
										className="w-full h-48 px-4 py-3 text-gray-900 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 resize-none placeholder:text-gray-400"
										placeholder="Edit the generated prompt..."
										maxLength={4000}
									/>
									<p className="mt-1 text-xs text-gray-500">{generatedPrompt.length}/4000 characters</p>
								</div>

								{/* Content Context (read-only, shown when enabled) */}
								{formState.includeContentText && contentText && (
									<div>
										<label className="block text-sm font-medium text-gray-700 mb-2">
											Content Context <span className="text-gray-400 font-normal">(included with prompt)</span>
										</label>
										<div className="p-3 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-600 max-h-32 overflow-y-auto whitespace-pre-wrap">
											{contentText}
										</div>
									</div>
								)}
							</div>
						)}

						{/* Generating View */}
						{view === "generating" && (
							<div className="flex flex-col items-center justify-center py-12">
								<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-600 mb-4" />
								<h3 className="text-lg font-medium text-gray-900 mb-2">Generating Image</h3>
								<p className="text-sm text-gray-500">This may take 10-30 seconds...</p>
							</div>
						)}

						{/* Preview View */}
						{view === "preview" && generatedImage && (
							<div className="space-y-6">
								{/* Image Preview */}
								<div className="bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden">
									<img
										src={generatedImage.previewUrl}
										alt="Generated image"
										className="max-w-full max-h-96 object-contain"
									/>
								</div>

								{/* Prompt Used (Collapsible) */}
								<details className="text-sm">
									<summary className="cursor-pointer text-gray-600 hover:text-gray-900">
										View prompt used
									</summary>
									<div className="mt-2 p-3 bg-gray-50 rounded-lg text-gray-700 whitespace-pre-wrap">
										{generatedImage.prompt}
									</div>
								</details>
							</div>
						)}
					</div>

					{/* Footer */}
					<div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-gray-50">
						{/* Gallery View Footer */}
						{view === "gallery" && (
							<>
								<button
									type="button"
									onClick={onClose}
									className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
								>
									Close
								</button>
								<button
									type="button"
									onClick={() => setView("generate")}
									className="inline-flex items-center gap-2 px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500 transition-colors"
								>
									<Sparkles className="w-4 h-4" />
									Generate with AI
								</button>
							</>
						)}

						{/* Generate View Footer */}
						{view === "generate" && (
							<>
								<button
									type="button"
									onClick={() => setView("gallery")}
									className="inline-flex items-center gap-2 px-4 py-2 text-gray-700 hover:text-gray-900 transition-colors"
								>
									<ArrowLeft className="w-4 h-4" />
									Back
								</button>
								<div className="flex items-center gap-3">
									<button
										type="button"
										onClick={handleGeneratePrompt}
										disabled={!formState.subject.trim() || isGeneratingPrompt}
										className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
									>
										Review Prompt
									</button>
									<button
										type="button"
										onClick={handleGenerateImage}
										disabled={!formState.subject.trim() || isGeneratingPrompt}
										className="inline-flex items-center gap-2 px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
									>
										{isGeneratingPrompt ? (
											<>
												<div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
												Processing...
											</>
										) : (
											<>
												<Sparkles className="w-4 h-4" />
												Generate
											</>
										)}
									</button>
								</div>
							</>
						)}

						{/* Review Prompt View Footer */}
						{view === "review-prompt" && (
							<>
								<button
									type="button"
									onClick={() => setView("generate")}
									className="inline-flex items-center gap-2 px-4 py-2 text-gray-700 hover:text-gray-900 transition-colors"
								>
									<ArrowLeft className="w-4 h-4" />
									Back
								</button>
								<div className="flex items-center gap-3">
									<p className="text-xs text-gray-500">
										Press{" "}
										<kbd className="px-1.5 py-0.5 bg-gray-100 border border-gray-300 rounded">Ctrl</kbd>
										{" + "}
										<kbd className="px-1.5 py-0.5 bg-gray-100 border border-gray-300 rounded">Enter</kbd>
										{" to generate"}
									</p>
									<button
										type="button"
										onClick={handleGenerateImageFromPrompt}
										disabled={!generatedPrompt.trim()}
										className="inline-flex items-center gap-2 px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
									>
										<Sparkles className="w-4 h-4" />
										Generate
									</button>
								</div>
							</>
						)}

						{/* Generating View Footer */}
						{view === "generating" && (
							<>
								<div />
								<button
									type="button"
									disabled
									className="px-4 py-2 bg-gray-300 text-gray-500 rounded-lg cursor-not-allowed"
								>
									Generating...
								</button>
							</>
						)}

						{/* Preview View Footer */}
						{view === "preview" && (
							<>
								<button
									type="button"
									onClick={handleDiscardGeneratedImage}
									className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
								>
									Discard
								</button>
								<div className="flex items-center gap-3">
									<button
										type="button"
										onClick={handleRetry}
										className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
									>
										Retry
									</button>
									<button
										type="button"
										onClick={handleAttachGeneratedImage}
										className="inline-flex items-center gap-2 px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500 transition-colors"
									>
										Attach Image
									</button>
								</div>
							</>
						)}
					</div>
				</div>
			</div>
		</>
	);
}
