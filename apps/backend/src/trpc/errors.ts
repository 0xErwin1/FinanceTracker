import { TRPCError } from '@trpc/server';
import { StatusCodes } from 'http-status-codes';
import { logger } from '../lib';
import { CustomError } from '../lib/custom_error.lib';
import { customErrors } from '../lib/custom_errors.lib';

/**
 * Maps service-level errors (CustomError, native Error, unknown) to TRPCError.
 * This is the central error translation layer between services and tRPC.
 */
export function mapServiceError(error: unknown): never {
  if (error instanceof TRPCError) throw error;

  if (error instanceof CustomError) {
    const errorInfo = customErrors[error.errorCode];
    const httpStatus = errorInfo?.HTTPStatusCode;

    logger.error({ err: error, errorCode: error.errorCode }, 'Service error');

    let code: TRPCError['code'];

    switch (httpStatus) {
      case StatusCodes.BAD_REQUEST:
        code = 'BAD_REQUEST';
        break;
      case StatusCodes.UNAUTHORIZED:
        code = 'UNAUTHORIZED';
        break;
      case StatusCodes.NOT_FOUND:
        code = 'NOT_FOUND';
        break;
      case StatusCodes.CONFLICT:
        code = 'CONFLICT';
        break;
      case StatusCodes.UNPROCESSABLE_ENTITY:
        code = 'UNPROCESSABLE_CONTENT';
        break;
      case StatusCodes.FORBIDDEN:
        code = 'FORBIDDEN';
        break;
      default:
        code = 'INTERNAL_SERVER_ERROR';
    }

    throw new TRPCError({
      code,
      message: errorInfo?.message ?? error.message,
      cause: error,
    });
  }

  if (error instanceof Error) {
    logger.error({ err: error }, 'Unexpected error');
    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: error.message,
      cause: error,
    });
  }

  logger.error({ err: error }, 'Unknown error');
  throw new TRPCError({
    code: 'INTERNAL_SERVER_ERROR',
    message: 'An unexpected error occurred',
  });
}
