import 'reflect-metadata';
import * as bodyParser from 'body-parser';
import cors from 'cors';
import express, { type NextFunction, type Request, type Response } from 'express';
import session from 'express-session';
import helmet from 'helmet';
import morgan from 'morgan';
import { config } from './config';
import { ApiError } from './enums';
import { CustomError, CustomResponse, customErrors, logger } from './lib';
import { sequelize } from './models';
import { redisKeyLifetime, redisStore } from './redis';
import { routerIndex } from './routes';

const env = config.env ?? '';

const exceptionMiddleware = (err: Error, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof CustomError) {
    logger.error({ err }, 'Exception Middleware');
    const httpStatus = customErrors[err.errorCode] && customErrors[err.errorCode].HTTPStatusCode;
    return res.status(httpStatus || 500).send(new CustomResponse(false, err.data, err.errorCode));
  }

  logger.error({ err });
  res.status(500);

  if (['TEST', 'QA', 'DEV'].includes(env)) {
    return res.send(new CustomResponse(false, err as unknown as Record<string, unknown>));
  }

  return res.send(new CustomResponse(false));
};

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
    this.server.use(bodyParser.json());
    this.server.use(bodyParser.urlencoded({ extended: true }));
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
    this.server.use('/api', routerIndex);
    this.server.use((_req: Request, res: Response) => {
      const customError = customErrors[ApiError.Server.NOT_FOUND];
      res.status(404);
      res.send(new CustomResponse(false, customError));
    });
    this.server.use(exceptionMiddleware);
  }
}
