export const config = {
  env: process.env.ENV?.toUpperCase(),
  databaseUrl: process.env.DATABASE_URL ?? '',
  port: Number.parseInt(process.env.PORT ?? '3000', 10) || 3000,
  redisUrl: process.env.REDIS_URL ?? '',
  sessionSecret: process.env.SESSION_SECRET ?? '',
  corsOrigins: JSON.parse(process.env.CORS_ORIGINS ?? '[]'),
};
