/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as analytics from "../analytics.js";
import type * as auditLogs from "../auditLogs.js";
import type * as auth from "../auth.js";
import type * as categories from "../categories.js";
import type * as hackathonRoles from "../hackathonRoles.js";
import type * as hackathons from "../hackathons.js";
import type * as http from "../http.js";
import type * as judgeAssignments from "../judgeAssignments.js";
import type * as notifications from "../notifications.js";
import type * as problemQA from "../problemQA.js";
import type * as problems from "../problems.js";
import type * as rankings from "../rankings.js";
import type * as results from "../results.js";
import type * as submissions from "../submissions.js";
import type * as teamManagement from "../teamManagement.js";
import type * as teams from "../teams.js";
import type * as userProfiles from "../userProfiles.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  analytics: typeof analytics;
  auditLogs: typeof auditLogs;
  auth: typeof auth;
  categories: typeof categories;
  hackathonRoles: typeof hackathonRoles;
  hackathons: typeof hackathons;
  http: typeof http;
  judgeAssignments: typeof judgeAssignments;
  notifications: typeof notifications;
  problemQA: typeof problemQA;
  problems: typeof problems;
  rankings: typeof rankings;
  results: typeof results;
  submissions: typeof submissions;
  teamManagement: typeof teamManagement;
  teams: typeof teams;
  userProfiles: typeof userProfiles;
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
