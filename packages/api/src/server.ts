/**
 * Server-only exports from @expenses/api.
 *
 * These depend on @trpc/server and MUST NOT be imported from frontend code.
 * The backend imports these via `@expenses/api/server`.
 */
export { t, publicProcedure, middleware } from './trpc';
export type { Context } from './context';
export { createContext } from './context';
export { mapServiceError } from './errors';
