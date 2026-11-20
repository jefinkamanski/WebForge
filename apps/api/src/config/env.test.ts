import { describe, expect, it } from 'vitest';
import path from 'node:path';
import { parseEnv } from './env.js';

const validEnv = {
  DB_HOST: 'localhost',
  DB_NAME: 'webforge',
  DB_USER: 'webforge',
  DB_PASSWORD: 'secret',
  JWT_SECRET: 'x'.repeat(32),
  CORS_ORIGINS: 'http://localhost:3000, http://localhost:5173',
};

describe('parseEnv', () => {
  it('applies defaults and parses CORS origins', () => {
    const env = parseEnv(validEnv);

    expect(env).toMatchObject({
      PORT: 3001,
      TRUST_PROXY: 0,
      DB_PORT: 3306,
      DB_POOL_LIMIT: 5,
      COOKIE_DOMAIN: 'localhost',
    });
    expect(env.CORS_ORIGINS).toEqual(['http://localhost:3000', 'http://localhost:5173']);
  });

  it('treats the initial admin as optional and normalizes the e-mail', () => {
    expect(parseEnv(validEnv).ADMIN_EMAIL).toBeUndefined();
    expect(parseEnv({ ...validEnv, ADMIN_EMAIL: ' Admin@Exemplo.com ' }).ADMIN_EMAIL).toBe(
      'admin@exemplo.com',
    );
  });

  it('resolves a relative UPLOAD_DIR from the project root', () => {
    const rootUploads = path.resolve(import.meta.dirname, '../../../../uploads');

    expect(parseEnv(validEnv).UPLOAD_DIR).toBe(rootUploads);
    expect(parseEnv({ ...validEnv, UPLOAD_DIR: path.resolve('/srv/uploads') }).UPLOAD_DIR).toBe(
      path.resolve('/srv/uploads'),
    );
  });

  it('keeps e-mail off by default and requires a sender when SMTP is configured', () => {
    const blank = parseEnv({ ...validEnv, SMTP_HOST: '', SMTP_USER: '', SMTP_PASSWORD: '' });

    expect(blank).toMatchObject({ SMTP_PORT: 587, SMTP_SECURE: false });
    expect(blank.SMTP_HOST).toBeUndefined();
    expect(() => parseEnv({ ...validEnv, SMTP_HOST: 'smtp.gmail.com' })).toThrow(/MAIL_FROM/);
    expect(() =>
      parseEnv({
        ...validEnv,
        SMTP_HOST: 'smtp.gmail.com',
        MAIL_FROM: 'a@b.com',
        SMTP_USER: 'a@b.com',
      }),
    ).toThrow(/SMTP_PASSWORD/);
    for (const [port, secure] of [
      ['587', 'true'],
      ['465', 'false'],
    ]) {
      expect(() =>
        parseEnv({
          ...validEnv,
          SMTP_HOST: 'smtp.gmail.com',
          SMTP_PORT: port,
          SMTP_SECURE: secure,
          MAIL_FROM: 'a@b.com',
        }),
      ).toThrow(/SMTP_SECURE/);
    }
    expect(
      parseEnv({
        ...validEnv,
        SMTP_HOST: 'smtp.gmail.com',
        SMTP_PORT: '465',
        SMTP_SECURE: 'true',
        MAIL_FROM: 'a@b.com',
      }).SMTP_SECURE,
    ).toBe(true);
  });

  it('fails when a required variable is missing', () => {
    expect(() => parseEnv({ ...validEnv, DB_HOST: undefined })).toThrow(/DB_HOST/);
  });

  it('rejects a short JWT secret, like the .env.example placeholder', () => {
    expect(() => parseEnv({ ...validEnv, JWT_SECRET: 'gere-com-pnpm-secrets' })).toThrow(
      /JWT_SECRET/,
    );
  });

  it('rejects a pool limit above 10 and an invalid origin', () => {
    expect(() => parseEnv({ ...validEnv, DB_POOL_LIMIT: '11' })).toThrow(/DB_POOL_LIMIT/);
    expect(() => parseEnv({ ...validEnv, CORS_ORIGINS: 'nao-e-url' })).toThrow(/CORS_ORIGINS/);
  });
});
