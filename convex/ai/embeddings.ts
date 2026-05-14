import { type FunctionReference, makeFunctionReference } from "convex/server";
import { v } from "convex/values";
import type { Doc, Id } from "../_generated/dataModel";
import {
	action,
	internalAction,
	internalMutation,
	internalQuery,
} from "../_generated/server";
import { embed } from "../lib/voyage";
import { requireOrgMember } from "../orgAuth";

const MAX_EMBED_CHARS = 8000;

function buildEmbeddingInput(entry: Doc<"entries">): string {
	const parts = [entry.title];
	if (entry.snippet) parts.push(entry.snippet);
	if (entry.content) parts.push(entry.content);
	const joined = parts.join("\n\n");
	return joined.length > MAX_EMBED_CHARS
		? joined.slice(0, MAX_EMBED_CHARS)
		: joined;
}

export const _getEntry = internalQuery({
	args: { entryId: v.id("entries") },
	handler: async (ctx, { entryId }) => {
		return await ctx.db.get(entryId);
	},
});

export const _patchEmbedding = internalMutation({
	args: {
		entryId: v.id("entries"),
		embedding: v.array(v.float64()),
	},
	handler: async (ctx, { entryId, embedding }) => {
		const existing = await ctx.db.get(entryId);
		if (!existing) return;
		await ctx.db.patch(entryId, { embedding });
	},
});

export const embedEntry = internalAction({
	args: { entryId: v.id("entries") },
	handler: async (ctx, { entryId }): Promise<void> => {
		const getRef = makeFunctionReference<"query">(
			"ai/embeddings:_getEntry",
		) as unknown as FunctionReference<
			"query",
			"internal",
			{ entryId: Id<"entries"> },
			Doc<"entries"> | null
		>;
		const entry = await ctx.runQuery(getRef, { entryId });
		if (!entry) return;
		if (entry.embedding) return;
		const input = buildEmbeddingInput(entry);
		if (!input.trim()) return;
		const vectors = await embed([input]);
		if (!vectors || !vectors[0]) return;
		const patchRef = makeFunctionReference<"mutation">(
			"ai/embeddings:_patchEmbedding",
		) as unknown as FunctionReference<
			"mutation",
			"internal",
			{ entryId: Id<"entries">; embedding: number[] },
			void
		>;
		await ctx.runMutation(patchRef, { entryId, embedding: vectors[0] });
	},
});

export const _listMissingEmbeddings = internalQuery({
	args: {
		orgId: v.id("organizations"),
		limit: v.number(),
	},
	handler: async (ctx, { orgId, limit }) => {
		const out: Doc<"entries">[] = [];
		for await (const doc of ctx.db
			.query("entries")
			.withIndex("by_org_fetchedAt", (q) => q.eq("orgId", orgId))
			.order("desc")) {
			if (doc.embedding) continue;
			out.push(doc);
			if (out.length >= limit) break;
		}
		return out;
	},
});

export const embedBacklog = action({
	args: {
		orgId: v.id("organizations"),
		limit: v.optional(v.number()),
	},
	handler: async (
		ctx,
		{ orgId, limit },
	): Promise<{ processed: number; embedded: number }> => {
		// requireOrgMember(admin-only) — embedBacklog is potentially expensive
		await ctx.runQuery(
			makeFunctionReference<"query">(
				"ai/embeddings:_requireAdmin",
			) as unknown as FunctionReference<
				"query",
				"internal",
				{ orgId: Id<"organizations"> },
				void
			>,
			{ orgId },
		);
		const cap = Math.min(limit ?? 50, 200);
		const listRef = makeFunctionReference<"query">(
			"ai/embeddings:_listMissingEmbeddings",
		) as unknown as FunctionReference<
			"query",
			"internal",
			{ orgId: Id<"organizations">; limit: number },
			Doc<"entries">[]
		>;
		const pending = await ctx.runQuery(listRef, { orgId, limit: cap });
		if (pending.length === 0) return { processed: 0, embedded: 0 };

		const texts = pending.map(buildEmbeddingInput);
		const vectors = await embed(texts);
		if (!vectors) return { processed: pending.length, embedded: 0 };
		const patchRef = makeFunctionReference<"mutation">(
			"ai/embeddings:_patchEmbedding",
		) as unknown as FunctionReference<
			"mutation",
			"internal",
			{ entryId: Id<"entries">; embedding: number[] },
			void
		>;
		let embedded = 0;
		for (let i = 0; i < pending.length; i++) {
			const vec = vectors[i];
			if (!vec || vec.length === 0) continue;
			await ctx.runMutation(patchRef, {
				entryId: pending[i]._id,
				embedding: vec,
			});
			embedded++;
		}
		return { processed: pending.length, embedded };
	},
});

export const _requireAdmin = internalQuery({
	args: { orgId: v.id("organizations") },
	handler: async (ctx, { orgId }) => {
		await requireOrgMember(ctx, orgId, "admin");
	},
});
