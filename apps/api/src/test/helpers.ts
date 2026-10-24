import { config } from 'dotenv';
import type { Express } from 'express';
import type { Connection } from 'mysql2/promise';
import { randomUUID } from 'node:crypto';
import { rm } from 'node:fs/promises';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { parseEnv, type Env } from '../config/env.js';
import { bootstrapDatabase } from '../db/bootstrap.js';
import { createBootstrapConnection } from '../db/client.js';

export const TEST_ADMIN_EMAIL = 'admin@test.local';
export const TEST_ADMIN_PASSWORD = 'senha-inicial-123';
// Custo mínimo do bcrypt: só acelera os testes
export const TEST_BCRYPT_COST = 4;

// Usa as credenciais do .env da raiz, mas SEMPRE no banco "<DB_NAME>_test", com uploads
// numa pasta temporária e sem revalidação (nada de chamar o site real durante os testes)
export function loadTestEnv(overrides: Record<string, string | undefined> = {}): Env {
  config({ path: path.resolve(import.meta.dirname, '../../../../.env'), quiet: true });
  const baseName = process.env['DB_NAME'] ?? '';
  const dbName = baseName.endsWith('_test') ? baseName : `${baseName}_test`;

  return parseEnv({
    ...process.env,
    NODE_ENV: 'test',
    DB_NAME: dbName,
    DB_POOL_LIMIT: '2',
    ADMIN_EMAIL: TEST_ADMIN_EMAIL,
    ADMIN_PASSWORD: TEST_ADMIN_PASSWORD,
    UPLOAD_DIR: path.join(tmpdir(), 'site-platform-tests', randomUUID()),
    UPLOAD_MAX_IMAGE_MB: '8',
    UPLOAD_MAX_VIDEO_MB: '25',
    WEB_URL: undefined,
    REVALIDATE_SECRET: undefined,
    ...overrides,
  });
}

// Remove a pasta de uploads criada por loadTestEnv (recusa qualquer outro caminho)
export async function removeTestUploads(env: Env): Promise<void> {
  if (!env.UPLOAD_DIR.startsWith(path.join(tmpdir(), 'site-platform-tests'))) {
    throw new Error(`Recusado: "${env.UPLOAD_DIR}" não é uma pasta de uploads de teste.`);
  }
  await rm(env.UPLOAD_DIR, { recursive: true, force: true });
}

export const TEST_ADMIN_NEW_PASSWORD = 'senha-de-testes-123';

// Entra como admin e conclui a troca de senha obrigatória; devolve o cookie já liberado
export async function signInAdmin(baseUrl: string): Promise<string> {
  const send = (route: string, body: unknown, cookie = '') =>
    fetch(`${baseUrl}${route}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...(cookie && { cookie }) },
      body: JSON.stringify(body),
    });

  const login = await send('/auth/login', {
    email: TEST_ADMIN_EMAIL,
    password: TEST_ADMIN_PASSWORD,
  });
  const changed = await send(
    '/auth/change-password',
    { currentPassword: TEST_ADMIN_PASSWORD, newPassword: TEST_ADMIN_NEW_PASSWORD },
    cookieFrom(login),
  );
  return cookieFrom(changed);
}

// Apaga todas as tabelas do banco de teste. Recusa rodar em qualquer outro banco.
export async function resetDatabase(connection: Connection, dbName: string): Promise<void> {
  if (!dbName.endsWith('_test')) {
    throw new Error(`resetDatabase recusado: "${dbName}" não é um banco de teste.`);
  }

  const [rows] = await connection.query(
    'SELECT TABLE_NAME AS name FROM information_schema.TABLES WHERE TABLE_SCHEMA = ?',
    [dbName],
  );
  await connection.query('SET FOREIGN_KEY_CHECKS = 0');
  for (const { name } of rows as { name: string }[]) {
    await connection.query(`DROP TABLE IF EXISTS \`${name}\``);
  }
  await connection.query('SET FOREIGN_KEY_CHECKS = 1');
}

export async function resetAndBootstrap(env: Env): Promise<void> {
  const connection = await createBootstrapConnection(env);
  try {
    await resetDatabase(connection, env.DB_NAME);
    await bootstrapDatabase(connection, {
      adminEmail: env.ADMIN_EMAIL,
      adminPassword: env.ADMIN_PASSWORD,
      bcryptCost: TEST_BCRYPT_COST,
    });
  } finally {
    await connection.end();
  }
}

export interface TestServer {
  baseUrl: string;
  close: () => Promise<void>;
}

export async function listen(app: Express): Promise<TestServer> {
  const server = await new Promise<Server>((resolve) => {
    const started = app.listen(0, '127.0.0.1', () => resolve(started));
  });
  const { port } = server.address() as AddressInfo;

  return {
    baseUrl: `http://127.0.0.1:${port}`,
    close: () => new Promise((resolve) => server.close(() => resolve())),
  };
}

// Extrai "session=<valor>" do Set-Cookie para reenviar em outra requisição
export function cookieFrom(response: Response): string {
  const header = response.headers.getSetCookie().find((value) => value.startsWith('session='));
  return header?.split(';')[0] ?? '';
}

export interface ApiBody {
  status?: string;
  user?: { id: number; email: string; mustChangePassword: boolean };
  error?: { code: string; fields?: Record<string, string[]> };
}

export async function readBody<T = ApiBody>(response: Response): Promise<T> {
  return (await response.json()) as T;
}
