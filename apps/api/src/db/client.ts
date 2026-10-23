import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import type { Env } from '../config/env.js';
import * as schema from './schema.js';

type DbConfig = Pick<Env, 'DB_HOST' | 'DB_PORT' | 'DB_NAME' | 'DB_USER' | 'DB_PASSWORD'>;

function connectionOptions(env: DbConfig) {
  return {
    host: env.DB_HOST,
    port: env.DB_PORT,
    user: env.DB_USER,
    password: env.DB_PASSWORD,
    database: env.DB_NAME,
    charset: 'UTF8MB4_UNICODE_CI',
  };
}

export function createDb(env: DbConfig & Pick<Env, 'DB_POOL_LIMIT'>) {
  const pool = mysql.createPool({
    ...connectionOptions(env),
    connectionLimit: env.DB_POOL_LIMIT,
  });
  const db = drizzle({ client: pool, schema, mode: 'default' });

  return { pool, db };
}

// Conexão única e dedicada: GET_LOCK pertence à conexão e o migrator de DDL deve usar um só client
export function createBootstrapConnection(env: DbConfig) {
  return mysql.createConnection(connectionOptions(env));
}

export type Db = ReturnType<typeof createDb>['db'];
