import bcrypt from 'bcryptjs';
import { count } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/mysql2';
import { migrate } from 'drizzle-orm/mysql2/migrator';
import type { Connection } from 'mysql2/promise';
import path from 'node:path';
import { defaultSectionContent, sectionKeys } from '@site/shared';
import * as schema from './schema.js';

const LOCK_NAME = 'app_bootstrap';
const LOCK_TIMEOUT_SECONDS = 60;
export const BCRYPT_COST = 12;

const migrationsFolder = path.resolve(import.meta.dirname, 'migrations');

export interface BootstrapOptions {
  adminEmail: string;
  adminPassword: string;
  bcryptCost?: number;
}

// Aplica migrations pendentes e o seed inicial. Seguro para rodar a cada boot, até em
// instâncias simultâneas: o GET_LOCK serializa. Nunca apaga dados.
export async function bootstrapDatabase(
  connection: Connection,
  { adminEmail, adminPassword, bcryptCost = BCRYPT_COST }: BootstrapOptions,
): Promise<void> {
  const [rows] = await connection.query('SELECT GET_LOCK(?, ?) AS acquired', [
    LOCK_NAME,
    LOCK_TIMEOUT_SECONDS,
  ]);
  const acquired = (rows as { acquired: number | null }[])[0]?.acquired;
  if (acquired !== 1) {
    throw new Error('Não foi possível obter o lock de bootstrap do banco (timeout).');
  }

  try {
    const db = drizzle({ client: connection, schema, mode: 'default' });

    await migrate(db, { migrationsFolder });

    const [userCount] = await db.select({ total: count() }).from(schema.users);
    if (userCount?.total === 0) {
      await db.insert(schema.users).values({
        email: adminEmail,
        passwordHash: await bcrypt.hash(adminPassword, bcryptCost),
        name: 'Administrador',
        role: 'admin',
        mustChangePassword: true,
      });
    }

    const [sectionCount] = await db.select({ total: count() }).from(schema.siteSections);
    if (sectionCount?.total === 0) {
      await db
        .insert(schema.siteSections)
        .values(sectionKeys.map((key) => ({ key, content: defaultSectionContent[key] })));
    }
  } finally {
    await connection.query('SELECT RELEASE_LOCK(?)', [LOCK_NAME]);
  }
}
