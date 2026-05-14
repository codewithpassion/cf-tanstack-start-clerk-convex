import { auth } from "@clerk/tanstack-react-start/server";
import { ConvexHttpClient } from "convex/browser";

export async function getServerConvex(): Promise<ConvexHttpClient> {
	const url = process.env.VITE_CONVEX_URL;
	if (!url) throw new Error("VITE_CONVEX_URL not configured");
	const client = new ConvexHttpClient(url);
	const session = await auth();
	const token = await session.getToken({ template: "convex" });
	if (token) client.setAuth(token);
	return client;
}
