import { ApiError } from '../enums';
import { CustomError, logger } from '../lib';
import { redisClient, redisKeyLifetime } from '../redis';
import { comparePassword } from '../utils';
import { userService } from '.';

async function login(email: string, password: string, sessionId: string) {
  logger.info({ hasSession: Boolean(sessionId) }, 'auth_login_attempt');
  const user = await userService.getUser({ email });

  if (!user) {
    logger.warn({ reason: 'user_not_found' }, 'auth_login_failed');
    throw new CustomError(ApiError.User.USER_DOES_NOT_EXIST);
  }

  if (!(await comparePassword(user.password, password))) {
    logger.warn({ reason: 'bad_credentials' }, 'auth_login_failed');
    throw new CustomError(ApiError.Auth.BAD_AUTH);
  }

  await redisClient.set(`user:${sessionId}`, user.id, {
    EX: redisKeyLifetime,
  });

  await redisClient.del(sessionId);

  logger.info({ hasSession: Boolean(sessionId) }, 'auth_login_success');

  const { password: _, ...safeUser } = user;
  return safeUser;
}

async function logout(token: string): Promise<void> {
  await redisClient.del(`user:${token}`);
  logger.info({ hadSession: Boolean(token) }, 'auth_logout_completed');
}

export const authService = {
  login,
  logout,
};
