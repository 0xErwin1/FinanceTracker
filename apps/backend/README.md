# Expenses Backend

The backend is the Express/tRPC service for Expenses Project. It owns authentication, session context, domain services, TypeORM entities, migrations, and PostgreSQL/Redis integration.

For full project setup, architecture, and coding standards, start with the repository root documentation:

- `../../README.md`
- `../../ARCHITECTURE.md`
- `../../CODE_STYLE.md`

## Local commands

Run these from the repository root:

```bash
pnpm --filter @expenses/backend dev
pnpm --filter @expenses/backend test
pnpm --filter @expenses/backend build
pnpm --filter @expenses/backend lint
```

## Runtime dependencies

The backend expects PostgreSQL and Redis. The root `docker-compose.yml` starts the development services, and `docker-compose.test.yml` defines isolated services for tests.

Environment variables are documented in `.env.sample`. Keep `.env` and `.env.test` local.
