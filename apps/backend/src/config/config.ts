export type AppEnv = 'LOCAL' | 'TEST' | 'PRODUCTION';

export interface AppConfig {
  env: AppEnv;
  databaseUrl: string;
  port: number;
  redisUrl: string;
  redisTls: boolean;
  sessionSecret: string;
  corsOrigins: string[];
}

const VALID_ENVS: AppEnv[] = ['LOCAL', 'TEST', 'PRODUCTION'];

function parseRequiredString(env: NodeJS.ProcessEnv, key: string): string {
  const value = env[key]?.trim();

  if (!value) {
    throw new Error(`${key} is required and must be a non-empty string`);
  }

  return value;
}

function parseEnv(value: string): AppEnv {
  const normalized = value.toUpperCase();

  if (!VALID_ENVS.includes(normalized as AppEnv)) {
    throw new Error(`ENV must be one of: ${VALID_ENVS.join(', ')}`);
  }

  return normalized as AppEnv;
}

function parsePort(value: string): number {
  if (!/^\d+$/.test(value)) {
    throw new Error('PORT must be a positive integer');
  }

  const port = Number.parseInt(value, 10);

  if (port <= 0) {
    throw new Error('PORT must be a positive integer');
  }

  return port;
}

function parseBoolean(value: string, key: string): boolean {
  if (value === 'true') {
    return true;
  }

  if (value === 'false') {
    return false;
  }

  throw new Error(`${key} must be either "true" or "false"`);
}

function parseCorsOrigins(value: string, env: AppEnv): string[] {
  let parsed: unknown;

  try {
    parsed = JSON.parse(value);
  } catch {
    throw new Error('CORS_ORIGINS must be a JSON array of non-empty origin strings');
  }

  if (!Array.isArray(parsed)) {
    throw new Error('CORS_ORIGINS must be a JSON array of non-empty origin strings');
  }

  if (parsed.some((origin) => typeof origin !== 'string' || origin.trim().length === 0)) {
    throw new Error('CORS_ORIGINS must be a JSON array of non-empty origin strings');
  }

  if (parsed.length === 0 && env !== 'TEST') {
    throw new Error('CORS_ORIGINS must include at least one origin outside TEST');
  }

  return parsed;
}

export function parseConfig(env: NodeJS.ProcessEnv): AppConfig {
  const appEnv = parseEnv(parseRequiredString(env, 'ENV'));
  const databaseUrl = parseRequiredString(env, 'DATABASE_URL');
  const port = parsePort(parseRequiredString(env, 'PORT'));
  const redisUrl = parseRequiredString(env, 'REDIS_URL');
  const redisTls = parseBoolean(parseRequiredString(env, 'REDIS_TLS'), 'REDIS_TLS');
  const sessionSecret = parseRequiredString(env, 'SESSION_SECRET');
  const corsOrigins = parseCorsOrigins(parseRequiredString(env, 'CORS_ORIGINS'), appEnv);

  return {
    env: appEnv,
    databaseUrl,
    port,
    redisUrl,
    redisTls,
    sessionSecret,
    corsOrigins,
  };
}

export const config = parseConfig(process.env);
