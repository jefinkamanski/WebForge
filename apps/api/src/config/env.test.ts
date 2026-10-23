import { describe, expect, it } from 'vitest';
import { parseEnv } from './env.js';

const validEnv = {
  DB_HOST: 'localhost',
  DB_NAME: 'site_platform',
  DB_USER: 'site_user',
  DB_PASSWORD: 'secret',
  CORS_ORIGINS: 'http://localhost:3000, http://localhost:5173',
  JWT_SECRET: 'x'.repeat(32),
  ADMIN_EMAIL: ' Admin@Exemplo.com ',
  ADMIN_PASSWORD: 'senha-inicial',
};

describe('parseEnv', () => {
  it('applies defaults and parses CORS origins', () => {
    const env = parseEnv(validEnv);

    expect(env.PORT).toBe(3001);
    expect(env.DB_PORT).toBe(3306);
    expect(env.DB_POOL_LIMIT).toBe(5);
    expect(env.TRUST_PROXY).toBe(0);
    expect(env.COOKIE_DOMAIN).toBe('localhost');
    expect(env.ADMIN_EMAIL).toBe('admin@exemplo.com');
    expect(env.CORS_ORIGINS).toEqual(['http://localhost:3000', 'http://localhost:5173']);
  });

  it('fails when a required variable is missing', () => {
    expect(() => parseEnv({ ...validEnv, DB_HOST: undefined })).toThrow(/DB_HOST/);
  });

  it('rejects a pool limit above 10', () => {
    expect(() => parseEnv({ ...validEnv, DB_POOL_LIMIT: '11' })).toThrow(/DB_POOL_LIMIT/);
  });

  it('rejects a short JWT secret', () => {
    expect(() => parseEnv({ ...validEnv, JWT_SECRET: 'curto' })).toThrow(/JWT_SECRET/);
  });
});
