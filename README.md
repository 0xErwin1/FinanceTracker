# Expenses Project

Expenses Project is a personal finance tracker built as a TypeScript monorepo. It provides a Vue frontend, an Express/tRPC backend, and a shared API package for common types and enums.

## Quick start

1. Use Node.js 24 and pnpm 10.33.0.
2. Install dependencies:

   ```bash
   pnpm install
   ```

3. If `apps/backend/.env` does not exist, create it from the sample:

   ```bash
   cp -n apps/backend/.env.sample apps/backend/.env
   ```

4. Start local infrastructure:

   ```bash
   docker compose up -d
   ```

5. Start the applications:

   ```bash
   pnpm dev
   ```

The frontend runs on `http://localhost:5173` and proxies `/trpc` requests to the backend on `http://localhost:3000`.

## What is in this repository

| Path | Purpose |
|------|---------|
| `apps/frontend` | Vue 3, Vite, Tailwind CSS, Vue Router, and Vitest frontend application. |
| `apps/backend` | Express, tRPC, TypeORM, PostgreSQL, Redis session storage, and Jest backend application. |
| `packages/api` | Shared API types, enums, tRPC primitives, and client-safe/server-only exports. |
| `docker-compose.yml` | Local PostgreSQL and Redis services. |
| `docker-compose.test.yml` | Test PostgreSQL and Redis services on isolated ports. |
| `biome.json` | Shared linting and formatting configuration. |
| `tsconfig.base.json` | Shared strict TypeScript configuration for the workspace. |

## Workspace commands

Run these commands from the repository root.

| Command | Description |
|---------|-------------|
| `pnpm dev` | Starts all workspace development servers in parallel. |
| `pnpm build` | Builds every workspace package and application. |
| `pnpm lint` | Runs Biome checks across workspaces. |
| `pnpm test` | Runs workspace tests. |
| `pnpm format` | Applies Biome formatting across workspaces. |

## Application commands

Run package-specific commands with `pnpm --filter <package> <script>`.

| Package | Common commands |
|---------|-----------------|
| `@expenses/frontend` | `dev`, `build`, `test`, `preview`, `lint`, `format` |
| `@expenses/backend` | `dev`, `build`, `start`, `test`, `lint`, `format`, `seed` |
| `@expenses/api` | `build`, `lint` |

Examples:

```bash
pnpm --filter @expenses/frontend dev
pnpm --filter @expenses/backend test
pnpm --filter @expenses/api build
```

## Local services

The default development stack uses these local services:

| Service | Container | Port | Notes |
|---------|-----------|------|-------|
| PostgreSQL | `expenses-postgres` | `5432` | Uses database `expenses`. |
| Redis | `expenses-redis` | `6379` | Stores session and queue data. |
| PostgreSQL test | `expenses-postgres-test` | `5433` | Defined in `docker-compose.test.yml`. |
| Redis test | `expenses-redis-test` | `6380` | Defined in `docker-compose.test.yml`. |

Backend runtime configuration lives in `apps/backend/.env`. Keep local `.env` and `.env.test` files out of version control.

Backend tests load `apps/backend/.env.test`. Create that local file with test database and Redis URLs that match `docker-compose.test.yml` before running the backend test suite.

## Main features

- Authentication and session-backed user context.
- Accounts, institutions, balances, and valuation snapshots.
- Transactions, categories, budgets, recurring transactions, and installments.
- Financial goals and dashboard analytics.
- Multi-currency preferences and exchange-rate support.

## Documentation map

- `ARCHITECTURE.md` explains the system boundaries, runtime flow, and package responsibilities.
- `CODE_STYLE.md` documents coding, formatting, testing, and TypeScript conventions.
- `AGENTS.md` gives project-specific instructions for AI coding agents.
- `CLAUDE.md` points Claude-compatible tools at the same project instructions.

## License

This project is dual-licensed under either Apache License 2.0 or MIT, at your option. See `LICENSE-APACHE` and `LICENSE-MIT` for details.
