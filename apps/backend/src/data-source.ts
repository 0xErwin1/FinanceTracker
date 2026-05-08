import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { SnakeNamingStrategy } from 'typeorm-naming-strategies';
import { config } from './config';

const isDev = ['LOCAL', 'TEST'].includes(config.env);

export const AppDataSource = new DataSource({
  type: 'postgres',
  url: config.databaseUrl,
  synchronize: false,
  namingStrategy: new SnakeNamingStrategy(),
  logging: isDev ? 'all' : ['error'],
  entities: [`${__dirname}/entities/**/*${isDev ? '.ts' : '.js'}`],
  migrations: [`${__dirname}/migrations/**/*${isDev ? '.ts' : '.js'}`],
  extra: {
    poolSize: 20,
  },
});
