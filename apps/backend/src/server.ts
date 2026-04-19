import dotenv from 'dotenv';

dotenv.config();

import { App } from './app';
import { config } from './config';
import { AppDataSource } from './data-source';
import { logger } from './lib';
import { reconcileRecurringJobs, startWorker, stopWorker } from './queues';

const port = config.port;
const app = new App();

const start = async () => {
  try {
    await AppDataSource.initialize();
    logger.info('DataSource initialized');

    await AppDataSource.runMigrations();
    logger.info('Migrations applied');

    if (config.env !== 'TEST') {
      startWorker();
      logger.info('BullMQ worker started');

      await reconcileRecurringJobs();
      logger.info('Recurring jobs reconciled');
    }

    app.server.listen(port, () => logger.info(`Server running on port ${port}`));
  } catch (err) {
    logger.error(err, 'Startup failed');
    logger.info('Retrying in 10 seconds...');
    setTimeout(start, 10000);
  }
};

const gracefulShutdown = async () => {
  logger.info('Shutting down...');

  await stopWorker();
  logger.info('BullMQ worker stopped');

  process.exit(0);
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

start();
