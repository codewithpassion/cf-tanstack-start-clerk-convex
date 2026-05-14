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

import type * as auth from "../auth.js";
import type * as entries from "../entries.js";
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
// They are still deployed by Convex codegen at runtime — we reference them via
// `makeFunctionReference(...)` to avoid blowing past TS's recursive-type depth
// limit during compilation.
declare const fullApi: ApiFromModules<{
  auth: typeof auth;
  entries: typeof entries;
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
