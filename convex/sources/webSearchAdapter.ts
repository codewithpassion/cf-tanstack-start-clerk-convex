import { v } from "convex/values";
import { internalAction } from "../_generated/server";

export interface WebSearchHit {
	title: string;
	url: string;
	snippet?: string;
	content?: string;
	publishedAt?: number;
}

interface TavilyResult {
	title?: string;
	url?: string;
	content?: string;
	score?: number;
	published_date?: string;
}

interface TavilyResponse {
	results?: TavilyResult[];
}

export const search = internalAction({
	args: {
		query: v.string(),
		maxResults: v.optional(v.number()),
	},
	handler: async (_ctx, { query, maxResults }): Promise<WebSearchHit[]> => {
		const apiKey = process.env.TAVILY_API_KEY;
		if (!apiKey) {
			console.warn(
				"TAVILY_API_KEY not set; web_search source returning no results",
			);
			return [];
		}
		const res = await fetch("https://api.tavily.com/search", {
			method: "POST",
			headers: {
				"content-type": "application/json",
				authorization: `Bearer ${apiKey}`,
			},
			body: JSON.stringify({
				query,
				max_results: maxResults ?? 10,
				search_depth: "basic",
			}),
		});
		if (!res.ok) {
			throw new Error(
				`Tavily search failed: ${res.status} ${res.statusText}`,
			);
		}
		const data = (await res.json()) as TavilyResponse;
		const results = data.results ?? [];
		return results
			.map((r): WebSearchHit | null => {
				if (!r.url || !r.title) return null;
				let publishedAt: number | undefined;
				if (r.published_date) {
					const t = Date.parse(r.published_date);
					if (Number.isFinite(t)) publishedAt = t;
				}
				return {
					title: r.title,
					url: r.url,
					snippet: r.content?.slice(0, 400),
					content: r.content,
					publishedAt,
				};
			})
			.filter((x): x is WebSearchHit => x !== null);
	},
});
