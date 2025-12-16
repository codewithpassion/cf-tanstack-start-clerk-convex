/**
 * Image processing utilities for thumbnail generation.
 * Uses static imports with manual WASM initialization for Cloudflare Workers compatibility.
 *
 * Note: @jsquash libraries use static imports with explicit WASM initialization
 * to avoid SSR optimization issues. WASM modules are imported directly and passed
 * to init functions before first use.
 */

import decodeJpeg, { init as initJpegDecode } from "@jsquash/jpeg/decode";
import encodeJpeg, { init as initJpegEncode } from "@jsquash/jpeg/encode";
import decodePng, { init as initPngDecode } from "@jsquash/png/decode";
import resizeImage, { initResize } from "@jsquash/resize";

// Import WASM modules as raw binary data
// @ts-ignore: Ignore type issues for WASM imports
import jpegDecWasm from "../../node_modules/@jsquash/jpeg/codec/dec/mozjpeg_dec.wasm";
// @ts-ignore: Ignore type issues for WASM imports
import jpegEncWasm from "../../node_modules/@jsquash/jpeg/codec/enc/mozjpeg_enc.wasm";
// @ts-ignore: Ignore type issues for WASM imports
import pngDecWasm from "../../node_modules/@jsquash/png/codec/pkg/squoosh_png_bg.wasm";
// @ts-ignore: Ignore type issues for WASM imports
import resizeWasm from "../../node_modules/@jsquash/resize/lib/resize/pkg/squoosh_resize_bg.wasm";

// WASM initialization state tracking
let jpegDecodeInitialized = false;
let jpegEncodeInitialized = false;
let pngDecodeInitialized = false;
let resizeInitialized = false;

/**
 * Initialize JPEG decoder if not already initialized.
 * This function is idempotent - safe to call multiple times.
 */
async function ensureJpegDecodeInit(): Promise<void> {
	if (!jpegDecodeInitialized) {
		await initJpegDecode(jpegDecWasm);
		jpegDecodeInitialized = true;
	}
}

/**
 * Initialize JPEG encoder if not already initialized.
 * This function is idempotent - safe to call multiple times.
 */
async function ensureJpegEncodeInit(): Promise<void> {
	if (!jpegEncodeInitialized) {
		await initJpegEncode(jpegEncWasm);
		jpegEncodeInitialized = true;
	}
}

/**
 * Initialize PNG decoder if not already initialized.
 * This function is idempotent - safe to call multiple times.
 */
async function ensurePngDecodeInit(): Promise<void> {
	if (!pngDecodeInitialized) {
		await initPngDecode(pngDecWasm);
		pngDecodeInitialized = true;
	}
}

/**
 * Initialize resize module if not already initialized.
 * This function is idempotent - safe to call multiple times.
 */
async function ensureResizeInit(): Promise<void> {
	if (!resizeInitialized) {
		await initResize(resizeWasm);
		resizeInitialized = true;
	}
}

/**
 * Creates a thumbnail for an image file.
 * Supports JPEG and PNG formats.
 * Returns null if the format is unsupported or processing fails.
 *
 * @param fileBuffer The original image file as an ArrayBuffer
 * @param mimeType The MIME type of the image
 * @param maxWidth The maximum width of the thumbnail (default: 300px)
 * @returns The thumbnail as a JPEG ArrayBuffer, or null if generation failed/skipped
 */
export async function createThumbnail(
	fileBuffer: ArrayBuffer,
	mimeType: string,
	maxWidth = 300,
): Promise<ArrayBuffer | null> {
	try {
		let imageData: ImageData;

		// Decode based on MIME type with explicit WASM initialization
		if (mimeType === "image/jpeg" || mimeType === "image/jpg") {
			await ensureJpegDecodeInit();
			imageData = await decodeJpeg(fileBuffer);
		} else if (mimeType === "image/png") {
			await ensurePngDecodeInit();
			imageData = await decodePng(fileBuffer);
		} else {
			// Unsupported format for thumbnail generation
			console.log(
				`Thumbnail generation skipped for unsupported format: ${mimeType}`,
			);
			return null;
		}

		// Calculate new dimensions
		const originalWidth = imageData.width;
		const originalHeight = imageData.height;

		// If image is already smaller than maxWidth, skip thumbnail generation
		// (Use original image URL in UI instead)
		if (originalWidth <= maxWidth) {
			console.log(
				`Thumbnail generation skipped: image width (${originalWidth}px) <= maxWidth (${maxWidth}px)`,
			);
			return null;
		}

		// Calculate new dimensions maintaining aspect ratio
		const ratio = maxWidth / originalWidth;
		const newWidth = maxWidth;
		const newHeight = Math.round(originalHeight * ratio);

		console.log(
			`Resizing image from ${originalWidth}x${originalHeight} to ${newWidth}x${newHeight}`,
		);

		// Initialize resize module and perform resize
		await ensureResizeInit();
		const resizedImageData = await resizeImage(imageData, {
			width: newWidth,
			height: newHeight,
		});

		// Encode as JPEG with decent quality
		await ensureJpegEncodeInit();
		const thumbnailBuffer = await encodeJpeg(resizedImageData, {
			quality: 80,
		});

		console.log(
			`Thumbnail generated successfully: ${thumbnailBuffer.byteLength} bytes`,
		);
		return thumbnailBuffer;
	} catch (error) {
		// Log detailed error but don't fail the upload
		console.error("Thumbnail generation failed:", error);
		if (error instanceof Error) {
			console.error("Error details:", {
				message: error.message,
				stack: error.stack,
			});
		}
		return null;
	}
}
