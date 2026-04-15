import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { config } from '../src/config';

const isDev = ['LOCAL', 'TEST'].includes(config.env ?? '');

const TestDataSource = new DataSource({
  type: 'postgres',
  url: config.databaseUrl,
  synchronize: false,
  logging: ['error'],
  entities: [`${__dirname}/../src/entities/**/*${isDev ? '.ts' : '.js'}`],
  migrations: [`${__dirname}/../src/migrations/**/*${isDev ? '.ts' : '.js'}`],
});

module.exports = async () => {
  await TestDataSource.initialize();
  await TestDataSource.query('DROP SCHEMA public CASCADE');
  await TestDataSource.query('CREATE SCHEMA public');
  await TestDataSource.runMigrations({ transaction: 'all' });
  await TestDataSource.destroy();
};
