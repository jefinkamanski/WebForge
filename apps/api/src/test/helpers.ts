import { config } from 'dotenv';
import type { Express } from 'express';
import type { Connection } from 'mysql2/promise';
import type { Server } from 'node:http';
import { mkdtempSync } from 'node:fs';
import type { AddressInfo } from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { parseEnv, type Env } from '../config/env.js';
import { bootstrapDatabase } from '../db/bootstrap.js';
import { createBootstrapConnection } from '../db/client.js';
import { SESSION_COOKIE } from '../modules/auth/auth.middleware.js';
import type { MailMessage, Mailer } from '../modules/mail/mailer.js';
import type { Revalidator } from '../modules/revalidation/revalidator.js';

export const TEST_ADMIN_EMAIL = 'admin@test.local';
export const TEST_ADMIN_PASSWORD = 'senha-inicial-123';
export const TEST_ADMIN_NEW_PASSWORD = 'senha-de-testes-123';
export const TEST_ORIGIN = 'http://admin.test.local';
// Custo mínimo do bcrypt: só acelera os testes
export const TEST_BCRYPT_COST = 4;

// Usa as credenciais DB_* do .env da raiz, mas SEMPRE no banco "<DB_NAME>_test".
// Os demais valores são fixos de teste.
export function loadTestEnv(): Env {
  config({ path: path.resolve(import.meta.dirname, '../../../../.env'), quiet: true });
  const baseName = process.env['DB_NAME'] ?? '';
  if (!process.env['DB_HOST'] || !baseName) {
    throw new Error(
      'Os testes de integração precisam de um MySQL: configure DB_* no .env (ver README).',
    );
  }

  return parseEnv({
    ...process.env,
    NODE_ENV: 'test',
    DB_NAME: baseName.endsWith('_test') ? baseName : `${baseName}_test`,
    DB_POOL_LIMIT: '2',
    JWT_SECRET: 'segredo-de-teste-com-pelo-menos-32-caracteres',
    COOKIE_DOMAIN: 'localhost',
    CORS_ORIGINS: TEST_ORIGIN,
    ADMIN_EMAIL: TEST_ADMIN_EMAIL,
    ADMIN_PASSWORD: TEST_ADMIN_PASSWORD,
    // Cada arquivo de teste usa uma pasta de uploads temporária própria
    UPLOAD_DIR: mkdtempSync(path.join(os.tmpdir(), 'webforge-uploads-')),
    // Os testes nunca chamam o site; use fakeRevalidator() para conferir as tags
    WEB_URL: undefined,
    REVALIDATE_SECRET: undefined,
    // Nenhum e-mail de verdade nos testes; use fakeMailer() para conferir as mensagens
    SMTP_HOST: undefined,
    SMTP_USER: undefined,
    SMTP_PASSWORD: undefined,
    MAIL_FROM: undefined,
  });
}

// Guarda as mensagens em vez de enviar. `fail` simula o servidor de e-mail recusando.
export function fakeMailer({ fail = false } = {}): Mailer & { sent: MailMessage[] } {
  const sent: MailMessage[] = [];
  return {
    enabled: true,
    sent,
    send: (message) => {
      sent.push(message);
      return fail ? Promise.reject(new Error('SMTP recusou')) : Promise.resolve();
    },
  };
}

// Guarda as tags pedidas em vez de chamar o site
export function fakeRevalidator(): Revalidator & { tags: string[] } {
  const tags: string[] = [];
  return {
    tags,
    revalidate: (requested) => {
      tags.push(...requested);
      return Promise.resolve();
    },
  };
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

export function send(
  method: 'POST' | 'PUT' | 'PATCH',
  baseUrl: string,
  route: string,
  body: unknown,
  cookie = '',
) {
  return fetch(`${baseUrl}${route}`, {
    method,
    headers: { 'content-type': 'application/json', ...(cookie && { cookie }) },
    body: JSON.stringify(body),
  });
}

export const post = (baseUrl: string, route: string, body: unknown, cookie = '') =>
  send('POST', baseUrl, route, body, cookie);

export const get = (baseUrl: string, route: string, cookie = '') =>
  fetch(`${baseUrl}${route}`, { headers: cookie ? { cookie } : {} });

// Envia um arquivo para POST /media como o painel faz (multipart, campos "file" e "alt")
export function uploadMedia(
  baseUrl: string,
  cookie: string,
  file: { data: Uint8Array; name?: string; type?: string },
  alt: string | undefined = 'Descrição de teste',
) {
  const form = new FormData();
  if (alt !== undefined) form.append('alt', alt);
  form.append(
    'file',
    new Blob([file.data], { type: file.type ?? 'application/octet-stream' }),
    file.name ?? 'arquivo',
  );
  return fetch(`${baseUrl}/media`, { method: 'POST', headers: { cookie }, body: form });
}

// Cabeçalho mínimo de um MP4 ("ftyp" + brand); o servidor não decodifica vídeo
export function fakeMp4(brand = 'isom', size = 64): Uint8Array {
  const data = Buffer.alloc(size);
  data.writeUInt32BE(24, 0);
  data.write(`ftyp${brand}`, 4, 'latin1');
  return data;
}

// Extrai "wf_admin=<valor>" do Set-Cookie para reenviar em outra requisição
export function cookieFrom(response: Response): string {
  const header = response.headers
    .getSetCookie()
    .find((value) => value.startsWith(`${SESSION_COOKIE}=`));
  return header?.split(';')[0] ?? '';
}

// Entra como admin e conclui a troca de senha obrigatória; devolve o cookie já liberado
export async function signInAdmin(baseUrl: string): Promise<string> {
  const login = await post(baseUrl, '/auth/login', {
    email: TEST_ADMIN_EMAIL,
    password: TEST_ADMIN_PASSWORD,
  });
  const changed = await post(
    baseUrl,
    '/auth/change-password',
    { currentPassword: TEST_ADMIN_PASSWORD, newPassword: TEST_ADMIN_NEW_PASSWORD },
    cookieFrom(login),
  );
  return cookieFrom(changed);
}

export interface ApiBody {
  status?: string;
  user?: { id: number; email: string; mustChangePassword: boolean };
  error?: { code: string; fields?: Record<string, string[]> };
}

export async function readBody<T = ApiBody>(response: Response): Promise<T> {
  return (await response.json()) as T;
}
