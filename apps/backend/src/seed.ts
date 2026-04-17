import dotenv from 'dotenv';
dotenv.config();

import 'reflect-metadata';
import { AppDataSource } from './data-source';
import { User } from './entities';
import { categoryService } from './services/category.service';
import { logger } from './lib';

async function seed() {
  await AppDataSource.initialize();
  logger.info('DataSource initialized');

  const userRepo = AppDataSource.getRepository(User);
  const users = await userRepo.find({ withDeleted: false });

  if (users.length === 0) {
    logger.info('No users found. Nothing to seed.');
    return;
  }

  for (const user of users) {
    logger.info({ userId: user.id, email: user.email }, 'Seeding default categories...');
    await categoryService.seedDefaultCategories(user.id);
  }

  logger.info(`Seeded default categories for ${users.length} user(s).`);
  await AppDataSource.destroy();
}

seed().catch((err) => {
  logger.error(err, 'Seed failed');
  process.exit(1);
});
