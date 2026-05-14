import { type FunctionReference, makeFunctionReference } from "convex/server";
import { ConvexError, v } from "convex/values";
import type { Id } from "../_generated/dataModel";
import { action, internalQuery } from "../_generated/server";
import { embed } from "../lib/voyage";
import { requireOrgMember } from "../orgAuth";

export interface SearchHit {
	entryId: Id<"entries">;
	score: number;
	title: string;
	snippet?: string;
	primarySourceName: string;
	fetchedAt: number;
	used: boolean;
	archived: boolean;
}

export const _hydrateHits = internalQuery({
	args: {
		orgId: v.id("organizations"),
		entryIds: v.array(v.id("entries")),
		scores: v.array(v.number()),
		includeUsed: v.boolean(),
	},
	handler: async (
		ctx,
		{ orgId, entryIds, scores, includeUsed },
	): Promise<SearchHit[]> => {
		await requireOrgMember(ctx, orgId);
		const hits: SearchHit[] = [];
		for (let i = 0; i < entryIds.length; i++) {
			const entry = await ctx.db.get(entryIds[i]);
			if (!entry || entry.orgId !== orgId) continue;
			if (entry.archived) continue;
			if (!includeUsed && entry.used) continue;
			const source = await ctx.db.get(entry.primarySourceId);
			hits.push({
				entryId: entry._id,
				score: scores[i] ?? 0,
				title: entry.title,
				snippet: entry.snippet,
				primarySourceName: source?.name ?? "Unknown",
				fetchedAt: entry.fetchedAt,
				used: entry.used,
				archived: entry.archived,
			});
		}
		return hits;
	},
});

export const searchEntries = action({
	args: {
		orgId: v.id("organizations"),
		query: v.string(),
		limit: v.optional(v.number()),
		includeUsed: v.optional(v.boolean()),
	},
	handler: async (
		ctx,
		{ orgId, query, limit, includeUsed },
	): Promise<SearchHit[]> => {
		const trimmed = query.trim();
		if (!trimmed) return [];

		// Membership check before any paid API calls (Voyage/vector search).
		const guardRef = makeFunctionReference<"query">(
			"ai/search:_requireMember",
		) as unknown as FunctionReference<
			"query",
			"internal",
			{ orgId: Id<"organizations"> },
			void
		>;
		await ctx.runQuery(guardRef, { orgId });

		const cap = Math.min(limit ?? 20, 50);
		const vectors = await embed([trimmed]);
		if (!vectors || !vectors[0]) {
			throw new ConvexError(
				"AI search is not configured (VOYAGE_API_KEY missing).",
			);
		}

		// Vector index filters only support eq/or on filter fields, so used/archived
		// are applied during hydration. Over-fetch to leave room for that filter.
		const results = await ctx.vectorSearch("entries", "by_embedding", {
			vector: vectors[0],
			limit: cap * 2,
			filter: (q) => q.eq("orgId", orgId),
		});

		const hydrateRef = makeFunctionReference<"query">(
			"ai/search:_hydrateHits",
		) as unknown as FunctionReference<
			"query",
			"internal",
			{
				orgId: Id<"organizations">;
				entryIds: Id<"entries">[];
				scores: number[];
				includeUsed: boolean;
			},
			SearchHit[]
		>;
		const hits = await ctx.runQuery(hydrateRef, {
			orgId,
			entryIds: results.map((r) => r._id),
			scores: results.map((r) => r._score),
			includeUsed: includeUsed ?? false,
		});
		return hits.slice(0, cap);
	},
});

export const _requireMember = internalQuery({
	args: { orgId: v.id("organizations") },
	handler: async (ctx, { orgId }) => {
		await requireOrgMember(ctx, orgId);
	},
});
