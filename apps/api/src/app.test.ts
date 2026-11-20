import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from './app.js';
import { createDb } from './db/client.js';
import { TEST_ORIGIN, listen, loadTestEnv, type TestServer } from './test/helpers.js';

const env = loadTestEnv();

describe('app', () => {
  const { pool, db } = createDb(env);
  let api: TestServer;

  beforeAll(async () => {
    api = await listen(createApp({ env, db }));
  });

  afterAll(async () => {
    await api.close();
    await pool.end();
  });

  it('answers the health check with security headers', async () => {
    const response = await fetch(`${api.baseUrl}/health`);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: 'ok' });
    expect(response.headers.get('x-content-type-options')).toBe('nosniff');
  });

  it('returns the standard error body for unknown routes', async () => {
    const response = await fetch(`${api.baseUrl}/nao-existe`);

    expect(response.status).toBe(404);
    expect(await response.json()).toMatchObject({ error: { code: 'NOT_FOUND' } });
  });

  it('allows CORS with credentials only for configured origins', async () => {
    const allowed = await fetch(`${api.baseUrl}/health`, { headers: { origin: TEST_ORIGIN } });
    const other = await fetch(`${api.baseUrl}/health`, {
      headers: { origin: 'https://evil.example' },
    });

    expect(allowed.headers.get('access-control-allow-origin')).toBe(TEST_ORIGIN);
    expect(allowed.headers.get('access-control-allow-credentials')).toBe('true');
    expect(other.headers.get('access-control-allow-origin')).toBeNull();
  });

  it('refuses writes from an origin outside CORS_ORIGINS', async () => {
    const response = await fetch(`${api.baseUrl}/auth/logout`, {
      method: 'POST',
      headers: { origin: 'https://evil.example' },
    });

    expect(response.status).toBe(403);
    expect(await response.json()).toMatchObject({ error: { code: 'ORIGIN_NOT_ALLOWED' } });
  });
});
