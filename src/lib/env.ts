/**
 * Helper to access Cloudflare Workers environment bindings.
 * This abstraction allows for easier testing by providing a single
 * function to mock instead of mocking the cloudflare:workers import.
 */

/**
 * Gets the R2 bucket binding from the Cloudflare Workers environment.
 * @returns R2Bucket instance
 * @throws Error if R2 bucket is not configured
 */
export async function getR2Bucket(): Promise<R2Bucket> {
	const { env } = await import("cloudflare:workers");
	const bucket = env.R2_BUCKET;

	if (!bucket) {
		throw new Error("R2 bucket not configured");
	}

	return bucket;
}
