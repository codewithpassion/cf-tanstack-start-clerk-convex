import { useState } from "react";
import { FileUpload } from "../shared/FileUpload";
import type { Id } from "../../../convex/_generated/dataModel";

export interface ContentDetailsStepProps {
	projectId: Id<"projects">;
	title: string;
	topic: string;
	draftContent: string;
	uploadedFileIds: Id<"files">[];
	onNext: (data: {
		title: string;
		topic: string;
		draftContent: string;
		uploadedFileIds: Id<"files">[];
	}) => void;
	onBack: () => void;
}

/**
 * Step 4: Content details input.
 * Collects title (required), topic, optional draft content, and source material uploads.
 */
export function ContentDetailsStep({
	projectId,
	title: initialTitle,
	topic: initialTopic,
	draftContent: initialDraftContent,
	uploadedFileIds: initialUploadedFileIds,
	onNext,
	onBack,
}: ContentDetailsStepProps) {
	const [title, setTitle] = useState(initialTitle);
	const [topic, setTopic] = useState(initialTopic);
	const [draftContent, setDraftContent] = useState(initialDraftContent);
	const [uploadedFileIds, setUploadedFileIds] = useState<Id<"files">[]>(initialUploadedFileIds);
	const [error, setError] = useState<string | null>(null);

	const handleNext = () => {
		const trimmedTitle = title.trim();
		if (!trimmedTitle) {
			setError("Please enter a title for your content");
			return;
		}
		if (trimmedTitle.length > 200) {
			setError("Title must be 200 characters or less");
			return;
		}

		setError(null);
		onNext({
			title: trimmedTitle,
			topic: topic.trim(),
			draftContent: draftContent.trim(),
			uploadedFileIds,
		});
	};

	const handleFileUpload = (fileId: Id<"files">) => {
		setUploadedFileIds([...uploadedFileIds, fileId]);
	};

	return (
		<div className="space-y-6">
			<div>
				<h2 className="text-2xl font-bold text-gray-900">Content Details</h2>
				<p className="mt-2 text-gray-600">
					Provide details about the content you want to create.
				</p>
			</div>

			<div className="space-y-4">
				{/* Title input */}
				<div>
					<label htmlFor="content-title" className="block text-sm font-medium text-gray-700">
						Title <span className="text-red-500">*</span>
					</label>
					<input
						id="content-title"
						type="text"
						value={title}
						onChange={(e) => {
							setTitle(e.target.value);
							setError(null);
						}}
						maxLength={200}
						className="mt-1 w-full rounded-lg border-gray-300 shadow-sm focus:border-cyan-500 focus:ring-cyan-500 text-gray-900 bg-white"
						placeholder="Enter a title for your content"
						aria-required="true"
						aria-describedby={error ? "title-error" : undefined}
					/>
					<p className="mt-1 text-sm text-gray-500">{title.length}/200 characters</p>
					{error && (
						<p id="title-error" className="mt-1 text-sm text-red-600" role="alert">
							{error}
						</p>
					)}
				</div>

				{/* Topic textarea */}
				<div>
					<label htmlFor="content-topic" className="block text-sm font-medium text-gray-700">
						Topic (Optional)
					</label>
					<textarea
						id="content-topic"
						value={topic}
						onChange={(e) => setTopic(e.target.value)}
						rows={3}
						className="mt-1 w-full rounded-lg border-gray-300 shadow-sm focus:border-cyan-500 focus:ring-cyan-500 text-gray-900 bg-white"
						placeholder="What is this content about? Provide context to help the AI understand your needs."
					/>
					<p className="mt-1 text-sm text-gray-500">
						Describe the main topic or theme for the AI to understand
					</p>
				</div>

				{/* Draft content textarea */}
				<div>
					<label htmlFor="draft-content" className="block text-sm font-medium text-gray-700">
						Draft Content (Optional)
					</label>
					<textarea
						id="draft-content"
						value={draftContent}
						onChange={(e) => setDraftContent(e.target.value)}
						rows={6}
						className="mt-1 w-full rounded-lg border-gray-300 shadow-sm focus:border-cyan-500 focus:ring-cyan-500 text-gray-900 bg-white"
						placeholder="Start with any draft content or notes you already have. The AI will build upon this."
					/>
					<p className="mt-1 text-sm text-gray-500">
						Provide any existing content or notes as a starting point
					</p>
				</div>

				{/* Source material upload */}
				<div>
					<label className="block text-sm font-medium text-gray-700 mb-2">
						Source Material (Optional)
					</label>
					<FileUpload
						onUploadComplete={handleFileUpload}
						ownerType="contentPiece"
						ownerId={projectId}
						workspaceId={projectId}
						multiple={true}
						disabled={false}
					/>
					{uploadedFileIds.length > 0 && (
						<div className="mt-2">
							<p className="text-sm text-gray-600">
								{uploadedFileIds.length} file{uploadedFileIds.length !== 1 ? "s" : ""} uploaded
							</p>
						</div>
					)}
					<p className="mt-1 text-sm text-gray-500">
						Upload reference materials to inform the AI generation
					</p>
				</div>
			</div>

			<div className="flex gap-3 justify-between pt-4 border-t">
				<button
					type="button"
					onClick={onBack}
					className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
				>
					Back
				</button>
				<button
					type="button"
					onClick={handleNext}
					className="px-6 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700"
				>
					Next
				</button>
			</div>
		</div>
	);
}
