import RedisStore from 'connect-redis';
import { type RedisClientType, createClient } from 'redis';
import { config } from './config';
import { logger } from './lib';

const client: RedisClientType = createClient({
  url: config.redisUrl,
  name: 'expenses',
  socket: {
    tls: true,
  },
});

if (!client.isOpen) {
  client.connect();
}

client.on('ready', () => {
  logger.info('redis_ready');
});

client.on('reconnecting', () => {
  logger.warn('reconnecting_redis');
});

client.on('error', (error) => {
  logger.error({ err: error }, 'redis_error');
});

export const redisKeyLifetime: number = 30 * 24 * 60 * 60 * 1000; // 30 days

export const redisStore = new RedisStore({
  client: client,
  prefix: 'session:',
});

export const redisClient: RedisClientType = client;
