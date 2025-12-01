import serverEntry from "@tanstack/react-start/server-entry"
import { Hono } from "hono";
import { getAuth } from "@hono/clerk-auth";
import { clerkMiddleware } from "@hono/clerk-auth";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api";
import type { Id } from "../convex/_generated/dataModel";
import { downloadFile } from "../src/lib/r2-client";


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

		// Download file from R2
		const object = await downloadFile(bucket, file.r2Key);
		if (!object) {
			console.error("File not found in R2:", file.r2Key);
			return c.json({ error: "File not found in storage" }, 404);
		}

		// Return file with appropriate headers
		return new Response(object.body, {
			headers: {
				"Content-Type": file.mimeType,
				"Content-Length": file.sizeBytes.toString(),
				"Cache-Control": "public, max-age=31536000",
			},
		});
	} catch (error) {
		console.error("File preview error:", error);
		return c.json({ error: "Internal server error" }, 500);
	}
});

app.use(async (c) => {
    return serverEntry.fetch(c.req.raw);
});


export default {
    fetch: app.fetch,
} satisfies ExportedHandler<globalThis.Cloudflare.Env>;
