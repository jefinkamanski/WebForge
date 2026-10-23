import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from './app.js';

describe('GET /health', () => {
  let server: Server;
  let baseUrl = '';

  beforeAll(async () => {
    await new Promise<void>((resolve) => {
      server = createApp({ corsOrigins: ['http://localhost:3000'] }).listen(0, () => resolve());
    });
    baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });

  afterAll(async () => {
    await new Promise((resolve) => server.close(resolve));
  });

  it('responds with status ok and security headers', async () => {
    const response = await fetch(`${baseUrl}/health`);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: 'ok' });
    expect(response.headers.get('x-content-type-options')).toBe('nosniff');
  });
});
