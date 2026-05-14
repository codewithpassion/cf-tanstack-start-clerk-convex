import {
	type FunctionReference,
	makeFunctionReference,
} from "convex/server";
import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import { internalAction } from "./_generated/server";

interface FetchedItem {
	title: string;
	url: string;
	snippet?: string;
	content?: string;
	publishedAt?: number;
}

// All internal refs go through `makeFunctionReference` to avoid pulling
// the entire generated `internal` type tree into this file (which causes
// "Type instantiation is excessively deep" once the codebase grows).

const _getSource = makeFunctionReference<"query">(
	"sources:_getSource",
) as unknown as FunctionReference<
	"query",
	"internal",
	{ sourceId: Id<"sources"> },
	Doc<"sources"> | null
>;

const _finishRun = makeFunctionReference<"mutation">(
	"sources:_finishRun",
) as unknown as FunctionReference<
	"mutation",
	"internal",
	{
		sourceId: Id<"sources">;
		success: boolean;
		itemsAdded: number;
		error?: string;
	},
	null
>;

const _ingestOne = makeFunctionReference<"mutation">(
	"entries:_ingestOne",
) as unknown as FunctionReference<
	"mutation",
	"internal",
	{
		orgId: Id<"organizations">;
		sourceId: Id<"sources">;
		originalUrl: string;
		title: string;
		snippet?: string;
		content?: string;
		publishedAt?: number;
	},
	{ entryId: Id<"entries">; created: boolean }
>;

const rssFetch = makeFunctionReference<"action">(
	"sources/rssAdapter:fetchFeed",
) as unknown as FunctionReference<
	"action",
	"internal",
	{ url: string },
	FetchedItem[]
>;

const siteFetch = makeFunctionReference<"action">(
	"sources/websiteAdapter:fetchSite",
) as unknown as FunctionReference<
	"action",
	"internal",
	{ url: string },
	FetchedItem[]
>;

const search = makeFunctionReference<"action">(
	"sources/webSearchAdapter:search",
) as unknown as FunctionReference<
	"action",
	"internal",
	{ query: string; maxResults?: number },
	FetchedItem[]
>;

export const runOne = internalAction({
	args: { sourceId: v.id("sources") },
	handler: async (ctx, { sourceId }): Promise<void> => {
		const source = await ctx.runQuery(_getSource, { sourceId });
		if (!source) return;

		let items: FetchedItem[] = [];
		let itemsAdded = 0;
		let error: string | undefined;
		let success = true;

		try {
			switch (source.type) {
				case "rss": {
					const url = (source.config as { url?: string } | undefined)?.url;
					if (!url) throw new Error("RSS source missing config.url");
					items = await ctx.runAction(rssFetch, { url });
					break;
				}
				case "website": {
					const url = (source.config as { url?: string } | undefined)?.url;
					if (!url) throw new Error("Website source missing config.url");
					items = await ctx.runAction(siteFetch, { url });
					break;
				}
				case "web_search": {
					const query = (source.config as { query?: string } | undefined)
						?.query;
					if (!query) throw new Error("Web search source missing config.query");
					const maxResults = (
						source.config as { maxResults?: number } | undefined
					)?.maxResults;
					items = await ctx.runAction(search, { query, maxResults });
					break;
				}
				case "manual":
					return;
			}

			for (const item of items) {
				const result = await ctx.runMutation(_ingestOne, {
					orgId: source.orgId,
					sourceId,
					originalUrl: item.url,
					title: item.title,
					snippet: item.snippet,
					content: item.content,
					publishedAt: item.publishedAt,
				});
				if (result.created) itemsAdded++;
			}
		} catch (err) {
			success = false;
			error = err instanceof Error ? err.message : String(err);
		}

		await ctx.runMutation(_finishRun, {
			sourceId,
			success,
			itemsAdded,
			error,
		});
	},
});
