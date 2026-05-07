# Expenses Project Architecture

The project is a pnpm monorepo with a Vue frontend, an Express/tRPC backend, and a shared TypeScript API package. PostgreSQL stores durable finance data, while Redis supports sessions and background queue infrastructure.

## System overview

```text
Browser
  |
  | Vue 3 + Vite frontend
  | /trpc requests proxied in development
  v
Express backend
  |
  | tRPC routers call service modules
  v
Domain services
  |
  | TypeORM repositories and entities
  v
PostgreSQL

Express sessions and queue infrastructure use Redis.
```

## Workspace boundaries

| Workspace | Responsibility | Must not own |
|-----------|----------------|--------------|
| `apps/frontend` | Browser UI, routing, composables, presentation logic, and client-side tests. | Database access, server-only tRPC primitives, session storage. |
| `apps/backend` | HTTP server, tRPC routers, authentication/session context, services, entities, migrations, and backend tests. | Browser-only presentation state. |
| `packages/api` | Shared DTOs, enums, tRPC primitives, and client-safe/server-only barrels. | Runtime business logic or persistence logic. |

## Backend flow

1. `apps/backend/src/server.ts` starts the backend process.
2. `apps/backend/src/app.ts` creates the Express application, configures middleware, exposes `/api/health`, and mounts tRPC at `/trpc`.
3. `apps/backend/src/trpc/root.ts` composes feature routers such as `auth`, `account`, `transaction`, `budget`, `recurring`, and `installment`.
4. tRPC routers validate procedure inputs and call controllers or service modules.
5. Services use TypeORM entities and repositories to read and write PostgreSQL data.
6. Session-backed authentication resolves the active user through Redis in `apps/backend/src/trpc/context.ts`.

## Frontend flow

1. `apps/frontend/src/main.ts` creates the Vue app and installs the router.
2. `apps/frontend/src/router/index.ts` defines public routes and authenticated application routes.
3. Route guards call `useAuth()` to fetch the current user once before protected navigation.
4. Views under `apps/frontend/src/views` render feature pages.
5. Composables under `apps/frontend/src/composables` centralize API interaction and reusable state.
6. Shared types and enums come from the client-safe `@expenses/api` barrel.

## Shared API package

`packages/api` keeps shared contracts close to both applications.

| Entry point | Intended use |
|-------------|--------------|
| `packages/api/src/client.ts` | Browser-safe exports for frontend code. It excludes `@trpc/server`. |
| `packages/api/src/server.ts` | Server-only tRPC exports for backend code. |
| `packages/api/src/index.ts` | Main shared barrel used by packages that can safely load the full API surface. |

The frontend Vite config aliases `@expenses/api` to `packages/api/src/client.ts`. Keep this boundary intact so browser bundles do not load server-only tRPC code.

## Data and infrastructure

| Component | Role |
|-----------|------|
| PostgreSQL | Durable storage for users, accounts, transactions, categories, budgets, goals, recurring transactions, installments, institutions, and exchange rates. |
| Redis | Express session storage, session-to-user lookup, and queue infrastructure. |
| TypeORM migrations | Schema evolution. Keep `synchronize: false` and add migrations for database changes. |
| Docker Compose | Local PostgreSQL and Redis services for development and test isolation. |

## Important design decisions

- The backend uses tRPC as the application API surface rather than separate REST controllers for the main feature modules.
- Session authentication is stateful and Redis-backed. tRPC context turns the Express session id into a `userId` for protected procedures.
- Shared DTOs and enums live in `packages/api` to keep frontend and backend contracts aligned.
- Frontend code must use the client-safe shared API entry point to avoid server-only dependencies in the browser bundle.
- Database schema changes should be represented as migrations, not runtime synchronization.

## Testing boundaries

| Area | Test runner | Typical location |
|------|-------------|------------------|
| Backend | Jest with ts-jest | `apps/backend/test` and `apps/backend/src/**/*.test.ts` |
| Frontend | Vitest | `apps/frontend/src/**/*.test.ts` |
| Shared API | TypeScript build and Biome linting | `packages/api/src` |

Run package-level tests with `pnpm --filter <package> test` and workspace-wide verification with `pnpm test`, `pnpm lint`, and `pnpm build`.
