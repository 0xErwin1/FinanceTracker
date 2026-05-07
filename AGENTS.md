# Project Agent Instructions

These instructions apply to the Expenses Project repository. They complement the user's global agent rules and should be followed by any AI coding agent working in this repo.

## Ground rules

- Treat this as a production-quality personal finance application, not a prototype, unless the user explicitly says otherwise.
- Keep changes small, focused, and directly tied to the requested task.
- Do not commit generated build output, coverage output, local databases, dependency folders, or local environment files.
- Do not expose secrets from `.env`, `.env.test`, Redis, PostgreSQL, logs, or local configuration.
- Keep comments and documentation in English.

## Repository facts

| Area | Current convention |
|------|--------------------|
| Package manager | pnpm workspaces, pnpm 10.33.0. |
| Runtime | Node.js 24. |
| Language | TypeScript with strict mode enabled. |
| Formatting/linting | Biome, 2 spaces, single quotes in JavaScript/TypeScript, semicolons. |
| Frontend | Vue 3, Vite, Vue Router, Tailwind CSS, Vitest. |
| Backend | Express, tRPC, TypeORM, PostgreSQL, Redis-backed sessions, Jest. |
| Shared API | `packages/api` exports common types/enums and tRPC primitives. |

## Commands to prefer

Run commands from the repository root unless a package-specific script requires otherwise.

| Task | Command |
|------|---------|
| Install dependencies | `pnpm install` |
| Start all dev servers | `pnpm dev` |
| Build all workspaces | `pnpm build` |
| Lint all workspaces | `pnpm lint` |
| Test all workspaces | `pnpm test` |
| Format all workspaces | `pnpm format` |
| Frontend only | `pnpm --filter @expenses/frontend <script>` |
| Backend only | `pnpm --filter @expenses/backend <script>` |
| Shared API only | `pnpm --filter @expenses/api <script>` |

## Editing guidance

- Backend domain changes usually involve `apps/backend/src/services`, `apps/backend/src/trpc/routers`, `apps/backend/src/entities`, and `packages/api/src/types`.
- Frontend feature changes usually involve `apps/frontend/src/views`, `apps/frontend/src/composables`, and shared types from `@expenses/api`.
- Keep browser code on client-safe `@expenses/api` exports. The frontend Vite config aliases `@expenses/api` to `packages/api/src/client.ts` to avoid importing server-only tRPC code.
- Keep server-only tRPC primitives in backend or server-specific shared exports.
- Add or update tests next to the package being changed. Backend tests use Jest; frontend tests use Vitest.
- For schema changes, add a TypeORM migration instead of relying on synchronization.

## Documentation guidance

- Use `README.md` for setup and operational entry points.
- Use `ARCHITECTURE.md` for boundaries, runtime flow, and important design decisions.
- Use `CODE_STYLE.md` for coding conventions and verification expectations.
- Avoid creating personal working-note markdown files in the repository. If personal notes are needed, store them outside the repo.
