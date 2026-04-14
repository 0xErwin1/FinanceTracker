import { middleware } from '@expenses/api';
import { TRPCError } from '@trpc/server';

/**
 * tRPC middleware that enforces authentication.
 * Throws UNAUTHORIZED if ctx.userId is null.
 * After this middleware, ctx.userId is guaranteed to be a string.
 */
export const isAuthenticated = middleware(async ({ ctx, next }) => {
  if (!ctx.userId) {
    throw new TRPCError({ code: 'UNAUTHORIZED' });
  }

  return next({
    ctx: { ...ctx, userId: ctx.userId },
  });
});
