import IORedis from 'ioredis';
import { config } from '../config';
import { logger } from '../lib';

const isTest = config.env === 'TEST';

const connectionOpts = {
  maxRetriesPerRequest: null as null,
  enableReadyCheck: false,
};

let redisConnection: IORedis | undefined;

export function getBullMQConnection(): IORedis {
  if (!redisConnection) {
    redisConnection = new IORedis(config.redisUrl, connectionOpts);

    redisConnection.on('error', (err) => {
      logger.error({ err }, 'bullmq_redis_error');
    });

    redisConnection.on('connect', () => {
      logger.info('bullmq_redis_connected');
    });
  }

  return redisConnection;
}

export async function closeBullMQConnection(): Promise<void> {
  if (redisConnection) {
    await redisConnection.quit();
    redisConnection = undefined;
  }
}

export { isTest };
