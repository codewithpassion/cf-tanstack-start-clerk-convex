# Tech Stack

## Frontend

| Technology | Purpose |
|------------|---------|
| **React 19** | UI component library with latest concurrent features |
| **TanStack Start** | Full-stack React framework with SSR support |
| **TanStack Router** | File-based routing with type-safe navigation |
| **Tailwind CSS** | Utility-first CSS framework for styling |
| **Tiptap** (recommended) | Rich text editor for content editing |

## Server & API

| Technology | Purpose |
|------------|---------|
| **Hono** | Lightweight web framework wrapping TanStack Start |
| **TanStack Server Functions** | Type-safe server functions for data loading |
| **Cloudflare Workers** | Edge runtime for server-side execution |

## Database & Backend

| Technology | Purpose |
|------------|---------|
| **Convex** | Real-time backend with document database, queries, and mutations |
| **Cloudflare R2** (recommended) | Object storage for file uploads (documents, images) |

## Authentication

| Technology | Purpose |
|------------|---------|
| **Clerk** | User authentication, session management, JWT tokens |
| **@hono/clerk-auth** | Clerk middleware integration for Hono |
| **@clerk/tanstack-react-start** | Clerk integration for TanStack Start |

## AI & Machine Learning

| Technology | Purpose |
|------------|---------|
| **@ai-sdk (Vercel AI SDK)** | Unified TypeScript library for LLM integration |
| **OpenAI API** | GPT models for content generation and chat |
| **Anthropic API** | Claude models as alternative LLM provider |
| **DALL-E API** | Image generation for content visuals |
| **Google Imagen** (optional) | Alternative image generation provider |

## Build & Development

| Technology | Purpose |
|------------|---------|
| **Vite** | Build tool and development server |
| **Bun** | JavaScript runtime and package manager |
| **TypeScript** | Type-safe JavaScript with strict mode |
| **Biome** | Linting and code formatting |

## Testing

| Technology | Purpose |
|------------|---------|
| **Vitest** | Test framework compatible with Vite |
| **@testing-library/react** | React component testing utilities |
| **jsdom** | DOM environment for tests |

## Deployment & Infrastructure

| Technology | Purpose |
|------------|---------|
| **Cloudflare Workers** | Edge deployment runtime |
| **Wrangler** | Cloudflare CLI for deployment and local development |
| **GitHub Actions** (recommended) | CI/CD pipeline for testing and deployment |

## Configuration Files

| File | Purpose |
|------|---------|
| `wrangler.jsonc` | Cloudflare Workers configuration |
| `vite.config.ts` | Vite build configuration |
| `tsconfig.json` | TypeScript configuration with path aliases |
| `convex/` directory | Convex schema, queries, and mutations |

## Path Aliases

```typescript
// Configured in tsconfig.json
"@/*" -> "./src/*"
```

## Environment Variables

### Client-Side (VITE_ prefix)
- `VITE_CLERK_PUBLISHABLE_KEY` - Clerk public key
- `VITE_CONVEX_URL` - Convex deployment URL

### Server-Side
- `CLERK_SECRET_KEY` - Clerk secret key
- `OPENAI_API_KEY` - OpenAI API access
- `ANTHROPIC_API_KEY` - Anthropic API access

### Cloudflare Workers
- Environment variables configured in `wrangler.jsonc` under `vars`
- Access via `env` from `cloudflare:workers` import

## Key Architectural Decisions

1. **Edge-First Runtime**: All server code runs on Cloudflare Workers, not Node.js. Limited Node.js compatibility via `nodejs_compat` flag.

2. **File-Based Routing**: Routes defined in `src/routes/` and auto-generated into `src/routeTree.gen.ts`.

3. **Server Functions over REST**: Prefer TanStack Server Functions for data loading; use Hono API routes only for REST APIs or webhooks.

4. **Convex for Real-Time**: Convex provides real-time subscriptions, eliminating need for separate WebSocket infrastructure.

5. **AI SDK Abstraction**: @ai-sdk provides unified interface across OpenAI and Anthropic, enabling easy model switching.
