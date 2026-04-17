import type { AppRouter } from '@expenses/backend';
import { createTRPCClient, httpBatchLink } from '@trpc/client';

let onUnauthorized: (() => void) | null = null;

/**
 * Registers a callback invoked when the tRPC transport detects a genuine
 * session failure (expired/missing session). Called from App.vue after
 * provideAuth() to avoid circular imports.
 */
export function setOnUnauthorized(cb: () => void): void {
  onUnauthorized = cb;
}

/**
 * Checks whether a 401 response is a genuine authentication failure
 * (expired session, missing session) rather than a business error that
 * was incorrectly mapped to 401.
 *
 * Genuine auth failures come from:
 * - The isAuthenticated middleware (no cause, generic message)
 * - Auth.EXPIRED_TOKEN, Auth.NEED_BE_LOGGED_IN, Auth.UNAUTHORIZED
 *
 * The check parses the tRPC batch response body. It only triggers logout
 * if ALL error entries in the batch are auth-related UNAUTHORIZED errors.
 */
async function isGenuineAuthFailure(response: Response): Promise<boolean> {
  try {
    const cloned = response.clone();
    const body = await cloned.json();

    // tRPC batch responses are arrays; single requests may be objects
    const entries = Array.isArray(body) ? body : [body];

    for (const entry of entries) {
      const error = entry?.error;

      // If any entry succeeded or has a non-UNAUTHORIZED code, this is
      // not a pure auth failure batch.
      if (!error) return false;

      const tRPCCode = error.data?.code;
      if (tRPCCode !== 'UNAUTHORIZED') return false;

      // Distinguish the isAuthenticated middleware (no cause with
      // errorCode) from CustomError-based auth errors. The middleware
      // throws a plain TRPCError without a CustomError cause, so its
      // message is just "UNAUTHORIZED".
      //
      // For CustomError-based UNAUTHORIZED (EXPIRED_TOKEN,
      // NEED_BE_LOGGED_IN, etc.), the cause is a CustomError with an
      // errorCode field. These are also genuine auth failures.
      //
      // The only case we want to SKIP logout is when the cause has an
      // errorCode that belongs to a non-auth domain (e.g. Category,
      // Transaction, Budget). After the backend fix this shouldn't
      // happen, but this guard prevents regressions.
      const cause = error.data?.cause;
      if (cause && typeof cause.errorCode === 'number') {
        // Auth-domain errorCodes: 1xxx (Auth enum)
        // User-domain auth: 3002 (WRONG_PASSWORD), 3003 (PASSWORD_TOO_SHORT)
        // Only 1xxx codes are genuine session failures.
        const code = cause.errorCode as number;
        if (code < 1000 || code >= 2000) {
          return false;
        }
      }
    }

    return entries.length > 0;
  } catch {
    // If we can't parse the body, assume it IS a genuine auth failure.
    // This is the safer default: a real session expiry should still
    // trigger logout even if parsing fails.
    return true;
  }
}

export const trpc = createTRPCClient<AppRouter>({
  links: [
    httpBatchLink({
      url: '/trpc',
      fetch(url, options) {
        return fetch(url, {
          ...options,
          credentials: 'include',
        }).then(async (response) => {
          if (response.status === 401) {
            const genuine = await isGenuineAuthFailure(response);
            if (genuine) {
              onUnauthorized?.();
            }
          }
          return response;
        });
      },
    }),
  ],
});
