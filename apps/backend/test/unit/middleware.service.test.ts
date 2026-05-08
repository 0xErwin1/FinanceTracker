jest.mock('../../src/redis', () => ({
  redisClient: {
    get: jest.fn(),
  },
}));

jest.mock('../../src/lib', () => ({
  logger: {
    debug: jest.fn(),
  },
}));

import type { NextFunction, Request, Response } from 'express';
import { logger } from '../../src/lib';
import { redisClient } from '../../src/redis';
import { middlewareService } from '../../src/services/middleware.service';

const mockedLogger = jest.mocked(logger);
const mockedRedis = jest.mocked(redisClient);

function flattenDebugCalls(): string {
  return JSON.stringify(mockedLogger.debug.mock.calls);
}

function makeRequest(sessionID?: string): Request {
  return { sessionID } as Request;
}

function makeResponse(): Response {
  return { locals: {} } as Response;
}

describe('middlewareService.authorization logging', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('logs only presence booleans when the request has no session', async () => {
    const res = makeResponse();
    const next: NextFunction = jest.fn();

    await middlewareService.authorization(makeRequest(), res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(mockedRedis.get).not.toHaveBeenCalled();
    expect(mockedLogger.debug).toHaveBeenCalledWith(
      { hasSession: false, hasUser: false },
      'auth_middleware_authorization_resolved',
    );
  });

  it('resolves the user while keeping session and user identifiers out of logs', async () => {
    const res = makeResponse();
    const next: NextFunction = jest.fn();

    mockedRedis.get.mockResolvedValue('user-123');

    await middlewareService.authorization(makeRequest('session-123'), res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.locals.userId).toBe('user-123');
    expect(mockedRedis.get).toHaveBeenCalledWith('user:session-123');
    expect(mockedLogger.debug).toHaveBeenCalledWith(
      { hasSession: true, hasUser: true },
      'auth_middleware_authorization_resolved',
    );
    expect(flattenDebugCalls()).not.toContain('session-123');
    expect(flattenDebugCalls()).not.toContain('user-123');
  });

  it('keeps missing-session lookups non-sensitive when no user is found', async () => {
    const res = makeResponse();
    const next: NextFunction = jest.fn();

    mockedRedis.get.mockResolvedValue(null);

    await middlewareService.authorization(makeRequest('session-123'), res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.locals.userId).toBeUndefined();
    expect(mockedLogger.debug).toHaveBeenCalledWith(
      { hasSession: true, hasUser: false },
      'auth_middleware_authorization_resolved',
    );
    expect(flattenDebugCalls()).not.toContain('session-123');
  });
});
