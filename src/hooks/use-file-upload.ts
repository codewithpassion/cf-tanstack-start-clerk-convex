import { useState, useCallback } from "react";

export interface UseFileUploadOptions {
	type: "video" | "deck" | "image";
	maxSizeMB?: number;
	onSuccess?: (url: string) => void;
}

export function useFileUpload(options: UseFileUploadOptions) {
	const { maxSizeMB = 50, onSuccess } = options;
	const [uploading, setUploading] = useState(false);
	const [progress, setProgress] = useState(0);
	const [url, setUrl] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);

	const upload = useCallback(
		async (file: File) => {
			setError(null);
			setProgress(0);

			const maxBytes = maxSizeMB * 1024 * 1024;
			if (file.size > maxBytes) {
				setError(`File exceeds ${maxSizeMB}MB limit`);
				return;
			}

			setUploading(true);

			// Stub: simulate upload progress and return a placeholder URL.
			// Replace with real R2 presigned upload once Cloudflare bindings are available.
			try {
				for (let i = 0; i <= 100; i += 25) {
					await new Promise((r) => setTimeout(r, 100));
					setProgress(i);
				}
				const stubUrl = `https://placeholder.hackforge.dev/uploads/${encodeURIComponent(file.name)}`;
				setUrl(stubUrl);
				onSuccess?.(stubUrl);
			} catch {
				setError("Upload failed");
			} finally {
				setUploading(false);
			}
		},
		[maxSizeMB, onSuccess],
	);

	const reset = useCallback(() => {
		setUrl(null);
		setError(null);
		setProgress(0);
		setUploading(false);
	}, []);

	return { upload, uploading, progress, url, error, reset };
}
