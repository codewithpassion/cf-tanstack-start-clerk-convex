import { v } from "convex/values";
import { internalAction } from "../_generated/server";

export interface WebsiteExtraction {
	title: string;
	url: string;
	snippet?: string;
	content?: string;
	publishedAt?: number;
}

function truncate(s: string, n: number): string {
	return s.length <= n ? s : `${s.slice(0, n - 1).trim()}…`;
}

function parseFrontMatter(md: string): {
	meta: Record<string, string>;
	body: string;
} {
	const meta: Record<string, string> = {};
	const lines = md.split("\n");
	let i = 0;
	while (i < lines.length && /^[A-Za-z][\w-]*:\s/.test(lines[i])) {
		const line = lines[i];
		const idx = line.indexOf(":");
		const key = line.slice(0, idx).trim().toLowerCase();
		const val = line.slice(idx + 1).trim();
		if (key && val) meta[key] = val;
		i++;
	}
	if (i > 0 && (lines[i] === "" || lines[i] === undefined)) i++;
	return { meta, body: lines.slice(i).join("\n") };
}

export async function jinaRead(url: string): Promise<WebsiteExtraction> {
	const apiKey = process.env.JINA_API_KEY;
	const headers: Record<string, string> = {
		"x-return-format": "markdown",
	};
	if (apiKey) headers.authorization = `Bearer ${apiKey}`;
	const res = await fetch(`https://r.jina.ai/${url}`, { headers });
	if (!res.ok) {
		throw new Error(
			`Jina Reader fetch failed: ${res.status} ${res.statusText}`,
		);
	}
	const raw = await res.text();
	const { meta, body } = parseFrontMatter(raw);
	const title = meta.title ?? url;
	const publishedAt = meta["published time"]
		? Date.parse(meta["published time"])
		: undefined;
	const cleanBody = body.trim();
	const snippet = cleanBody ? truncate(cleanBody.split("\n")[0], 400) : undefined;
	return {
		title,
		url: meta["url source"] ?? url,
		snippet,
		content: cleanBody || undefined,
		publishedAt:
			publishedAt !== undefined && Number.isFinite(publishedAt)
				? publishedAt
				: undefined,
	};
}

export const fetchSite = internalAction({
	args: { url: v.string() },
	handler: async (_ctx, { url }): Promise<WebsiteExtraction[]> => {
		const extraction = await jinaRead(url);
		return [extraction];
	},
});
