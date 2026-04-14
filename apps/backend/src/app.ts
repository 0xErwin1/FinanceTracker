import 'reflect-metadata';
import cors from 'cors';
import express, { type Request, type Response } from 'express';
import session from 'express-session';
import helmet from 'helmet';
import morgan from 'morgan';
import { createExpressMiddleware } from '@trpc/server/adapters/express';
import { config } from './config';
import { logger } from './lib';
import { sequelize } from './models';
import { redisKeyLifetime, redisStore } from './redis';
import { appRouter, createContext } from './trpc';

const env = config.env ?? '';

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
      await sequelize().authenticate();
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

    this.server.use(
      '/trpc',
      createExpressMiddleware({
        router: appRouter,
        createContext,
      }),
    );
  }
}
