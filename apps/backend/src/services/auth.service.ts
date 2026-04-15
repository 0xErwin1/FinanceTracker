import { userService } from '.';
import { ApiError } from '../enums';
import { CustomError, logger } from '../lib';
import { redisClient, redisKeyLifetime } from '../redis';
import { comparePassword } from '../utils';

async function login(email: string, password: string, sessionId: string) {
  logger.info(`Login email: ${email}`);
  const user = await userService.getUser({ email });

  if (!user) {
    logger.error('User does not exist');
    throw new CustomError(ApiError.User.USER_DOES_NOT_EXIST);
  }

  if (!(await comparePassword(user.password, password))) {
    throw new CustomError(ApiError.Auth.BAD_AUTH);
  }

  await redisClient.set(`user:${sessionId}`, user.id, {
    EX: redisKeyLifetime,
  });

  await redisClient.del(sessionId);

  const { password: _, ...safeUser } = user;
  return safeUser;
}

async function logout(token: string): Promise<void> {
  await redisClient.del(`user:${token}`);
}

export const authService = {
  login,
  logout,
};
