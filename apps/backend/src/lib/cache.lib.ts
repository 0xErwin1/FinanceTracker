import { createHash } from 'crypto';
import { redisClient } from '../redis';
import { logger } from './logger.lib';

const CACHE_PREFIX = 'tx:';
const TX_CACHE_TTL = 1800;

function buildKey(userId: string, operation: string, params?: Record<string, unknown>): string {
  const hash = params
    ? createHash('md5').update(JSON.stringify(params)).digest('hex').slice(0, 12)
    : 'all';

  return `${CACHE_PREFIX}${userId}:${operation}:${hash}`;
}

export async function cacheGet<T>(
  userId: string,
  operation: string,
  params?: Record<string, unknown>,
): Promise<T | null> {
  try {
    const key = buildKey(userId, operation, params);
    const raw = await redisClient.get(key);

    if (!raw) return null;

    return JSON.parse(raw) as T;
  } catch (error) {
    logger.debug({ err: error }, 'cache_get_miss');

    return null;
  }
}

export async function cacheSet<T>(
  userId: string,
  operation: string,
  value: T,
  params?: Record<string, unknown>,
): Promise<void> {
  try {
    const key = buildKey(userId, operation, params);
    await redisClient.set(key, JSON.stringify(value), { EX: TX_CACHE_TTL });
  } catch (error) {
    logger.debug({ err: error }, 'cache_set_failed');
  }
}

export async function cacheInvalidateUser(userId: string): Promise<void> {
  try {
    const pattern = `${CACHE_PREFIX}${userId}:*`;
    const matchingKeys: string[] = [];

    for await (const key of redisClient.scanIterator({ MATCH: pattern, COUNT: 100 })) {
      matchingKeys.push(key);
    }

    if (matchingKeys.length > 0) {
      await redisClient.del(matchingKeys);
      logger.debug({ userId, count: matchingKeys.length }, 'cache_invalidated');
    }
  } catch (error) {
    logger.debug({ err: error }, 'cache_invalidate_failed');
  }
}
