import { useState } from "react";
import type { Doc, Id } from "../../../convex/_generated/dataModel";

export interface FileListProps {
	files: Doc<"files">[];
	onDelete: (fileId: Id<"files">) => void;
	onDownload?: (fileId: Id<"files">) => void;
}

/**
 * Display list of uploaded files with download and delete actions.
 * Shows extracted text preview when available.
 */
export function FileList({ files, onDelete, onDownload }: FileListProps) {
	const [expandedFileId, setExpandedFileId] = useState<Id<"files"> | null>(null);

	const formatFileSize = (bytes: number): string => {
		if (bytes === 0) return "0 Bytes";
		const k = 1024;
		const sizes = ["Bytes", "KB", "MB"];
		const i = Math.floor(Math.log(bytes) / Math.log(k));
		return `${Math.round(bytes / Math.pow(k, i))} ${sizes[i]}`;
	};

	const getFileIcon = (mimeType: string) => {
		if (mimeType.startsWith("image/")) {
			return (
				<svg className="h-8 w-8 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<path
						strokeLinecap="round"
						strokeLinejoin="round"
						strokeWidth={2}
						d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
					/>
				</svg>
			);
		}
		if (mimeType === "application/pdf") {
			return (
				<svg className="h-8 w-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<path
						strokeLinecap="round"
						strokeLinejoin="round"
						strokeWidth={2}
						d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
					/>
				</svg>
			);
		}
		if (
			mimeType === "application/msword" ||
			mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
		) {
			return (
				<svg className="h-8 w-8 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<path
						strokeLinecap="round"
						strokeLinejoin="round"
						strokeWidth={2}
						d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
					/>
				</svg>
			);
		}
		return (
			<svg className="h-8 w-8 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
				<path
					strokeLinecap="round"
					strokeLinejoin="round"
					strokeWidth={2}
					d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
				/>
			</svg>
		);
	};

	const toggleExpanded = (fileId: Id<"files">) => {
		setExpandedFileId(expandedFileId === fileId ? null : fileId);
	};

	if (files.length === 0) {
		return (
			<div className="text-center py-6 text-slate-500 text-sm">
				No files uploaded yet
			</div>
		);
	}

	return (
		<div className="space-y-2">
			{files.map((file) => (
				<div
					key={file._id}
					className="border border-slate-200 rounded-lg p-4 hover:border-slate-300 transition-colors"
				>
					<div className="flex items-start gap-3">
						<div className="flex-shrink-0">{getFileIcon(file.mimeType)}</div>

						<div className="flex-1 min-w-0">
							<div className="flex items-start justify-between gap-2">
								<div className="flex-1 min-w-0">
									<p className="text-sm font-medium text-slate-900 truncate">{file.filename}</p>
									<p className="text-xs text-slate-500 mt-1">
										{formatFileSize(file.sizeBytes)} • Uploaded{" "}
										{new Date(file.createdAt).toLocaleDateString()}
									</p>
								</div>

								<div className="flex items-center gap-2">
									{onDownload && (
										<button
											type="button"
											onClick={() => onDownload(file._id)}
											className="text-slate-400 hover:text-cyan-600 transition-colors"
											title="Download file"
											aria-label={`Download ${file.filename}`}
										>
											<svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
												<path
													strokeLinecap="round"
													strokeLinejoin="round"
													strokeWidth={2}
													d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
												/>
											</svg>
										</button>
									)}

									<button
										type="button"
										onClick={() => onDelete(file._id)}
										className="text-slate-400 hover:text-red-600 transition-colors"
										title="Delete file"
										aria-label={`Delete ${file.filename}`}
									>
										<svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
											<path
												strokeLinecap="round"
												strokeLinejoin="round"
												strokeWidth={2}
												d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
											/>
										</svg>
									</button>
								</div>
							</div>

							{file.extractedText && (
								<div className="mt-3">
									<button
										type="button"
										onClick={() => toggleExpanded(file._id)}
										className="text-xs text-cyan-600 hover:text-cyan-700 font-medium flex items-center gap-1"
									>
										{expandedFileId === file._id ? "Hide" : "Show"} extracted text
										<svg
											className={`h-4 w-4 transition-transform ${expandedFileId === file._id ? "rotate-180" : ""}`}
											fill="none"
											viewBox="0 0 24 24"
											stroke="currentColor"
										>
											<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
										</svg>
									</button>

									{expandedFileId === file._id && (
										<div className="mt-2 p-3 bg-slate-50 rounded border border-slate-200">
											<p className="text-xs text-slate-700 whitespace-pre-wrap">
												{file.extractedText.length > 500
													? `${file.extractedText.substring(0, 500)}...`
													: file.extractedText}
											</p>
											{file.extractedText.length > 500 && (
												<p className="text-xs text-slate-500 mt-2 italic">
													Showing first 500 characters of {file.extractedText.length} total
												</p>
											)}
										</div>
									)}
								</div>
							)}
						</div>
					</div>
				</div>
			))}
		</div>
	);
}
