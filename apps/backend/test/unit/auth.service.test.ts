jest.mock('../../src/services', () => ({
  userService: {
    getUser: jest.fn(),
  },
}));

jest.mock('../../src/utils', () => ({
  comparePassword: jest.fn(),
}));

jest.mock('../../src/redis', () => ({
  redisClient: {
    set: jest.fn(),
    del: jest.fn(),
  },
  redisKeyLifetime: 2_592_000,
}));

jest.mock('../../src/lib/logger.lib', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

import { CurrencyEnum } from '@expenses/api';
import { User } from '../../src/entities';
import { ApiError } from '../../src/enums';
import { CustomError } from '../../src/lib/custom_error.lib';
import { logger } from '../../src/lib/logger.lib';
import { redisClient } from '../../src/redis';
import { userService } from '../../src/services';
import { authService } from '../../src/services/auth.service';
import { comparePassword } from '../../src/utils';

const mockedLogger = jest.mocked(logger);
const mockedRedis = jest.mocked(redisClient);
const mockedUserService = jest.mocked(userService);
const mockedComparePassword = jest.mocked(comparePassword);

function flattenLogCalls(): string {
  return JSON.stringify([
    ...mockedLogger.info.mock.calls,
    ...mockedLogger.warn.mock.calls,
    ...mockedLogger.error.mock.calls,
    ...mockedLogger.debug.mock.calls,
  ]);
}

function makeUser(): User {
  const user = new User();
  user.id = 'user-123';
  user.email = 'person@example.com';
  user.firstName = 'Casey';
  user.lastName = 'Doe';
  user.password = 'hashed-password';
  user.reportingCurrency = CurrencyEnum.USD;
  user.valuationFreshnessDays = 1;
  user.createdAt = new Date('2026-05-08T00:00:00.000Z');
  user.deletedAt = new Date('2026-05-08T00:00:00.000Z');
  user.sessions = [];
  user.transactions = [];
  user.categories = [];
  user.financialGoals = [];
  user.budgets = [];
  user.recurringTransactions = [];
  user.accounts = [];
  user.fxRates = [];

  return user;
}

describe('authService logging', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('logs only safe metadata when login succeeds', async () => {
    mockedUserService.getUser.mockResolvedValue(makeUser());
    mockedComparePassword.mockResolvedValue(true);
    mockedRedis.set.mockResolvedValue('OK');
    mockedRedis.del.mockResolvedValue(1);

    await authService.login('person@example.com', 'plain-password', 'session-123');

    expect(mockedLogger.info).toHaveBeenCalledWith({ hasSession: true }, 'auth_login_attempt');
    expect(mockedLogger.info).toHaveBeenCalledWith({ hasSession: true }, 'auth_login_success');
    expect(flattenLogCalls()).not.toContain('person@example.com');
    expect(flattenLogCalls()).not.toContain('user-123');
    expect(flattenLogCalls()).not.toContain('session-123');
  });

  it('logs only safe metadata when login fails because the user does not exist', async () => {
    mockedUserService.getUser.mockResolvedValue(null);

    await expect(authService.login('person@example.com', 'plain-password', 'session-123')).rejects.toEqual(
      new CustomError(ApiError.User.USER_DOES_NOT_EXIST),
    );

    expect(mockedLogger.warn).toHaveBeenCalledWith({ reason: 'user_not_found' }, 'auth_login_failed');
    expect(flattenLogCalls()).not.toContain('person@example.com');
    expect(flattenLogCalls()).not.toContain('session-123');
  });

  it('logs only safe metadata when login fails because the password is invalid', async () => {
    mockedUserService.getUser.mockResolvedValue(makeUser());
    mockedComparePassword.mockResolvedValue(false);

    await expect(authService.login('person@example.com', 'plain-password', 'session-123')).rejects.toEqual(
      new CustomError(ApiError.Auth.BAD_AUTH),
    );

    expect(mockedLogger.warn).toHaveBeenCalledWith({ reason: 'bad_credentials' }, 'auth_login_failed');
    expect(flattenLogCalls()).not.toContain('person@example.com');
    expect(flattenLogCalls()).not.toContain('user-123');
    expect(flattenLogCalls()).not.toContain('session-123');
  });

  it('logs only safe metadata when logout completes', async () => {
    mockedRedis.del.mockResolvedValue(1);

    await authService.logout('session-123');

    expect(mockedLogger.info).toHaveBeenCalledWith({ hadSession: true }, 'auth_logout_completed');
    expect(flattenLogCalls()).not.toContain('session-123');
  });
});
