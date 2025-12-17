import serverEntry from "@tanstack/react-start/server-entry"
import { Hono } from "hono";
import { getAuth } from "@hono/clerk-auth";
import { clerkMiddleware } from "@hono/clerk-auth";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api";
import type { Id } from "../convex/_generated/dataModel";
import { downloadFile } from "../src/lib/r2-client";
import { PDFDocument } from "pdf-lib";


interface CloudflareVariables {
}

export type AppType = {
    Bindings: Cloudflare.Env;
    Variables: CloudflareVariables;
};

const app = new Hono<AppType>();

// Apply Clerk authentication middleware globally
app.use('*', clerkMiddleware({
    publishableKey: process.env.VITE_CLERK_PUBLISHABLE_KEY!,
    secretKey: process.env.CLERK_SECRET_KEY!,
}))


app.get("/api/health", (c) => {
    const auth = getAuth(c);
    return c.json({
        status: "ok",
        authenticated: !!auth?.userId,
        userId: auth?.userId || null
    });
});

// File preview/download endpoint
app.get("/api/files/:fileId/preview", async (c) => {
	try {
		const auth = getAuth(c);
		if (!auth?.userId) {
			return c.json({ error: "Unauthorized" }, 401);
		}

		const fileId = c.req.param("fileId") as Id<"files">;

		// Get Convex client with auth
		const convexUrl = process.env.VITE_CONVEX_URL;
		if (!convexUrl) {
			console.error("VITE_CONVEX_URL not set");
			return c.json({ error: "Configuration error" }, 500);
		}

		const convex = new ConvexHttpClient(convexUrl);
		const token = await auth.getToken({ template: "convex" });
		if (!token) {
			return c.json({ error: "Failed to get auth token" }, 401);
		}
		convex.setAuth(token);

		// Get file metadata from Convex
		const file = await convex.query(api.files.getFile, { fileId });
		if (!file) {
			return c.json({ error: "File not found" }, 404);
		}

		// Get R2 bucket
		const bucket = c.env.R2_BUCKET;
		if (!bucket) {
			console.error("R2 bucket binding not found");
			return c.json({ error: "Storage not configured" }, 500);
		}

		// Determine which file to serve (original or thumbnail)
		const variant = c.req.query("variant");
		let r2Key = file.r2Key;
		let mimeType = file.mimeType;

		if (variant === "thumbnail" && file.thumbnailR2Key) {
			r2Key = file.thumbnailR2Key;
			mimeType = "image/jpeg"; // Thumbnails are always JPEG
		}

		// Download file from R2
		const object = await downloadFile(bucket, r2Key);
		if (!object) {
			console.error("File not found in R2:", r2Key);
			return c.json({ error: "File not found in storage" }, 404);
		}

		// Return file with appropriate headers
		return new Response(object.body, {
			headers: {
				"Content-Type": mimeType,
				"Content-Length": object.size.toString(),
				"Cache-Control": "public, max-age=31536000",
			},
		});
	} catch (error) {
		console.error("File preview error:", error);
		return c.json({ error: "Internal server error" }, 500);
	}
});

// PDF export endpoint for content images
app.get("/api/content/:contentPieceId/images-pdf", async (c) => {
	try {
		const auth = getAuth(c);
		if (!auth?.userId) {
			return c.json({ error: "Unauthorized" }, 401);
		}

		const contentPieceId = c.req.param("contentPieceId") as Id<"contentPieces">;

		// Get Convex client with auth
		const convexUrl = process.env.VITE_CONVEX_URL;
		if (!convexUrl) {
			console.error("VITE_CONVEX_URL not set");
			return c.json({ error: "Configuration error" }, 500);
		}

		const convex = new ConvexHttpClient(convexUrl);
		const token = await auth.getToken({ template: "convex" });
		if (!token) {
			return c.json({ error: "Failed to get auth token" }, 401);
		}
		convex.setAuth(token);

		// Get all images for this content piece from Convex
		const images = await convex.query(api.contentImages.listContentImages, {
			contentPieceId,
		});

		if (!images || images.length === 0) {
			return c.json({ error: "No images found for this content piece" }, 404);
		}

		// Get R2 bucket
		const bucket = c.env.R2_BUCKET;
		if (!bucket) {
			console.error("R2 bucket binding not found");
			return c.json({ error: "Storage not configured" }, 500);
		}

		// Create a new PDF document
		const pdfDoc = await PDFDocument.create();

		// Process each image
		for (const image of images) {
			if (!image.file) {
				console.warn(`Skipping image ${image._id}: file metadata not found`);
				continue;
			}

			try {
				// Download image from R2
				const object = await downloadFile(bucket, image.file.r2Key);
				if (!object) {
					console.warn(`Skipping image ${image._id}: file not found in R2`);
					continue;
				}

				const imageBytes = await object.arrayBuffer();

				// Embed the image in the PDF
				let embeddedImage;
				const mimeType = image.file.mimeType.toLowerCase();

				if (mimeType === "image/jpeg" || mimeType === "image/jpg") {
					embeddedImage = await pdfDoc.embedJpg(imageBytes);
				} else if (mimeType === "image/png") {
					embeddedImage = await pdfDoc.embedPng(imageBytes);
				} else {
					console.warn(
						`Skipping image ${image._id}: unsupported format ${mimeType}`
					);
					continue;
				}

				// Get image dimensions
				const { width, height } = embeddedImage.scale(1);

				// Create a page with dimensions matching the image (no borders)
				const page = pdfDoc.addPage([width, height]);

				// Draw the image to fill the entire page
				page.drawImage(embeddedImage, {
					x: 0,
					y: 0,
					width,
					height,
				});
			} catch (imageError) {
				console.error(`Error processing image ${image._id}:`, imageError);
				// Continue with next image instead of failing entire PDF
				continue;
			}
		}

		// Check if any pages were added
		if (pdfDoc.getPageCount() === 0) {
			return c.json({ error: "No valid images could be processed" }, 500);
		}

		// Serialize the PDF to bytes
		const pdfBytes = await pdfDoc.save();

		// Create a new Uint8Array to ensure proper type
		const buffer = new Uint8Array(pdfBytes);

		// Return the PDF with appropriate headers
		return new Response(buffer, {
			headers: {
				"Content-Type": "application/pdf",
				"Content-Disposition": `attachment; filename="images-${contentPieceId}.pdf"`,
				"Content-Length": buffer.byteLength.toString(),
			},
		});
	} catch (error) {
		console.error("PDF generation error:", error);
		return c.json({ error: "Internal server error" }, 500);
	}
});

app.use(async (c) => {
    return serverEntry.fetch(c.req.raw);
});


export default {
    fetch: app.fetch,
} satisfies ExportedHandler<globalThis.Cloudflare.Env>;
