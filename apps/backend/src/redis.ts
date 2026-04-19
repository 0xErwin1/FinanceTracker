import RedisStore from 'connect-redis';
import { createClient, type RedisClientType } from 'redis';
import { config } from './config';
import { logger } from './lib';

const isTest = config.env === 'TEST';

const realClient: RedisClientType = createClient({
  url: config.redisUrl,
  name: 'expenses',
  socket: {
    tls: config.redisTls,
  },
});

if (!isTest && !realClient.isOpen) {
  realClient.connect();
}

realClient.on('ready', () => {
  logger.info('redis_ready');
});

realClient.on('reconnecting', () => {
  logger.warn('reconnecting_redis');
});

realClient.on('error', (error) => {
  logger.error({ err: error }, 'redis_error');
});

export const redisKeyLifetime: number = 30 * 24 * 60 * 60;

export const redisStore = new RedisStore({
  client: realClient,
  prefix: 'session:',
});

const noOpClient = {
  set: () => Promise.resolve('OK'),
  get: () => Promise.resolve(null),
  del: () => Promise.resolve(1),
  connect: () => Promise.resolve(),
  on: () => {},
  isOpen: true,
  scanIterator: () => ({
    async *[Symbol.asyncIterator]() {},
  }),
} as unknown as RedisClientType;

export const redisClient: RedisClientType = isTest ? noOpClient : realClient;
