import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import type { Env } from '../config/env.js';
import * as schema from './schema.js';

export function createDb(env: Env) {
  const pool = mysql.createPool({
    host: env.DB_HOST,
    port: env.DB_PORT,
    user: env.DB_USER,
    password: env.DB_PASSWORD,
    database: env.DB_NAME,
    charset: 'UTF8MB4_UNICODE_CI',
    connectionLimit: env.DB_POOL_LIMIT,
  });
  const db = drizzle({ client: pool, schema, mode: 'default' });

  return { pool, db };
}

export type Db = ReturnType<typeof createDb>['db'];
