import { type FunctionReference, makeFunctionReference } from "convex/server";
import type { Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";

const TRACKING_PARAMS = [
	"utm_source",
	"utm_medium",
	"utm_campaign",
	"utm_term",
	"utm_content",
	"utm_id",
	"utm_name",
	"utm_brand",
	"utm_social",
	"fbclid",
	"gclid",
	"mc_cid",
	"mc_eid",
];

export function canonicalizeUrl(input: string): string {
	let url: URL;
	try {
		url = new URL(input.trim());
	} catch {
		return input.trim();
	}
	url.hash = "";
	url.hostname = url.hostname.toLowerCase();
	for (const p of TRACKING_PARAMS) url.searchParams.delete(p);
	let pathname = url.pathname;
	if (pathname.length > 1 && pathname.endsWith("/")) {
		pathname = pathname.replace(/\/+$/, "");
		url.pathname = pathname || "/";
	}
	// Strip default ports
	if (
		(url.protocol === "http:" && url.port === "80") ||
		(url.protocol === "https:" && url.port === "443")
	) {
		url.port = "";
	}
	return url.toString();
}

export interface FindOrCreateEntryArgs {
	orgId: Id<"organizations">;
	sourceId: Id<"sources">;
	canonicalUrl: string;
	originalUrl: string;
	title: string;
	snippet?: string;
	content?: string;
	publishedAt?: number;
}

export async function findOrCreateEntry(
	ctx: MutationCtx,
	args: FindOrCreateEntryArgs,
): Promise<{ entryId: Id<"entries">; created: boolean }> {
	const existing = await ctx.db
		.query("entries")
		.withIndex("by_org_canonicalUrl", (q) =>
			q.eq("orgId", args.orgId).eq("canonicalUrl", args.canonicalUrl),
		)
		.unique();

	const now = Date.now();

	if (existing) {
		const alreadyLinked = await ctx.db
			.query("entrySources")
			.withIndex("by_entry", (q) => q.eq("entryId", existing._id))
			.collect();
		const hasThisSource = alreadyLinked.some(
			(es) => es.sourceId === args.sourceId,
		);
		if (!hasThisSource) {
			await ctx.db.insert("entrySources", {
				entryId: existing._id,
				sourceId: args.sourceId,
				orgId: args.orgId,
				originalUrl: args.originalUrl,
				foundAt: now,
			});
		}
		return { entryId: existing._id, created: false };
	}

	const entryId = await ctx.db.insert("entries", {
		orgId: args.orgId,
		primarySourceId: args.sourceId,
		canonicalUrl: args.canonicalUrl,
		title: args.title,
		snippet: args.snippet,
		content: args.content,
		fetchedAt: now,
		publishedAt: args.publishedAt,
		used: false,
		archived: false,
	});

	await ctx.db.insert("entrySources", {
		entryId,
		sourceId: args.sourceId,
		orgId: args.orgId,
		originalUrl: args.originalUrl,
		foundAt: now,
	});

	const embedRef = makeFunctionReference<"action">(
		"ai/embeddings:embedEntry",
	) as unknown as FunctionReference<
		"action",
		"internal",
		{ entryId: Id<"entries"> },
		void
	>;
	await ctx.scheduler.runAfter(0, embedRef, { entryId });

	return { entryId, created: true };
}
