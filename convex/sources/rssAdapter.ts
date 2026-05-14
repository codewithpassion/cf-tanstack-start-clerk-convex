import { XMLParser } from "fast-xml-parser";
import { v } from "convex/values";
import { internalAction } from "../_generated/server";

export interface RssItem {
	title: string;
	url: string;
	snippet?: string;
	content?: string;
	publishedAt?: number;
}

function asArray<T>(v: T | T[] | undefined): T[] {
	if (v === undefined || v === null) return [];
	return Array.isArray(v) ? v : [v];
}

function textOf(node: unknown): string | undefined {
	if (node === undefined || node === null) return undefined;
	if (typeof node === "string") return node.trim() || undefined;
	if (typeof node === "number") return String(node);
	if (typeof node === "object") {
		const n = node as Record<string, unknown>;
		if (typeof n["#text"] === "string") return (n["#text"] as string).trim() || undefined;
		if (typeof n["#text"] === "number") return String(n["#text"]);
	}
	return undefined;
}

function linkOf(node: unknown): string | undefined {
	if (node === undefined || node === null) return undefined;
	if (typeof node === "string") return node.trim() || undefined;
	if (Array.isArray(node)) {
		const alt =
			(node as Array<Record<string, unknown>>).find(
				(l) => !l["@_rel"] || l["@_rel"] === "alternate",
			) ?? node[0];
		return linkOf(alt);
	}
	if (typeof node === "object") {
		const n = node as Record<string, unknown>;
		if (typeof n["@_href"] === "string") return (n["@_href"] as string).trim();
		if (typeof n["#text"] === "string") return (n["#text"] as string).trim();
	}
	return undefined;
}

function parseDate(v: unknown): number | undefined {
	const s = textOf(v);
	if (!s) return undefined;
	const t = Date.parse(s);
	return Number.isFinite(t) ? t : undefined;
}

function stripHtml(input: string): string {
	return input
		.replace(/<[^>]+>/g, " ")
		.replace(/&nbsp;/g, " ")
		.replace(/&amp;/g, "&")
		.replace(/&lt;/g, "<")
		.replace(/&gt;/g, ">")
		.replace(/&quot;/g, '"')
		.replace(/\s+/g, " ")
		.trim();
}

function truncate(s: string, n: number): string {
	return s.length <= n ? s : `${s.slice(0, n - 1).trim()}…`;
}

export function parseFeed(xml: string): RssItem[] {
	const parser = new XMLParser({
		ignoreAttributes: false,
		attributeNamePrefix: "@_",
		trimValues: true,
		processEntities: true,
	});
	const root = parser.parse(xml) as Record<string, unknown>;

	const rssChannel =
		(root.rss as Record<string, unknown> | undefined)?.channel ?? null;
	if (rssChannel) {
		const channel = rssChannel as Record<string, unknown>;
		return asArray(channel.item as unknown)
			.map((raw): RssItem | null => {
				const item = raw as Record<string, unknown>;
				const url = linkOf(item.link);
				const title = textOf(item.title);
				if (!url || !title) return null;
				const contentEncoded = textOf(item["content:encoded"]);
				const description = textOf(item.description);
				const content = contentEncoded ?? description;
				const snippetSrc = description ?? contentEncoded;
				return {
					title,
					url,
					snippet: snippetSrc
						? truncate(stripHtml(snippetSrc), 400)
						: undefined,
					content,
					publishedAt: parseDate(item.pubDate ?? item["dc:date"]),
				};
			})
			.filter((x): x is RssItem => x !== null);
	}

	const feed = root.feed as Record<string, unknown> | undefined;
	if (feed) {
		return asArray(feed.entry as unknown)
			.map((raw): RssItem | null => {
				const entry = raw as Record<string, unknown>;
				const url = linkOf(entry.link);
				const title = textOf(entry.title);
				if (!url || !title) return null;
				const summary = textOf(entry.summary);
				const content = textOf(entry.content) ?? summary;
				return {
					title,
					url,
					snippet: summary
						? truncate(stripHtml(summary), 400)
						: content
							? truncate(stripHtml(content), 400)
							: undefined,
					content,
					publishedAt: parseDate(entry.published ?? entry.updated),
				};
			})
			.filter((x): x is RssItem => x !== null);
	}

	return [];
}

export const fetchFeed = internalAction({
	args: { url: v.string() },
	handler: async (_ctx, { url }): Promise<RssItem[]> => {
		const res = await fetch(url, {
			headers: { "user-agent": "NewsGator/0.1 (+https://newsgator.app)" },
		});
		if (!res.ok) {
			throw new Error(`RSS fetch failed: ${res.status} ${res.statusText}`);
		}
		const text = await res.text();
		return parseFeed(text);
	},
});
