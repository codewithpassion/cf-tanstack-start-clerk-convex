/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as activityLog from "../activityLog.js";
import type * as auth from "../auth.js";
import type * as billing_accounts from "../billing/accounts.js";
import type * as billing_admin from "../billing/admin.js";
import type * as billing_pricing from "../billing/pricing.js";
import type * as billing_settings from "../billing/settings.js";
import type * as billing_stripe from "../billing/stripe.js";
import type * as billing_usage from "../billing/usage.js";
import type * as brandVoices from "../brandVoices.js";
import type * as categories from "../categories.js";
import type * as contentChatMessages from "../contentChatMessages.js";
import type * as contentImages from "../contentImages.js";
import type * as contentPieces from "../contentPieces.js";
import type * as contentVersions from "../contentVersions.js";
import type * as examples from "../examples.js";
import type * as files from "../files.js";
import type * as http from "../http.js";
import type * as imagePromptTemplates from "../imagePromptTemplates.js";
import type * as knowledgeBase from "../knowledgeBase.js";
import type * as lib_auth from "../lib/auth.js";
import type * as personas from "../personas.js";
import type * as projects from "../projects.js";
import type * as search from "../search.js";
import type * as users from "../users.js";
import type * as workspaces from "../workspaces.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  activityLog: typeof activityLog;
  auth: typeof auth;
  "billing/accounts": typeof billing_accounts;
  "billing/admin": typeof billing_admin;
  "billing/pricing": typeof billing_pricing;
  "billing/settings": typeof billing_settings;
  "billing/stripe": typeof billing_stripe;
  "billing/usage": typeof billing_usage;
  brandVoices: typeof brandVoices;
  categories: typeof categories;
  contentChatMessages: typeof contentChatMessages;
  contentImages: typeof contentImages;
  contentPieces: typeof contentPieces;
  contentVersions: typeof contentVersions;
  examples: typeof examples;
  files: typeof files;
  http: typeof http;
  imagePromptTemplates: typeof imagePromptTemplates;
  knowledgeBase: typeof knowledgeBase;
  "lib/auth": typeof lib_auth;
  personas: typeof personas;
  projects: typeof projects;
  search: typeof search;
  users: typeof users;
  workspaces: typeof workspaces;
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
