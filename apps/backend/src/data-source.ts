import 'reflect-metadata';
import type { LoggerOptions } from 'typeorm';
import { DataSource } from 'typeorm';
import { SnakeNamingStrategy } from 'typeorm-naming-strategies';
import { config } from './config';

const isDev = ['LOCAL', 'TEST'].includes(config.env);

export function getDataSourceLogging(env: string): LoggerOptions {
  return env === 'LOCAL' ? 'all' : ['error'];
}

export const AppDataSource = new DataSource({
  type: 'postgres',
  url: config.databaseUrl,
  synchronize: false,
  namingStrategy: new SnakeNamingStrategy(),
  logging: getDataSourceLogging(config.env),
  entities: [`${__dirname}/entities/**/*${isDev ? '.ts' : '.js'}`],
  migrations: [`${__dirname}/migrations/**/*${isDev ? '.ts' : '.js'}`],
  extra: {
    poolSize: 20,
  },
});
