/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type {
  AnyApi,
  FunctionReference,
  ApiFromModules,
  FilterApi,
} from "convex/server";

import type * as analytics from "../analytics.js";
import type * as auth from "../auth.js";
import type * as autoDrafts from "../autoDrafts.js";
import type * as drafts from "../drafts.js";
import type * as entries from "../entries.js";
import type * as ghostWriter from "../ghostWriter.js";
import type * as http from "../http.js";
import type * as orgAuth from "../orgAuth.js";
import type * as organizations from "../organizations.js";
import type * as sourceRuns from "../sourceRuns.js";
import type * as sources from "../sources.js";
import type * as users from "../users.js";

// Note: the cron module (`crons.ts`), the dedupe helper (`dedupe.ts`),
// the internal sources runner (`sourcesRunner.ts`), and the per-type source
// adapters under `sources/` (`rssAdapter`, `webSearchAdapter`, `websiteAdapter`,
// `manualAdapter`) are intentionally omitted from this typed module map.
// The AI modules (`ai/embeddings`, `ai/search`, `ai/draft`) and the embedding
// adapter (`lib/voyage`, `lib/anthropic`) are also omitted for the same reason.
// They are still deployed by Convex codegen at runtime — we reference them via
// `makeFunctionReference(...)` to avoid blowing past TS's recursive-type depth
// limit during compilation. `ghostWriter` and `drafts` are kept in the typed
// map because the UI consumes them via `useQuery`/`useMutation`/`useAction`.
declare const fullApi: ApiFromModules<{
  analytics: typeof analytics;
  auth: typeof auth;
  autoDrafts: typeof autoDrafts;
  drafts: typeof drafts;
  entries: typeof entries;
  ghostWriter: typeof ghostWriter;
  http: typeof http;
  orgAuth: typeof orgAuth;
  organizations: typeof organizations;
  sourceRuns: typeof sourceRuns;
  sources: typeof sources;
  users: typeof users;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
