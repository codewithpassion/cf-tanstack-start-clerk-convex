# Style Guide

## Code Formatting
- Use Biome for linting and formatting
- Tab indentation (not spaces)
- Double quotes for strings
- Imports are auto-organized by Biome
- NEVER USE `any` as a type. We need strict Typescript typing

## Naming Conventions
- React components use PascalCase
- Files use kebab-case
- Variables use camelCase

## Project Structure
- TypeScript: Use strict mode with explicit typing

## Frontend
- Use TailwindCSS for styling
- Utilize ShadCN components from `src/components/ui`
- Authentication through `Clerk` 


## Backend
- Always use `bun` as the package manager
- Use `hono` for backend functionality
- Database: Convex
- Data storage: Cloudflare R2, KV

## Environment Variables & Types
- **Never directly edit** `workers/worker-configuration.d.ts` (auto-generated file)
- Add environment variables to `wrangler.jsonc` (`vars` section)
- Add secrets to `.dev.vars` for local development and `.dev.vars.example` for documentation
- Run `bun cf-typegen` to regenerate TypeScript types after changes
- Use `wrangler secret put VARIABLE_NAME` for production secrets

# MCP:
- make sure you check context7 for up to date library specifications

# Linting
After every change, run `bun check` to make sure the linter is happy