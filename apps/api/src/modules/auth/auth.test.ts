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
  post,
  readBody,
  resetAndBootstrap,
  signInAdmin,
  type ApiBody,
  type TestServer,
} from '../../test/helpers.js';
import { SESSION_COOKIE, createRequireAdmin } from './auth.middleware.js';
import { createAuthService } from './auth.service.js';

const env = loadTestEnv();
const NEW_PASSWORD = 'uma-senha-nova-forte';

describe('auth', () => {
  const { pool, db } = createDb(env);
  let api: TestServer;
  let limitedApi: TestServer;
  let protectedApi: TestServer;

  const login = (password = TEST_ADMIN_PASSWORD, email = TEST_ADMIN_EMAIL) =>
    post(api.baseUrl, '/auth/login', { email, password });
  const me = (cookie: string) => fetch(`${api.baseUrl}/auth/me`, { headers: { cookie } });
  const changePassword = (cookie: string, currentPassword: string, newPassword: string) =>
    post(api.baseUrl, '/auth/change-password', { currentPassword, newPassword }, cookie);

  beforeAll(async () => {
    const appOptions = { env, db, bcryptCost: TEST_BCRYPT_COST };
    api = await listen(
      createApp({ ...appOptions, loginRateLimit: { windowMs: 60_000, limit: 1000 } }),
    );
    limitedApi = await listen(
      createApp({ ...appOptions, loginRateLimit: { windowMs: 60_000, limit: 3 } }),
    );

    // Rota fictícia protegida: os módulos do painel chegam na fase 2
    const requireAdmin = createRequireAdmin(
      createAuthService(db, {
        jwtSecret: env.JWT_SECRET,
        cookieDomain: env.COOKIE_DOMAIN,
        secureCookies: false,
        bcryptCost: TEST_BCRYPT_COST,
      }),
    );
    protectedApi = await listen(
      express()
        .use(cookieParser())
        .get('/protected', requireAdmin(), (_req, res) => {
          res.json({ ok: true });
        })
        .use(createErrorHandler(false)),
    );
  });

  beforeEach(async () => {
    await resetAndBootstrap(env);
  });

  afterAll(async () => {
    await Promise.all([api.close(), limitedApi.close(), protectedApi.close()]);
    await pool.end();
  });

  describe('login', () => {
    it('signs in with an httpOnly SameSite=Lax wf_admin cookie and never exposes the hash', async () => {
      const response = await login();
      const body = await response.text();
      const setCookie = response.headers.getSetCookie().join('\n');

      expect(response.status).toBe(200);
      expect((JSON.parse(body) as ApiBody).user).toMatchObject({
        email: TEST_ADMIN_EMAIL,
        mustChangePassword: true,
      });
      expect(body).not.toMatch(/hash|\$2[aby]\$/i);
      expect(setCookie).toMatch(new RegExp(`^${SESSION_COOKIE}=`));
      expect(setCookie).toMatch(/HttpOnly/i);
      expect(setCookie).toMatch(/SameSite=Lax/i);
    });

    it('normalizes the e-mail', async () => {
      expect(
        (await login(TEST_ADMIN_PASSWORD, `  ${TEST_ADMIN_EMAIL.toUpperCase()} `)).status,
      ).toBe(200);
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
      const response = await post(api.baseUrl, '/auth/login', { email: 'não-é-email' });
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

    it('rate limits failed attempts only', async () => {
      const attempt = (password: string) =>
        post(limitedApi.baseUrl, '/auth/login', { email: TEST_ADMIN_EMAIL, password });

      expect((await attempt(TEST_ADMIN_PASSWORD)).status).toBe(200);
      for (let i = 0; i < 3; i++) {
        expect((await attempt('errada')).status).toBe(401);
      }
      const blocked = await attempt('errada');

      expect(blocked.status).toBe(429);
      expect((await readBody(blocked)).error?.code).toBe('TOO_MANY_ATTEMPTS');
    });
  });

  describe('session', () => {
    it('requires a valid cookie on /auth/me', async () => {
      expect((await fetch(`${api.baseUrl}/auth/me`)).status).toBe(401);
      expect((await me(`${SESSION_COOKIE}=lixo`)).status).toBe(401);
    });

    it('returns the current admin on /auth/me', async () => {
      const response = await me(cookieFrom(await login()));

      expect(response.status).toBe(200);
      expect((await readBody(response)).user?.email).toBe(TEST_ADMIN_EMAIL);
    });

    it('rejects tokens signed with another secret', async () => {
      const forged = jwt.sign({ pv: 'x' }, 'outro-segredo-qualquer-com-32-caracteres!', {
        subject: '1',
        audience: 'admin',
      });

      expect((await me(`${SESSION_COOKIE}=${forged}`)).status).toBe(401);
    });

    it('rejects a valid token issued for another audience (e.g. a site member)', async () => {
      const cookie = cookieFrom(await login());
      const claims = jwt.decode(cookie.split('=')[1] ?? '') as { pv: string; sub: string };
      const memberToken = jwt.sign({ pv: claims.pv }, env.JWT_SECRET, {
        subject: claims.sub,
        audience: 'member',
      });

      expect((await me(`${SESSION_COOKIE}=${memberToken}`)).status).toBe(401);
    });

    it('logs out by clearing the cookie', async () => {
      const response = await post(api.baseUrl, '/auth/logout', {});

      expect(response.status).toBe(204);
      expect(response.headers.getSetCookie().join('\n')).toMatch(
        new RegExp(`^${SESSION_COOKIE}=;`),
      );
    });
  });

  describe('mandatory password change', () => {
    it('blocks protected routes until the password is changed', async () => {
      const cookie = cookieFrom(await login());

      const blocked = await fetch(`${protectedApi.baseUrl}/protected`, { headers: { cookie } });
      expect(blocked.status).toBe(403);
      expect((await readBody(blocked)).error?.code).toBe('PASSWORD_CHANGE_REQUIRED');

      const changed = await changePassword(cookie, TEST_ADMIN_PASSWORD, NEW_PASSWORD);
      expect(changed.status).toBe(200);
      expect((await readBody(changed)).user?.mustChangePassword).toBe(false);

      const allowed = await fetch(`${protectedApi.baseUrl}/protected`, {
        headers: { cookie: cookieFrom(changed) },
      });
      expect(allowed.status).toBe(200);
    });

    it('invalidates old sessions and the old password after the change', async () => {
      const oldCookie = cookieFrom(await login());
      await changePassword(oldCookie, TEST_ADMIN_PASSWORD, NEW_PASSWORD);

      expect((await me(oldCookie)).status).toBe(401);
      expect((await login(TEST_ADMIN_PASSWORD)).status).toBe(401);
      expect((await login(NEW_PASSWORD)).status).toBe(200);
    });

    it('requires authentication', async () => {
      expect((await changePassword('', TEST_ADMIN_PASSWORD, NEW_PASSWORD)).status).toBe(401);
    });

    it('rejects a wrong current password', async () => {
      const response = await changePassword(cookieFrom(await login()), 'errada', NEW_PASSWORD);

      expect(response.status).toBe(400);
      expect((await readBody(response)).error?.code).toBe('INVALID_CURRENT_PASSWORD');
    });

    it('rejects a weak, too long or unchanged new password', async () => {
      const cookie = cookieFrom(await login());

      for (const newPassword of ['curta', 'ç'.repeat(40), TEST_ADMIN_PASSWORD]) {
        const response = await changePassword(cookie, TEST_ADMIN_PASSWORD, newPassword);
        expect(response.status).toBe(400);
        expect((await readBody(response)).error?.fields).toHaveProperty('newPassword');
      }
    });
  });

  it('signInAdmin helper leaves a session that opens protected routes', async () => {
    const cookie = await signInAdmin(api.baseUrl);
    const response = await fetch(`${protectedApi.baseUrl}/protected`, { headers: { cookie } });

    expect(response.status).toBe(200);
  });
});
