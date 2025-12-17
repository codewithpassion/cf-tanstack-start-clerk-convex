import { useState } from "react";
import { FileUpload } from "../../shared/FileUpload";
import type { Id } from "../../../../convex/_generated/dataModel";

export interface DetailsStepProps {
	title: string;
	topic: string;
	draftContent: string;
	uploadedFileIds: Id<"files">[];
	onBack: () => void;
	onNext: (data: {
		title: string;
		topic: string;
		draftContent: string;
		uploadedFileIds: Id<"files">[];
	}) => void;
}

/**
 * Details Step: Collects content details including title, topic, draft content, and source material.
 * Part of the content creation wizard (Phase 3.3).
 */
export function DetailsStep({
	title: initialTitle,
	topic: initialTopic,
	draftContent: initialDraftContent,
	uploadedFileIds: initialUploadedFileIds,
	onBack,
	onNext,
}: DetailsStepProps) {
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

	const handleRemoveFile = (fileId: Id<"files">) => {
		setUploadedFileIds(uploadedFileIds.filter((id) => id !== fileId));
	};

	return (
		<div className="space-y-6">
			{/* Title input */}
			<div>
				<label
					htmlFor="content-title"
					className="block text-sm font-medium text-slate-700 dark:text-slate-300"
				>
					Title <span className="text-red-500 dark:text-red-400">*</span>
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
					className="mt-1 w-full rounded-lg border bg-white dark:bg-slate-950 text-slate-900 dark:text-white border-slate-300 dark:border-slate-700 shadow-sm focus:border-cyan-500 focus:ring-cyan-500"
					placeholder="Enter a title for your content"
					aria-required="true"
					aria-describedby={error ? "title-error" : "title-counter"}
				/>
				<p
					id="title-counter"
					className="mt-1 text-sm text-slate-500 dark:text-slate-400"
				>
					{title.length}/200 characters
				</p>
				{error && (
					<p id="title-error" className="mt-1 text-sm text-red-600 dark:text-red-400" role="alert">
						{error}
					</p>
				)}
			</div>

			{/* Topic textarea */}
			<div>
				<label
					htmlFor="content-topic"
					className="block text-sm font-medium text-slate-700 dark:text-slate-300"
				>
					Topic
				</label>
				<textarea
					id="content-topic"
					value={topic}
					onChange={(e) => setTopic(e.target.value)}
					rows={3}
					className="mt-1 w-full rounded-lg border bg-white dark:bg-slate-950 text-slate-900 dark:text-white border-slate-300 dark:border-slate-700 shadow-sm focus:border-cyan-500 focus:ring-cyan-500"
					placeholder="Provide context or additional information about your content"
					aria-describedby="topic-help"
				/>
				<p id="topic-help" className="mt-1 text-sm text-slate-500 dark:text-slate-400">
					Provide context or additional information
				</p>
			</div>

			{/* Draft content textarea */}
			<div>
				<label
					htmlFor="draft-content"
					className="block text-sm font-medium text-slate-700 dark:text-slate-300"
				>
					Draft Content
				</label>
				<textarea
					id="draft-content"
					value={draftContent}
					onChange={(e) => setDraftContent(e.target.value)}
					rows={6}
					className="mt-1 w-full rounded-lg border bg-white dark:bg-slate-950 text-slate-900 dark:text-white border-slate-300 dark:border-slate-700 shadow-sm focus:border-cyan-500 focus:ring-cyan-500"
					placeholder="Start with your own draft or leave empty"
					aria-describedby="draft-help"
				/>
				<p id="draft-help" className="mt-1 text-sm text-slate-500 dark:text-slate-400">
					Start with your own draft or leave empty
				</p>
			</div>

			{/* Source material upload */}
			<div>
				<label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
					Source Material
				</label>
				<FileUpload
					onUploadComplete={handleFileUpload}
					ownerType="contentPiece"
					ownerId="temp-content-id"
					workspaceId="temp-workspace-id"
					multiple={true}
					disabled={false}
				/>
				{uploadedFileIds.length > 0 && (
					<div className="mt-3 space-y-2">
						<p className="text-sm text-slate-600 dark:text-slate-400">
							{uploadedFileIds.length} file{uploadedFileIds.length !== 1 ? "s" : ""} uploaded
						</p>
						<div className="space-y-1">
							{uploadedFileIds.map((fileId, index) => (
								<div
									key={fileId}
									className="flex items-center justify-between p-2 bg-white/50 dark:bg-slate-800/50 rounded border border-slate-200 dark:border-slate-700"
								>
									<span className="text-sm text-slate-700 dark:text-slate-300">
										File {index + 1}
									</span>
									<button
										type="button"
										onClick={() => handleRemoveFile(fileId)}
										className="text-sm text-red-600 dark:text-red-400 hover:underline"
										aria-label={`Remove file ${index + 1}`}
									>
										Remove
									</button>
								</div>
							))}
						</div>
					</div>
				)}
				<p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
					Upload reference materials to inform the content
				</p>
			</div>

			{/* Navigation buttons */}
			<div className="flex gap-3 justify-between pt-4 border-t border-slate-200 dark:border-slate-700">
				<button
					type="button"
					onClick={onBack}
					className="px-4 py-2 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
				>
					Back
				</button>
				<button
					type="button"
					onClick={handleNext}
					className="px-6 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg"
				>
					Next
				</button>
			</div>
		</div>
	);
}
