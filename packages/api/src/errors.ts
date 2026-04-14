import { TRPCError } from '@trpc/server';

export function mapServiceError(error: unknown): never {
  if (error instanceof TRPCError) throw error;

  if (error instanceof Error) {
    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: error.message,
      cause: error,
    });
  }

  throw new TRPCError({
    code: 'INTERNAL_SERVER_ERROR',
    message: 'An unexpected error occurred',
  });
}
