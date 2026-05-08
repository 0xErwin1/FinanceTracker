import { type AppConfig, parseConfig } from '../../src/config/config';

function makeEnv(overrides: Partial<NodeJS.ProcessEnv> = {}): NodeJS.ProcessEnv {
  return {
    ENV: 'LOCAL',
    DATABASE_URL: 'postgres://postgres:postgres@localhost:5432/expenses',
    PORT: '3000',
    REDIS_URL: 'redis://localhost:6379',
    REDIS_TLS: 'false',
    SESSION_SECRET: 'session-secret',
    CORS_ORIGINS: '["http://localhost:5173"]',
    ...overrides,
  };
}

describe('parseConfig', () => {
  it('fails fast when SESSION_SECRET is missing after trimming', () => {
    expect(() => parseConfig(makeEnv({ SESSION_SECRET: '   ' }))).toThrow('SESSION_SECRET');
  });

  it('fails fast when PORT is not a positive integer', () => {
    expect(() => parseConfig(makeEnv({ PORT: 'abc' }))).toThrow('PORT');
  });

  it('fails fast when REDIS_TLS is not a supported boolean string', () => {
    expect(() => parseConfig(makeEnv({ REDIS_TLS: 'sometimes' }))).toThrow('REDIS_TLS');
  });

  it('fails fast when CORS_ORIGINS is malformed JSON', () => {
    expect(() => parseConfig(makeEnv({ CORS_ORIGINS: 'not-json' }))).toThrow('CORS_ORIGINS');
  });

  it('fails fast when CORS_ORIGINS contains invalid members', () => {
    expect(() => parseConfig(makeEnv({ CORS_ORIGINS: '["http://localhost:5173", "  ", 10]' }))).toThrow(
      'CORS_ORIGINS',
    );
  });

  it('fails fast when CORS_ORIGINS parses to a non-array JSON value', () => {
    expect(() => parseConfig(makeEnv({ CORS_ORIGINS: '"http://localhost:5173"' }))).toThrow('CORS_ORIGINS');
  });

  it('fails fast when CORS_ORIGINS is an empty array outside TEST', () => {
    expect(() => parseConfig(makeEnv({ CORS_ORIGINS: '[]' }))).toThrow('CORS_ORIGINS');
  });

  it('parses a valid startup configuration exactly once validation passes', () => {
    const result = parseConfig(
      makeEnv({
        ENV: 'production',
        PORT: '4310',
        REDIS_TLS: 'true',
        CORS_ORIGINS: '["https://app.example.com","https://admin.example.com"]',
      }),
    );

    expect(result).toEqual<AppConfig>({
      env: 'PRODUCTION',
      databaseUrl: 'postgres://postgres:postgres@localhost:5432/expenses',
      port: 4310,
      redisUrl: 'redis://localhost:6379',
      redisTls: true,
      sessionSecret: 'session-secret',
      corsOrigins: ['https://app.example.com', 'https://admin.example.com'],
    });
  });

  it('allows an empty CORS array only in TEST', () => {
    const result = parseConfig(makeEnv({ ENV: 'TEST', CORS_ORIGINS: '[]' }));

    expect(result.corsOrigins).toEqual([]);
  });
});
