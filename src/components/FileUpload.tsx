import { useCallback, useRef } from "react";
import { Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useFileUpload } from "@/hooks/use-file-upload";
import type { UseFileUploadOptions } from "@/hooks/use-file-upload";

interface FileUploadProps {
	label: string;
	accept: string;
	maxSizeMB?: number;
	value?: string;
	onChange: (url: string) => void;
	onClear?: () => void;
	helperText?: string;
	type: UseFileUploadOptions["type"];
}

export function FileUpload({
	label,
	accept,
	maxSizeMB = 50,
	value,
	onChange,
	onClear,
	helperText,
	type,
}: FileUploadProps) {
	const inputRef = useRef<HTMLInputElement>(null);

	const { upload, uploading, progress, error } = useFileUpload({
		type,
		maxSizeMB,
		onSuccess: onChange,
	});

	const handleFile = useCallback(
		(file: File) => {
			upload(file);
		},
		[upload],
	);

	const handleDrop = useCallback(
		(e: React.DragEvent) => {
			e.preventDefault();
			const file = e.dataTransfer.files[0];
			if (file) handleFile(file);
		},
		[handleFile],
	);

	const handleInputChange = useCallback(
		(e: React.ChangeEvent<HTMLInputElement>) => {
			const file = e.target.files?.[0];
			if (file) handleFile(file);
		},
		[handleFile],
	);

	if (value) {
		const fileName = decodeURIComponent(
			value.split("/").pop() ?? "Uploaded file",
		);
		return (
			<div className="space-y-1">
				<p className="text-sm font-medium">{label}</p>
				<div className="flex items-center gap-2 rounded-md border p-3">
					<span className="flex-1 truncate text-sm">{fileName}</span>
					<Button
						type="button"
						variant="ghost"
						size="sm"
						onClick={() => {
							onClear?.();
						}}
					>
						<X className="h-4 w-4" />
					</Button>
				</div>
			</div>
		);
	}

	return (
		<div className="space-y-1">
			<p className="text-sm font-medium">{label}</p>
			<button
				type="button"
				className="flex w-full cursor-pointer flex-col items-center gap-2 rounded-md border-2 border-dashed p-6 text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
				onClick={() => inputRef.current?.click()}
				onDrop={handleDrop}
				onDragOver={(e) => e.preventDefault()}
			>
				<Upload className="h-6 w-6" />
				<span className="text-sm">Click to upload or drag &amp; drop</span>
				{helperText && (
					<span className="text-xs text-muted-foreground">
						{helperText}
					</span>
				)}
			</button>
			<input
				ref={inputRef}
				type="file"
				accept={accept}
				className="hidden"
				onChange={handleInputChange}
			/>
			{uploading && <Progress value={progress} className="h-2" />}
			{error && <p className="text-sm text-destructive">{error}</p>}
		</div>
	);
}
