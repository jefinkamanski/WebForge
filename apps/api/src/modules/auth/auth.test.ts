import cookieParser from 'cookie-parser';
import express from 'express';
import jwt from 'jsonwebtoken';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../../app.js';
import { createDb } from '../../db/client.js';
import { createErrorHandler } from '../../http/error-handler.js';
import {
  TEST_ADMIN_EMAIL,
  TEST_ADMIN_PASSWORD,
  TEST_BCRYPT_COST,
  cookieFrom,
  listen,
  loadTestEnv,
  readBody,
  resetAndBootstrap,
  type ApiBody,
  type TestServer,
} from '../../test/helpers.js';
import { createRequireAuth } from './auth.middleware.js';
import { createAuthService } from './auth.service.js';

const env = loadTestEnv();
const NEW_PASSWORD = 'uma-senha-nova-forte';

describe('auth', () => {
  const { pool, db } = createDb(env);
  let api: TestServer;
  let protectedApi: TestServer;
  let limitedApi: TestServer;

  function post(server: TestServer, path: string, body: unknown, cookie = '') {
    return fetch(`${server.baseUrl}${path}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...(cookie && { cookie }) },
      body: JSON.stringify(body),
    });
  }

  const login = (password = TEST_ADMIN_PASSWORD, email = TEST_ADMIN_EMAIL) =>
    post(api, '/auth/login', { email, password });

  const me = (cookie: string) => fetch(`${api.baseUrl}/auth/me`, { headers: { cookie } });

  beforeAll(async () => {
    const appOptions = { env, db, bcryptCost: TEST_BCRYPT_COST };
    api = await listen(
      createApp({ ...appOptions, loginRateLimit: { windowMs: 60_000, limit: 1000 } }),
    );
    limitedApi = await listen(
      createApp({ ...appOptions, loginRateLimit: { windowMs: 60_000, limit: 3 } }),
    );

    // Rota fictícia protegida: ainda não existem módulos reais do painel
    const requireAuth = createRequireAuth(
      createAuthService(db, {
        jwtSecret: env.JWT_SECRET,
        cookieDomain: env.COOKIE_DOMAIN,
        secureCookies: false,
        bcryptCost: TEST_BCRYPT_COST,
      }),
    );
    const protectedApp = express()
      .use(cookieParser())
      .get('/protected', requireAuth(), (_req, res) => {
        res.json({ ok: true });
      })
      .use(createErrorHandler(false));
    protectedApi = await listen(protectedApp);
  });

  beforeEach(async () => {
    await resetAndBootstrap(env);
  });

  afterAll(async () => {
    await Promise.all([api.close(), limitedApi.close(), protectedApi.close()]);
    await pool.end();
  });

  it('GET /health responds ok with security headers', async () => {
    const response = await fetch(`${api.baseUrl}/health`);

    expect(response.status).toBe(200);
    expect(await readBody(response)).toEqual({ status: 'ok' });
    expect(response.headers.get('x-content-type-options')).toBe('nosniff');
  });

  describe('login', () => {
    it('signs in with an httpOnly SameSite=Lax cookie and never exposes the hash', async () => {
      const response = await login();
      const body = await response.text();
      const setCookie = response.headers.getSetCookie().join('\n');

      expect(response.status).toBe(200);
      expect((JSON.parse(body) as ApiBody).user).toMatchObject({
        email: TEST_ADMIN_EMAIL,
        mustChangePassword: true,
      });
      expect(body).not.toMatch(/hash|\$2[aby]\$/i);
      expect(setCookie).toMatch(/^session=/);
      expect(setCookie).toMatch(/HttpOnly/i);
      expect(setCookie).toMatch(/SameSite=Lax/i);
    });

    it('normalizes the e-mail', async () => {
      const response = await login(TEST_ADMIN_PASSWORD, `  ${TEST_ADMIN_EMAIL.toUpperCase()} `);

      expect(response.status).toBe(200);
    });

    it('answers the same way for a wrong password and an unknown e-mail', async () => {
      const wrongPassword = await login('senha-errada');
      const unknownEmail = await login('qualquer-senha', 'ninguem@test.local');

      expect(wrongPassword.status).toBe(401);
      expect(unknownEmail.status).toBe(401);
      expect(await readBody(wrongPassword)).toEqual(await readBody(unknownEmail));
      expect(cookieFrom(wrongPassword)).toBe('');
    });

    it('rejects invalid bodies with field errors', async () => {
      const response = await post(api, '/auth/login', { email: 'não-é-email' });
      const body = await readBody(response);

      expect(response.status).toBe(400);
      expect(body.error?.code).toBe('VALIDATION_ERROR');
      expect(body.error?.fields).toHaveProperty('email');
      expect(body.error?.fields).toHaveProperty('password');
    });

    it('rejects malformed JSON without leaking details', async () => {
      const response = await fetch(`${api.baseUrl}/auth/login`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: '{ quebrado',
      });

      expect(response.status).toBe(400);
      expect((await readBody(response)).error?.code).toBe('BAD_REQUEST');
    });

    it('rate limits failed attempts', async () => {
      const attempt = () =>
        post(limitedApi, '/auth/login', { email: TEST_ADMIN_EMAIL, password: 'x' });

      for (let i = 0; i < 3; i++) {
        expect((await attempt()).status).toBe(401);
      }
      const blocked = await attempt();

      expect(blocked.status).toBe(429);
      expect((await readBody(blocked)).error?.code).toBe('TOO_MANY_ATTEMPTS');
    });
  });

  describe('session', () => {
    it('requires a valid cookie on /auth/me', async () => {
      expect((await fetch(`${api.baseUrl}/auth/me`)).status).toBe(401);
      expect((await me('session=lixo')).status).toBe(401);
    });

    it('rejects tokens signed with another secret', async () => {
      const forged = jwt.sign({ pv: 'x' }, 'outro-segredo-qualquer-com-32-caracteres!', {
        subject: '1',
      });

      expect((await me(`session=${forged}`)).status).toBe(401);
    });

    it('returns the current user on /auth/me', async () => {
      const cookie = cookieFrom(await login());
      const response = await me(cookie);

      expect(response.status).toBe(200);
      expect((await readBody(response)).user?.email).toBe(TEST_ADMIN_EMAIL);
    });

    it('logs out by clearing the cookie', async () => {
      const response = await post(api, '/auth/logout', {});

      expect(response.status).toBe(204);
      expect(response.headers.getSetCookie().join('\n')).toMatch(/^session=;/);
    });
  });

  describe('mandatory password change', () => {
    it('blocks protected routes until the password is changed', async () => {
      const cookie = cookieFrom(await login());

      const blocked = await fetch(`${protectedApi.baseUrl}/protected`, { headers: { cookie } });
      expect(blocked.status).toBe(403);
      expect((await readBody(blocked)).error?.code).toBe('PASSWORD_CHANGE_REQUIRED');

      const changed = await post(
        api,
        '/auth/change-password',
        { currentPassword: TEST_ADMIN_PASSWORD, newPassword: NEW_PASSWORD },
        cookie,
      );
      expect(changed.status).toBe(200);
      expect((await readBody(changed)).user?.mustChangePassword).toBe(false);

      const freshCookie = cookieFrom(changed);
      const allowed = await fetch(`${protectedApi.baseUrl}/protected`, {
        headers: { cookie: freshCookie },
      });
      expect(allowed.status).toBe(200);
    });

    it('invalidates old sessions and the old password after the change', async () => {
      const oldCookie = cookieFrom(await login());
      await post(
        api,
        '/auth/change-password',
        { currentPassword: TEST_ADMIN_PASSWORD, newPassword: NEW_PASSWORD },
        oldCookie,
      );

      expect((await me(oldCookie)).status).toBe(401);
      expect((await login(TEST_ADMIN_PASSWORD)).status).toBe(401);
      expect((await login(NEW_PASSWORD)).status).toBe(200);
    });

    it('requires authentication', async () => {
      const response = await post(api, '/auth/change-password', {
        currentPassword: TEST_ADMIN_PASSWORD,
        newPassword: NEW_PASSWORD,
      });

      expect(response.status).toBe(401);
    });

    it('rejects a wrong current password', async () => {
      const cookie = cookieFrom(await login());
      const response = await post(
        api,
        '/auth/change-password',
        { currentPassword: 'errada', newPassword: NEW_PASSWORD },
        cookie,
      );

      expect(response.status).toBe(400);
      expect((await readBody(response)).error?.code).toBe('INVALID_CURRENT_PASSWORD');
    });

    it('rejects a weak or unchanged new password', async () => {
      const cookie = cookieFrom(await login());
      const change = async (newPassword: string) => {
        const response = await post(
          api,
          '/auth/change-password',
          { currentPassword: TEST_ADMIN_PASSWORD, newPassword },
          cookie,
        );
        return { status: response.status, body: await readBody(response) };
      };

      const short = await change('curta');
      const same = await change(TEST_ADMIN_PASSWORD);

      expect(short.status).toBe(400);
      expect(short.body.error?.fields).toHaveProperty('newPassword');
      expect(same.status).toBe(400);
      expect(same.body.error?.fields).toHaveProperty('newPassword');
    });
  });
});
