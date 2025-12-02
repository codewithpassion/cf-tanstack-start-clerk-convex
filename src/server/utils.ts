import { auth } from "@clerk/tanstack-react-start/server";
import { ConvexHttpClient } from "convex/browser";

/**
 * Rate limit tracking per user
 */
interface RateLimitEntry {
    timestamps: number[];
}

// In-memory rate limit store (use KV or Durable Objects in production)
const rateLimitStore = new Map<string, RateLimitEntry>();

/**
 * Rate limit constants for image generation
 */
const IMAGE_GENERATION_RATE_LIMIT = {
    MAX_REQUESTS: 5,
    WINDOW_MS: 60000, // 1 minute
};

/**
 * Get Convex client with authentication
 */
export async function getAuthenticatedConvexClient(): Promise<ConvexHttpClient> {
    const convexUrl = process.env.VITE_CONVEX_URL;
    if (!convexUrl) {
        throw new Error("VITE_CONVEX_URL environment variable is not set");
    }
    const { userId, getToken } = await auth();
    const token = await getToken({ template: "convex" });
    if (!userId) {
        throw new Error("Authentication required to create Convex client");
    }
    if (!token) {
        throw new Error("Authentication token is required to create Convex client");
    } else {
        const client = new ConvexHttpClient(convexUrl);
        console.log("Setting Convex auth for user:", userId, token);
        client.setAuth(token);
        return client;
    }
}

/**
 * Check and enforce rate limit for image generation
 *
 * @param userId - User ID to check rate limit for
 * @throws Error if rate limit is exceeded
 */
export function checkImageGenerationRateLimit(userId: string): void {
    const now = Date.now();
    const windowStart = now - IMAGE_GENERATION_RATE_LIMIT.WINDOW_MS;

    // Get or create rate limit entry
    let entry = rateLimitStore.get(userId);
    if (!entry) {
        entry = { timestamps: [] };
        rateLimitStore.set(userId, entry);
    }

    // Filter out old timestamps outside the window
    entry.timestamps = entry.timestamps.filter(
        (timestamp) => timestamp > windowStart,
    );

    // Check if limit exceeded
    if (entry.timestamps.length >= IMAGE_GENERATION_RATE_LIMIT.MAX_REQUESTS) {
        throw new Error(
            `Image generation rate limit exceeded. Maximum ${IMAGE_GENERATION_RATE_LIMIT.MAX_REQUESTS} requests per minute. Please try again later.`,
        );
    }

    // Add current timestamp
    entry.timestamps.push(now);
}

/**
 * AI Environment Configuration
 */
export interface AIEnvironment {
    OPENAI_API_KEY?: string;
    ANTHROPIC_API_KEY?: string;
    DEFAULT_AI_PROVIDER?: string;
    DEFAULT_AI_MODEL?: string;
}

/**
 * Get AI environment configuration
 */
export function getAIEnvironment(): AIEnvironment {
    return {
        OPENAI_API_KEY: process.env.OPENAI_API_KEY,
        ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
        DEFAULT_AI_PROVIDER: process.env.DEFAULT_AI_PROVIDER,
        DEFAULT_AI_MODEL: process.env.DEFAULT_AI_MODEL,
    };
}
