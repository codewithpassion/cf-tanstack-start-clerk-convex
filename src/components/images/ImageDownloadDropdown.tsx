/**
 * Image Download Dropdown Component
 *
 * Provides a dropdown menu with options to download images:
 * - Single image: Downloads the image directly
 * - Multiple images: Downloads as ZIP or PDF
 */

import { useState, useRef, useEffect } from "react";
import { FileDown, ChevronDown, FileArchive, FileText } from "lucide-react";
import type { Id } from "@/convex/dataModel";

export interface ImageDownloadDropdownProps {
	/**
	 * ID of the content piece (for PDF generation)
	 */
	contentPieceId: Id<"contentPieces">;

	/**
	 * Number of images available
	 */
	imageCount: number;

	/**
	 * Whether the button is disabled
	 */
	disabled?: boolean;

	/**
	 * Size variant
	 */
	size?: "sm" | "md" | "lg";

	/**
	 * Style variant
	 */
	variant?: "primary" | "secondary";

	/**
	 * Additional class names
	 */
	className?: string;
}

/**
 * Reusable dropdown component for downloading images in different formats
 */
export function ImageDownloadDropdown({
	contentPieceId,
	imageCount,
	disabled = false,
	size = "md",
	variant = "primary",
	className = "",
}: ImageDownloadDropdownProps) {
	const [isOpen, setIsOpen] = useState(false);
	const [isDownloading, setIsDownloading] = useState(false);
	const dropdownRef = useRef<HTMLDivElement>(null);

	// Close dropdown when clicking outside
	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
				setIsOpen(false);
			}
		};

		if (isOpen) {
			document.addEventListener("mousedown", handleClickOutside);
		}

		return () => {
			document.removeEventListener("mousedown", handleClickOutside);
		};
	}, [isOpen]);

	// Handle downloading images as ZIP
	const handleDownloadZip = async () => {
		setIsOpen(false);
		setIsDownloading(true);

		try {
			const response = await fetch(`/api/content/${contentPieceId}/images-zip`);

			if (!response.ok) {
				throw new Error(`Failed to generate ZIP: ${response.statusText}`);
			}

			const blob = await response.blob();
			const url = window.URL.createObjectURL(blob);
			const link = document.createElement("a");
			link.href = url;
			link.download = `images-${contentPieceId}.zip`;
			document.body.appendChild(link);
			link.click();
			window.URL.revokeObjectURL(url);
			document.body.removeChild(link);
		} catch (error) {
			console.error("Failed to download ZIP:", error);
			alert("Failed to download images as ZIP. Please try again.");
		} finally {
			setIsDownloading(false);
		}
	};

	// Handle downloading images as PDF
	const handleDownloadPdf = async () => {
		setIsOpen(false);
		setIsDownloading(true);

		try {
			const response = await fetch(`/api/content/${contentPieceId}/images-pdf`);

			if (!response.ok) {
				throw new Error(`Failed to generate PDF: ${response.statusText}`);
			}

			const blob = await response.blob();
			const url = window.URL.createObjectURL(blob);
			const link = document.createElement("a");
			link.href = url;
			link.download = `images-${contentPieceId}.pdf`;
			document.body.appendChild(link);
			link.click();
			window.URL.revokeObjectURL(url);
			document.body.removeChild(link);
		} catch (error) {
			console.error("Failed to download PDF:", error);
			alert("Failed to download images as PDF. Please try again.");
		} finally {
			setIsDownloading(false);
		}
	};

	// Size classes
	const sizeClasses = {
		sm: "px-3 py-1.5 text-xs",
		md: "px-4 py-2.5 text-sm",
		lg: "px-6 py-3 text-base",
	};

	// Variant classes
	const variantClasses = {
		primary: "text-cyan-700 dark:text-cyan-300 bg-cyan-50 dark:bg-cyan-900/30 border-cyan-200 dark:border-cyan-800 hover:bg-cyan-100 dark:hover:bg-cyan-900/50",
		secondary: "text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700",
	};

	const buttonClasses = `
		inline-flex items-center justify-center gap-2 font-medium border rounded-lg
		focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-cyan-500 dark:focus:ring-amber-500
		transition-all duration-300 hover:shadow-md
		disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-none
		${sizeClasses[size]}
		${variantClasses[variant]}
		${className}
	`.trim();

	if (imageCount === 0) {
		return (
			<button
				type="button"
				disabled
				className={buttonClasses}
			>
				<FileDown className="w-4 h-4" />
				<span>No Images</span>
			</button>
		);
	}

	return (
		<div ref={dropdownRef} className="relative">
			<button
				type="button"
				onClick={() => setIsOpen(!isOpen)}
				disabled={disabled || isDownloading}
				className={`${buttonClasses} w-full`}
			>
				{isDownloading ? (
					<>
						<div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current" />
						<span>Downloading...</span>
					</>
				) : (
					<>
						<FileDown className="w-4 h-4" />
						<span>Download</span>
						<ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? "rotate-180" : ""}`} />
					</>
				)}
			</button>

			{/* Dropdown Menu */}
			{isOpen && !isDownloading && (
				<div className="absolute z-10 mt-1 w-full min-w-[200px] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg overflow-hidden">
					{/* Download as ZIP option (only if multiple images) */}
					{imageCount > 1 && (
						<button
							type="button"
							onClick={handleDownloadZip}
							className="w-full flex items-center gap-3 px-4 py-3 text-left text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
						>
							<FileArchive className="w-4 h-4 text-slate-500 dark:text-slate-400" />
							<div className="flex-1">
								<div className="font-medium">Download as ZIP</div>
								<div className="text-xs text-slate-500 dark:text-slate-400">
									{imageCount} images in archive
								</div>
							</div>
						</button>
					)}

					{/* Download as PDF option */}
					<button
						type="button"
						onClick={handleDownloadPdf}
						className="w-full flex items-center gap-3 px-4 py-3 text-left text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
					>
						<FileText className="w-4 h-4 text-slate-500 dark:text-slate-400" />
						<div className="flex-1">
							<div className="font-medium">Download as PDF</div>
							<div className="text-xs text-slate-500 dark:text-slate-400">
								{imageCount} {imageCount === 1 ? "image" : "images"} in document
							</div>
						</div>
					</button>
				</div>
			)}
		</div>
	);
}
