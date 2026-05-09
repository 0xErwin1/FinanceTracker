import 'reflect-metadata';
import { createExpressMiddleware } from '@trpc/server/adapters/express';
import cors from 'cors';
import express, { type Request, type Response } from 'express';
import session from 'express-session';
import helmet from 'helmet';
import morgan from 'morgan';
import { config } from './config';
import { transactionController } from './controllers';
import { logger } from './lib';
import { redisKeyLifetime, redisStore } from './redis';
import { middlewareService } from './services';
import {
  MAX_STAGE_IMPORT_BYTES,
  TransactionImportStagingError,
} from './services/transaction-import-staging.service';
import { appRouter, createContext } from './trpc';

const env = config.env;

export class App {
  public server: express.Application;

  constructor() {
    this.server = express();

    this.configureLogging();
    this.configureMiddleware();
    this.configureRoutes();
  }

  public async connectToDatabase() {
    try {
      const { AppDataSource } = await import('./data-source');
      await AppDataSource.initialize();
    } catch (error) {
      logger.error(error, 'database_connection_failed');
      throw error;
    }
  }

  private configureLogging() {
    this.server.use(
      morgan('dev', {
        skip: (req: Request, _res: Response) => req.baseUrl === '/api/health',
      }),
    );
  }

  private configureMiddleware() {
    this.server.use(helmet());
    this.server.use(
      cors({
        origin: config.corsOrigins,
        credentials: true,
      }),
    );

    this.server.use(
      session({
        store: redisStore,
        resave: false,
        saveUninitialized: true,
        secret: config.sessionSecret,
        name: 'sessionID',
        cookie: {
          httpOnly: !['LOCAL', 'TEST'].includes(env),
          maxAge: redisKeyLifetime,
        },
      }),
    );
  }

  private configureRoutes() {
    this.server.get('/api/health', (_req: Request, res: Response) => {
      res.send({ result: true, data: 'Up & running ;)!}' });
    });

    this.server.post(
      '/api/transactions/import/stage',
      express.raw({ limit: MAX_STAGE_IMPORT_BYTES, type: () => true }),
      middlewareService.authorization,
      async (req: Request, res: Response) => {
        const userId = typeof res.locals.userId === 'string' ? res.locals.userId : null;

        if (!userId) {
          res.status(401).json({ message: 'Authentication required.' });
          return;
        }

        try {
          const response = await transactionController.stageImport(
            {
              contentType: req.headers['content-type'],
              payload: Buffer.isBuffer(req.body) ? req.body : Buffer.alloc(0),
              sourceFilename: getHeaderValue(req.headers['x-import-filename']),
              userId,
            },
            userId,
          );

          res.status(200).json(response);
        } catch (error) {
          if (error instanceof TransactionImportStagingError) {
            res.status(error.statusCode).json({ message: error.message });
            return;
          }

          logger.error({ err: error }, 'transaction_import_stage_failed');
          res.status(500).json({ message: 'Unable to stage import upload.' });
        }
      },
    );

    this.server.use(
      '/trpc',
      createExpressMiddleware({
        router: appRouter,
        createContext,
      }),
    );
  }
}

function getHeaderValue(header: string | string[] | undefined): string | undefined {
  if (Array.isArray(header)) {
    return header[0];
  }

  return header;
}
