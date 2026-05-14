interface VoyageEmbeddingResponse {
	data?: Array<{ embedding?: number[] }>;
}

export async function embed(texts: string[]): Promise<number[][] | null> {
	if (texts.length === 0) return [];
	const apiKey = process.env.VOYAGE_API_KEY;
	if (!apiKey) {
		console.warn("VOYAGE_API_KEY not set; embedding pipeline disabled");
		return null;
	}
	const model = process.env.VOYAGE_MODEL ?? "voyage-3-lite";
	const res = await fetch("https://api.voyageai.com/v1/embeddings", {
		method: "POST",
		headers: {
			"content-type": "application/json",
			authorization: `Bearer ${apiKey}`,
		},
		body: JSON.stringify({ input: texts, model }),
	});
	if (!res.ok) {
		const body = await res.text().catch(() => "");
		throw new Error(`Voyage embed failed: ${res.status} ${body.slice(0, 200)}`);
	}
	const data = (await res.json()) as VoyageEmbeddingResponse;
	const out = (data.data ?? []).map((r) => r.embedding ?? []);
	if (out.length !== texts.length) {
		throw new Error(
			`Voyage returned ${out.length} embeddings for ${texts.length} inputs`,
		);
	}
	return out;
}
