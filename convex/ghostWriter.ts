import { type FunctionReference, makeFunctionReference } from "convex/server";
import { ConvexError, v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import {
	action,
	internalMutation,
	internalQuery,
	mutation,
	query,
} from "./_generated/server";
import { getAnthropicClient, PROFILE_MODEL } from "./lib/anthropic";
import { requireOrgMember } from "./orgAuth";

const MAX_EXAMPLES_CHARS = 50_000;

export const listExamples = query({
	args: { orgId: v.id("organizations") },
	handler: async (ctx, { orgId }) => {
		await requireOrgMember(ctx, orgId);
		return await ctx.db
			.query("ghostWriterExamples")
			.withIndex("by_org", (q) => q.eq("orgId", orgId))
			.order("desc")
			.collect();
	},
});

export const addExample = mutation({
	args: {
		orgId: v.id("organizations"),
		title: v.string(),
		content: v.string(),
	},
	handler: async (ctx, { orgId, title, content }) => {
		const member = await requireOrgMember(ctx, orgId, "admin");
		const cleanTitle = title.trim();
		const cleanContent = content.trim();
		if (!cleanTitle) throw new ConvexError("Title is required");
		if (!cleanContent) throw new ConvexError("Content is required");
		return await ctx.db.insert("ghostWriterExamples", {
			orgId,
			title: cleanTitle,
			content: cleanContent,
			addedByUserId: member.userId,
			createdAt: Date.now(),
		});
	},
});

export const removeExample = mutation({
	args: {
		orgId: v.id("organizations"),
		exampleId: v.id("ghostWriterExamples"),
	},
	handler: async (ctx, { orgId, exampleId }) => {
		await requireOrgMember(ctx, orgId, "admin");
		const ex = await ctx.db.get(exampleId);
		if (!ex || ex.orgId !== orgId) {
			throw new ConvexError("Example not found");
		}
		await ctx.db.delete(exampleId);
	},
});

export const getProfile = query({
	args: { orgId: v.id("organizations") },
	handler: async (ctx, { orgId }) => {
		await requireOrgMember(ctx, orgId);
		return await ctx.db
			.query("ghostWriterProfiles")
			.withIndex("by_org", (q) => q.eq("orgId", orgId))
			.unique();
	},
});

export const deleteProfile = mutation({
	args: { orgId: v.id("organizations") },
	handler: async (ctx, { orgId }) => {
		await requireOrgMember(ctx, orgId, "admin");
		const existing = await ctx.db
			.query("ghostWriterProfiles")
			.withIndex("by_org", (q) => q.eq("orgId", orgId))
			.unique();
		if (existing) await ctx.db.delete(existing._id);
	},
});

export const _loadExamplesForGeneration = internalQuery({
	args: { orgId: v.id("organizations") },
	handler: async (ctx, { orgId }): Promise<Doc<"ghostWriterExamples">[]> => {
		await requireOrgMember(ctx, orgId, "admin");
		return await ctx.db
			.query("ghostWriterExamples")
			.withIndex("by_org", (q) => q.eq("orgId", orgId))
			.collect();
	},
});

export const _storeProfile = internalMutation({
	args: {
		orgId: v.id("organizations"),
		summary: v.string(),
		voiceAttributes: v.array(v.string()),
		doExamples: v.array(v.string()),
		dontExamples: v.array(v.string()),
		model: v.string(),
	},
	handler: async (ctx, args) => {
		const existing = await ctx.db
			.query("ghostWriterProfiles")
			.withIndex("by_org", (q) => q.eq("orgId", args.orgId))
			.unique();
		const payload = {
			orgId: args.orgId,
			summary: args.summary,
			voiceAttributes: args.voiceAttributes,
			doExamples: args.doExamples,
			dontExamples: args.dontExamples,
			generatedAt: Date.now(),
			model: args.model,
		};
		if (existing) await ctx.db.replace(existing._id, payload);
		else await ctx.db.insert("ghostWriterProfiles", payload);
	},
});

interface ProfileJson {
	summary?: string;
	voiceAttributes?: string[];
	doExamples?: string[];
	dontExamples?: string[];
}

function extractJson(text: string): ProfileJson {
	// Try fenced ```json block first, then bare JSON.
	const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
	const candidate = fenced ? fenced[1] : text;
	const start = candidate.indexOf("{");
	const end = candidate.lastIndexOf("}");
	if (start === -1 || end === -1 || end <= start) {
		throw new ConvexError(
			"Could not parse a tone-of-voice profile from the model response.",
		);
	}
	try {
		return JSON.parse(candidate.slice(start, end + 1)) as ProfileJson;
	} catch {
		throw new ConvexError(
			"Could not parse a tone-of-voice profile from the model response.",
		);
	}
}

function toStringArray(value: unknown): string[] {
	if (!Array.isArray(value)) return [];
	return value.filter((v): v is string => typeof v === "string" && v.trim() !== "");
}

export const generateProfile = action({
	args: { orgId: v.id("organizations") },
	handler: async (
		ctx,
		{ orgId },
	): Promise<{ summary: string; voiceAttributes: string[] }> => {
		const loadRef = makeFunctionReference<"query">(
			"ghostWriter:_loadExamplesForGeneration",
		) as unknown as FunctionReference<
			"query",
			"internal",
			{ orgId: Id<"organizations"> },
			Doc<"ghostWriterExamples">[]
		>;
		const examples = await ctx.runQuery(loadRef, { orgId });
		if (examples.length === 0) {
			throw new ConvexError(
				"Upload at least one example newsletter before generating a profile.",
			);
		}
		if (!process.env.ANTHROPIC_API_KEY) {
			throw new ConvexError(
				"ANTHROPIC_API_KEY is not set on the Convex deployment.",
			);
		}

		let total = 0;
		const blocks: string[] = [];
		for (const ex of examples) {
			const piece = `# ${ex.title}\n\n${ex.content}`;
			if (total + piece.length > MAX_EXAMPLES_CHARS) {
				const remaining = MAX_EXAMPLES_CHARS - total;
				if (remaining > 200) blocks.push(piece.slice(0, remaining));
				break;
			}
			blocks.push(piece);
			total += piece.length;
		}
		const combined = blocks.join("\n\n---\n\n");

		const anthropic = getAnthropicClient();
		const res = await anthropic.messages.create({
			model: PROFILE_MODEL,
			max_tokens: 1500,
			system:
				"You analyse writing samples and extract a precise tone-of-voice profile. " +
				"You always reply with a single fenced JSON block, no prose outside it.",
			messages: [
				{
					role: "user",
					content:
						"Below are example newsletters from one author/organisation. " +
						"Extract their tone of voice so future drafts can match it.\n\n" +
						"Return JSON with this exact shape:\n" +
						"{\n" +
						'  "summary": "2-4 sentence overview of how this author writes",\n' +
						'  "voiceAttributes": ["short concrete adjectives or phrases describing the voice"],\n' +
						'  "doExamples": ["specific things to do when writing in this voice"],\n' +
						'  "dontExamples": ["specific things to avoid"]\n' +
						"}\n\n" +
						"Examples:\n\n" +
						combined,
				},
			],
		});

		const textPart = res.content.find((c) => c.type === "text");
		if (!textPart || textPart.type !== "text") {
			throw new ConvexError("Empty response from Claude.");
		}
		const parsed = extractJson(textPart.text);
		const summary =
			typeof parsed.summary === "string" && parsed.summary.trim() !== ""
				? parsed.summary.trim()
				: "Tone-of-voice profile";
		const voiceAttributes = toStringArray(parsed.voiceAttributes);
		const doExamples = toStringArray(parsed.doExamples);
		const dontExamples = toStringArray(parsed.dontExamples);

		const storeRef = makeFunctionReference<"mutation">(
			"ghostWriter:_storeProfile",
		) as unknown as FunctionReference<
			"mutation",
			"internal",
			{
				orgId: Id<"organizations">;
				summary: string;
				voiceAttributes: string[];
				doExamples: string[];
				dontExamples: string[];
				model: string;
			},
			void
		>;
		await ctx.runMutation(storeRef, {
			orgId,
			summary,
			voiceAttributes,
			doExamples,
			dontExamples,
			model: PROFILE_MODEL,
		});

		return { summary, voiceAttributes };
	},
});
