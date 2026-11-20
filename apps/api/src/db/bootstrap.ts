import bcrypt from 'bcryptjs';
import { count } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/mysql2';
import { migrate } from 'drizzle-orm/mysql2/migrator';
import type { Connection } from 'mysql2/promise';
import path from 'node:path';
import * as schema from './schema.js';

const LOCK_NAME = 'webforge_bootstrap';
const LOCK_TIMEOUT_SECONDS = 60;
export const BCRYPT_COST = 12;

const migrationsFolder = path.resolve(import.meta.dirname, 'migrations');

export interface BootstrapOptions {
  adminEmail: string | undefined;
  adminPassword: string | undefined;
  bcryptCost?: number;
}

// Aplica as migrations pendentes e cria o admin inicial. Roda a cada boot e nunca apaga
// dados; o GET_LOCK serializa instâncias que sobem ao mesmo tempo.
export async function bootstrapDatabase(
  connection: Connection,
  { adminEmail, adminPassword, bcryptCost = BCRYPT_COST }: BootstrapOptions,
): Promise<{ adminCreated: boolean }> {
  const [rows] = await connection.query('SELECT GET_LOCK(?, ?) AS acquired', [
    LOCK_NAME,
    LOCK_TIMEOUT_SECONDS,
  ]);
  if ((rows as { acquired: number | null }[])[0]?.acquired !== 1) {
    throw new Error('Não foi possível obter o lock de bootstrap do banco (timeout).');
  }

  try {
    const db = drizzle({ client: connection, schema, mode: 'default' });
    await migrate(db, { migrationsFolder });

    const [admins] = await db.select({ total: count() }).from(schema.adminUsers);
    if (admins?.total !== 0) return { adminCreated: false };

    if (!adminEmail || !adminPassword) {
      throw new Error(
        'Nenhum administrador cadastrado: defina ADMIN_EMAIL e ADMIN_PASSWORD para o primeiro boot.',
      );
    }
    await db.insert(schema.adminUsers).values({
      email: adminEmail,
      passwordHash: await bcrypt.hash(adminPassword, bcryptCost),
      name: 'Administrador',
      mustChangePassword: true,
    });
    return { adminCreated: true };
  } finally {
    await connection.query('SELECT RELEASE_LOCK(?)', [LOCK_NAME]);
  }
}
