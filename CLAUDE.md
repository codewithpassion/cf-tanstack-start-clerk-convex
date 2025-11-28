# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a TanStack Start application configured to deploy on Cloudflare Workers. It combines TanStack Router for file-based routing with Hono for API endpoints and server-side rendering, all running on Cloudflare's edge runtime.

**Key Stack**: TanStack Start + React 19 + Hono + Cloudflare Workers + Clerk (auth) + Convex (backend)

## Essential Commands

### Development
```bash
bun dev              # Start dev server at http://localhost:5173
bun check            # Run all checks (types, linting, formatting)
bun biome:check      # Run Biome linter and formatter only
```

### Formatting Rules
- **Indentation**: Tabs (not spaces)
- **Quotes**: Double quotes for strings
- **TypeScript**: Strict mode - NEVER use `any` type
- **Imports**: Auto-organized by Biome
- **Linting**: Always run `bun check` after changes

### Type Errors
- Run `bun check` to see all type errors
- Check that `bun cf-typegen` was run after env changes
- Ensure no `any` types are used

## Key Architecture

### Deployment Architecture
- **Runtime**: Cloudflare Workers (not Node.js)
- **SSR Framework**: TanStack Start with React 19
- **Server Framework**: Hono wraps the TanStack Start server entry point
- **Entry Point**: `workers/app.ts` exports the Cloudflare Worker handler
- **Auth Provider**: Clerk for authentication
- **Backend/Database**: Convex for data persistence

### Server Entry Flow
1. `workers/app.ts` creates a Hono app that serves as the Cloudflare Worker
2. Clerk middleware is applied globally via `@hono/clerk-auth`
3. Hono handles custom API routes (e.g., `/api/health`)
4. All other requests are passed to TanStack Start's `serverEntry.fetch()`
5. TanStack Start handles SSR and routing via the generated `routeTree.gen.ts`

### Routing System
- **File-based routing** in `src/routes/`
- Routes are auto-generated into `src/routeTree.gen.ts` by TanStack Router
- Root layout: `src/routes/__root.tsx` (includes Header, devtools, and HTML shell)
- Router factory: `src/router.tsx` exports `getRouter()` function
- Protected routes use `_authed.tsx` layout with `beforeLoad` auth check

### Authentication & Authorization
- **Clerk**: Handles sign-in/sign-up, session management, JWT tokens
- **Convex**: Syncs user data from Clerk, stores user profiles with roles
- **RBAC**: Role-based access control with `user`, `admin`, `superadmin` roles
- **Permissions**: Granular permission system in `src/lib/permissions.ts`

**Auth check pattern in routes:**
```tsx
import { auth } from '@clerk/tanstack-react-start/server'

const checkAuth = createServerFn({ method: 'GET' }).handler(async () => {
  const { userId } = await auth()
  if (!userId) throw redirect({ to: '/sign-in' })
  return { userId }
})

export const Route = createFileRoute('/_authed')({
  beforeLoad: async () => await checkAuth(),
})
```

### Environment Variables
- Development: Use `.env` file (VITE_ prefix for client-side)
- Production: Configure in `wrangler.jsonc` under `vars` section
- Cloudflare runtime: Access via `env` from `cloudflare:workers` import
- Server functions can access both `env.VARIABLE` (Cloudflare) and `process.env.VARIABLE`

**Required env vars for auth:**
- `VITE_CLERK_PUBLISHABLE_KEY` - Clerk publishable key
- `CLERK_SECRET_KEY` - Clerk secret (server-only)
- `VITE_CONVEX_URL` - Convex deployment URL

### Path Aliases
- `@/*` maps to `./src/*` (configured in tsconfig.json)
- Enabled via `vite-tsconfig-paths` plugin in vite.config.ts

## Development Commands

```bash
# Install dependencies
bun install

# Development server (runs on port 3000)
bun run dev

# Build for production
bun run build

# Preview production build locally
bun run preview

# Run tests
bun run test

# Deploy to Cloudflare
bun run deploy

# Generate Cloudflare Worker types
bun run cf-typegen

# Code quality checks
bun run check              # Run all checks (types, build, biome)
bun run check:tsc          # TypeScript type checking only
bun run biome:check        # Biome lint + format

# Convex backend
bun run convex:dev         # Start Convex dev server
bun run convex:deploy      # Deploy Convex backend

# Production logs
bun run tail:prod          # View production Worker logs
bun run tail:staging       # View staging Worker logs
```

## Testing

- Test framework: Vitest with jsdom
- Testing library: @testing-library/react
- Run single test: `vitest run <test-file-pattern>`
- Watch mode: `vitest` (instead of `vitest run`)

## Adding New Routes

1. Create a new file in `src/routes/` (e.g., `src/routes/about.tsx`)
2. TanStack Router automatically regenerates `src/routeTree.gen.ts`
3. Use `createFileRoute` to define the route component and loaders
4. Link to routes using `<Link to="/about">` from `@tanstack/react-router`

## Server Functions vs API Routes

**Server Functions** (preferred for data loading):
```tsx
import { createServerFn } from '@tanstack/react-start'
import { env } from 'cloudflare:workers'

const myServerFn = createServerFn({ method: 'GET' })
  .handler(async () => {
    // Access Cloudflare env bindings
    return { data: env.MY_VARIABLE }
  })
```

**Hono API Routes** (for REST APIs):
```tsx
// In workers/app.ts
app.get("/api/endpoint", (c) => {
  return c.json({ data: "value" })
})
```

## Cloudflare-Specific Considerations

- No Node.js APIs available (Workers runtime only)
- Enable `nodejs_compat` in wrangler.jsonc for limited Node.js compatibility
- Use `cloudflare:workers` imports for runtime APIs and environment bindings
- Worker types are in `workers/worker-configuration.d.ts`

## Important Files

- `workers/app.ts` - Cloudflare Worker entry point with Hono + Clerk middleware
- `wrangler.jsonc` - Cloudflare Workers configuration (deployment, bindings, env vars)
- `src/router.tsx` - Router factory function
- `src/routes/__root.tsx` - Root layout with HTML shell
- `src/routes/_authed.tsx` - Protected route layout with auth check
- `src/lib/permissions.ts` - RBAC permission system and role definitions
- `src/contexts/auth-context.tsx` - React context for global auth state
- `src/lib/convex.tsx` - Convex client provider setup
- `convex/schema.ts` - Convex database schema (users table)
- `convex/users.ts` - User queries and mutations (syncUser, getMe)
- `vite.config.ts` - Vite plugins: Cloudflare, TanStack Start, React, Tailwind

## Importing convex api and types:

Use these import paths:
```ts
import { api } from "@/convex/api";
import type { Id } from "@/convex/dataModel";
```

## Convex Backend

The Convex backend stores user data synced from Clerk:

```tsx
// Sync user from Clerk to Convex (call after auth)
import { useMutation } from 'convex/react'
import { api } from '../convex/_generated/api'

const syncUser = useMutation(api.users.syncUser)
await syncUser({ email, name, clerkId, imageUrl, roles })

// Query current user
import { useQuery } from 'convex/react'
const user = useQuery(api.users.getMe)
```

## Demo Files

Files prefixed with `demo` (in `src/routes/demo/` and `src/data/`) are examples and can be safely deleted.
