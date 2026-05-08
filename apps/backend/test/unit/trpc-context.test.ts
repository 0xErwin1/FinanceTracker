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

import type { Request, Response } from 'express';
import { logger } from '../../src/lib';
import { redisClient } from '../../src/redis';
import { createContext } from '../../src/trpc/context';

const mockedLogger = jest.mocked(logger);
const mockedRedis = jest.mocked(redisClient);

function makeRequest(sessionID?: string): Request {
  return { sessionID } as Request;
}

function makeResponse(): Response {
  return {} as Response;
}

describe('createContext logging', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns the resolved userId while logging only presence booleans', async () => {
    mockedRedis.get.mockResolvedValue('user-123');

    const context = await createContext({ req: makeRequest('session-123'), res: makeResponse() });

    expect(context.userId).toBe('user-123');
    expect(mockedLogger.debug).toHaveBeenCalledWith(
      { hasSession: true, hasUser: true },
      'trpc_context_created',
    );
    expect(JSON.stringify(mockedLogger.debug.mock.calls)).not.toContain('session-123');
    expect(JSON.stringify(mockedLogger.debug.mock.calls)).not.toContain('user-123');
  });

  it('logs missing session/user presence without exposing raw identifiers', async () => {
    mockedRedis.get.mockResolvedValue(null);

    const context = await createContext({ req: makeRequest(), res: makeResponse() });

    expect(context.userId).toBeNull();
    expect(mockedLogger.debug).toHaveBeenCalledWith(
      { hasSession: false, hasUser: false },
      'trpc_context_created',
    );
  });
});
