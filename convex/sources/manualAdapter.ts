import { v } from "convex/values";
import { internalAction } from "../_generated/server";
import { jinaRead } from "./websiteAdapter";

export const fetchUrl = internalAction({
	args: { url: v.string() },
	handler: async (
		_ctx,
		{ url },
	): Promise<{
		title: string;
		snippet?: string;
		content?: string;
		publishedAt?: number;
	}> => {
		const extracted = await jinaRead(url);
		return {
			title: extracted.title,
			snippet: extracted.snippet,
			content: extracted.content,
			publishedAt: extracted.publishedAt,
		};
	},
});
