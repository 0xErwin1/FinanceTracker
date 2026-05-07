# Code Style

This project favors strict TypeScript, small focused changes, and boring maintainable code. Follow the existing package conventions before introducing new patterns.

## Formatting and linting

Biome is the source of truth for formatting and linting.

| Rule | Current setting |
|------|-----------------|
| Indentation | 2 spaces |
| Line width | 110 characters |
| Quotes | Single quotes for JavaScript and TypeScript |
| Semicolons | Required |
| Trailing commas | Enabled |
| Generated output | `dist/` and `coverage/` are excluded from Biome checks |

Use these commands:

```bash
pnpm lint
pnpm format
```

## TypeScript conventions

- Keep `strict` mode compatibility.
- Prefer explicit domain types over broad objects.
- Avoid `any`. If a cast is unavoidable, keep it local and document the invariant through clearer code or a narrow helper.
- Handle `null` and `undefined` explicitly instead of relying on truthiness when values can be `0`, `false`, or an empty string.
- Preserve public exports from `packages/api` unless the change intentionally updates the shared contract.
- Keep frontend imports browser-safe. Do not import server-only tRPC helpers into frontend runtime code.

## Backend conventions

- Keep request/session concerns near Express and tRPC context code.
- Keep business rules in service modules, not directly in routers.
- Use TypeORM entities and migrations for persistence changes.
- Keep `synchronize: false`; do not depend on automatic schema synchronization.
- Validate external input at tRPC/router boundaries before passing it into services.
- Preserve error context and throw `Error` objects or typed tRPC errors, not strings.
- Do not log secrets, session secrets, passwords, database URLs, or raw credential payloads.

## Frontend conventions

- Keep page-level composition in `views` and reusable data access/state in `composables`.
- Keep pure formatting or calculation helpers in small TypeScript modules with focused tests.
- Use shared enums and DTOs from the client-safe `@expenses/api` export.
- Keep route guards explicit and avoid repeated user fetches when the auth state is already initialized.
- Prefer readable Vue templates over dense inline logic.

## Testing expectations

For non-trivial behavior changes, update or add tests in the affected workspace.

| Change type | Expected verification |
|-------------|----------------------|
| Backend service or router behavior | Jest tests under `apps/backend`. |
| Frontend calculations, forms, or composables | Vitest tests under `apps/frontend/src`. |
| Shared DTO or enum changes | TypeScript build and downstream package checks. |
| Database schema changes | TypeORM migration plus backend tests when behavior changes. |

Useful commands:

```bash
pnpm --filter @expenses/backend test
pnpm --filter @expenses/frontend test
pnpm build
pnpm lint
```

## Documentation conventions

- Keep repository documentation factual and current with the codebase.
- Prefer tables, short checklists, and direct examples over long prose.
- Update `README.md`, `ARCHITECTURE.md`, or this file when commands, boundaries, or conventions change.
- Do not add personal working-note markdown files to the repository.
