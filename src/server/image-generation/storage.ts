import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { getAuthenticatedConvexClient } from "../utils";
import { uploadFile } from "@/lib/r2-client";
import { getR2Bucket } from "@/lib/env";
import { generateR2Key, sanitizeFilename } from "@/lib/file-validation";
import { createThumbnail } from "@/lib/image-processing";
import type { GenerateImageResult } from "./types";

/**
 * Helper to process and save image to R2 and Convex
 */
export async function processAndSaveImage(
    imageBuffer: ArrayBuffer,
    workspaceId: Id<"workspaces">,
    extension: string,
): Promise<GenerateImageResult> {
    const imageSizeBytes = imageBuffer.byteLength;
    console.log("Image downloaded, size:", imageSizeBytes, "bytes");

    // Generate filename and R2 key
    const timestamp = Date.now();
    const filename = sanitizeFilename(`generated-${timestamp}.${extension}`);
    const r2Key = generateR2Key(workspaceId, "contentImage", filename);

    // Get R2 bucket
    const bucket = await getR2Bucket();

    // Upload to R2
    await uploadFile(bucket, r2Key, imageBuffer, `image/${extension}`);

    console.log("Image uploaded to R2:", r2Key);

    // Generate and upload thumbnail
    let thumbnailR2Key: string | undefined;
    try {
        const thumbnailBuffer = await createThumbnail(
            imageBuffer,
            `image/${extension}`,
        );
        if (thumbnailBuffer) {
            // Generate thumbnail key
            const lastDotIndex = r2Key.lastIndexOf(".");
            thumbnailR2Key =
                lastDotIndex === -1
                    ? `${r2Key}_thumb.jpg`
                    : `${r2Key.substring(0, lastDotIndex)}_thumb.jpg`;
            await uploadFile(bucket, thumbnailR2Key, thumbnailBuffer, "image/jpeg");
            console.log("Thumbnail uploaded to R2:", thumbnailR2Key);
        }
    } catch (thumbnailError) {
        console.error("Thumbnail generation failed:", thumbnailError);
    }

    // Create file record in Convex
    const convex = await getAuthenticatedConvexClient();
    const fileId = await convex.mutation(api.files.createFile, {
        filename,
        mimeType: `image/${extension}`,
        sizeBytes: imageSizeBytes,
        r2Key,
        thumbnailR2Key,
    });

    console.log("File record created:", fileId);

    // Generate preview URL
    const previewUrl = `/api/files/${fileId}/preview`;

    return {
        fileId,
        r2Key,
        previewUrl,
    };
}
