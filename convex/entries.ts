import { type FunctionReference, makeFunctionReference } from "convex/server";
import { ConvexError, v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import {
	action,
	internalMutation,
	mutation,
	query,
} from "./_generated/server";
import { canonicalizeUrl, findOrCreateEntry } from "./dedupe";
import { requireOrgMember } from "./orgAuth";

export const list = query({
	args: {
		orgId: v.id("organizations"),
		sourceId: v.optional(v.id("sources")),
		used: v.optional(v.boolean()),
		archived: v.optional(v.boolean()),
		dateFrom: v.optional(v.number()),
		dateTo: v.optional(v.number()),
		cursor: v.optional(v.number()),
		limit: v.optional(v.number()),
	},
	handler: async (ctx, args) => {
		await requireOrgMember(ctx, args.orgId);
		const limit = Math.min(args.limit ?? 50, 200);

		const cursor = args.cursor;
		const dateTo = args.dateTo;
		const orgId = args.orgId;
		let q = ctx.db
			.query("entries")
			.withIndex("by_org_fetchedAt", (ix) => {
				const eq = ix.eq("orgId", orgId);
				if (dateTo !== undefined) return eq.lte("fetchedAt", dateTo);
				return eq;
			})
			.order("desc");

		if (cursor !== undefined) {
			q = q.filter((f) => f.lt(f.field("fetchedAt"), cursor));
		}

		const candidates: { doc: Doc<"entries">; links: Doc<"entrySources">[] }[] = [];
		let nextCursor: number | null = null;

		for await (const doc of q) {
			if (args.dateFrom !== undefined && doc.fetchedAt < args.dateFrom) {
				break; // descending order, anything past this is older
			}
			if (args.used !== undefined && doc.used !== args.used) continue;
			if (args.archived !== undefined && doc.archived !== args.archived) {
				continue;
			}
			let links: Doc<"entrySources">[] | undefined;
			if (args.sourceId !== undefined) {
				links = await ctx.db
					.query("entrySources")
					.withIndex("by_entry", (ix) => ix.eq("entryId", doc._id))
					.collect();
				if (!links.some((l) => l.sourceId === args.sourceId)) continue;
			}
			candidates.push({ doc, links: links ?? [] });
			if (candidates.length >= limit) {
				nextCursor = doc.fetchedAt;
				break;
			}
		}

		const entries = await Promise.all(
			candidates.map(async ({ doc, links }) => {
				const resolvedLinks =
					links.length > 0
						? links
						: await ctx.db
								.query("entrySources")
								.withIndex("by_entry", (ix) => ix.eq("entryId", doc._id))
								.collect();
				const sourceIds = Array.from(
					new Set(resolvedLinks.map((l) => l.sourceId)),
				);
				const sources = await Promise.all(sourceIds.map((id) => ctx.db.get(id)));
				return {
					...doc,
					sources: sources
						.filter((s): s is Doc<"sources"> => s !== null)
						.map((s) => ({
							_id: s._id,
							name: s.name,
							type: s.type,
							status: s.status,
						})),
				};
			}),
		);

		return { entries, nextCursor };
	},
});

export const get = query({
	args: { orgId: v.id("organizations"), entryId: v.id("entries") },
	handler: async (ctx, { orgId, entryId }) => {
		await requireOrgMember(ctx, orgId);
		const entry = await ctx.db.get(entryId);
		if (!entry || entry.orgId !== orgId) return null;
		const links = await ctx.db
			.query("entrySources")
			.withIndex("by_entry", (ix) => ix.eq("entryId", entry._id))
			.collect();
		const sources = await Promise.all(
			links.map(async (l) => {
				const s = await ctx.db.get(l.sourceId);
				return {
					linkId: l._id,
					sourceId: l.sourceId,
					originalUrl: l.originalUrl,
					foundAt: l.foundAt,
					source: s
						? { _id: s._id, name: s.name, type: s.type, status: s.status }
						: null,
				};
			}),
		);
		return { ...entry, sources };
	},
});

export const findByCanonicalUrl = query({
	args: { orgId: v.id("organizations"), canonicalUrl: v.string() },
	handler: async (ctx, { orgId, canonicalUrl }) => {
		await requireOrgMember(ctx, orgId);
		return await ctx.db
			.query("entries")
			.withIndex("by_org_canonicalUrl", (q) =>
				q.eq("orgId", orgId).eq("canonicalUrl", canonicalUrl),
			)
			.unique();
	},
});

export const markUsed = mutation({
	args: {
		orgId: v.id("organizations"),
		entryId: v.id("entries"),
		used: v.boolean(),
	},
	handler: async (ctx, { orgId, entryId, used }) => {
		const member = await requireOrgMember(ctx, orgId);
		const entry = await ctx.db.get(entryId);
		if (!entry || entry.orgId !== orgId) {
			throw new ConvexError("Entry not found");
		}
		await ctx.db.patch(entryId, {
			used,
			usedAt: used ? Date.now() : undefined,
			usedByUserId: used ? member.userId : undefined,
		});
	},
});

export const setArchived = mutation({
	args: {
		orgId: v.id("organizations"),
		entryId: v.id("entries"),
		archived: v.boolean(),
	},
	handler: async (ctx, { orgId, entryId, archived }) => {
		await requireOrgMember(ctx, orgId);
		const entry = await ctx.db.get(entryId);
		if (!entry || entry.orgId !== orgId) {
			throw new ConvexError("Entry not found");
		}
		await ctx.db.patch(entryId, { archived });
	},
});

export const recentCount = query({
	args: { orgId: v.id("organizations"), sinceMs: v.optional(v.number()) },
	handler: async (ctx, { orgId, sinceMs }) => {
		await requireOrgMember(ctx, orgId);
		const since = Date.now() - (sinceMs ?? 24 * 60 * 60 * 1000);
		const rows = await ctx.db
			.query("entries")
			.withIndex("by_org_fetchedAt", (q) =>
				q.eq("orgId", orgId).gte("fetchedAt", since),
			)
			.collect();
		return rows.length;
	},
});

export const _ingestOne = internalMutation({
	args: {
		orgId: v.id("organizations"),
		sourceId: v.id("sources"),
		originalUrl: v.string(),
		title: v.string(),
		snippet: v.optional(v.string()),
		content: v.optional(v.string()),
		publishedAt: v.optional(v.number()),
	},
	handler: async (ctx, args) => {
		const canonicalUrl = canonicalizeUrl(args.originalUrl);
		return await findOrCreateEntry(ctx, {
			orgId: args.orgId,
			sourceId: args.sourceId,
			canonicalUrl,
			originalUrl: args.originalUrl,
			title: args.title,
			snippet: args.snippet,
			content: args.content,
			publishedAt: args.publishedAt,
		});
	},
});

export const manualPaste = action({
	args: {
		orgId: v.id("organizations"),
		url: v.string(),
	},
	handler: async (ctx, { orgId, url }) => {
		const ensureRef = makeFunctionReference<"mutation">(
			"entries:_ensureManualSourceAsMember",
		) as unknown as FunctionReference<
			"mutation",
			"internal",
			{ orgId: Id<"organizations"> },
			Id<"sources">
		>;
		const sourceId = await ctx.runMutation(ensureRef, { orgId });

		const fetchRef = makeFunctionReference<"action">(
			"sources/manualAdapter:fetchUrl",
		) as unknown as FunctionReference<
			"action",
			"internal",
			{ url: string },
			{
				title: string;
				snippet?: string;
				content?: string;
				publishedAt?: number;
			}
		>;
		const fetched = await ctx.runAction(fetchRef, { url });

		const ingestRef = makeFunctionReference<"mutation">(
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
		return await ctx.runMutation(ingestRef, {
			orgId,
			sourceId,
			originalUrl: url,
			title: fetched.title,
			snippet: fetched.snippet,
			content: fetched.content,
			publishedAt: fetched.publishedAt,
		});
	},
});

export const _ensureManualSourceAsMember = internalMutation({
	args: { orgId: v.id("organizations") },
	handler: async (ctx, { orgId }): Promise<Id<"sources">> => {
		await requireOrgMember(ctx, orgId);
		const all = await ctx.db
			.query("sources")
			.withIndex("by_org", (q) => q.eq("orgId", orgId))
			.collect();
		const existing = all.find(
			(s) => s.type === "manual" && s.status !== "deleted",
		);
		if (existing) return existing._id;
		const now = Date.now();
		return await ctx.db.insert("sources", {
			orgId,
			type: "manual",
			name: "Manual paste",
			config: {},
			status: "active",
			health: "healthy",
			createdAt: now,
			updatedAt: now,
		});
	},
});
