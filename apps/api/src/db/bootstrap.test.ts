import { count } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/mysql2';
import type { Connection } from 'mysql2/promise';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import {
  TEST_ADMIN_EMAIL,
  TEST_ADMIN_PASSWORD,
  TEST_BCRYPT_COST,
  loadTestEnv,
  resetDatabase,
} from '../test/helpers.js';
import { bootstrapDatabase } from './bootstrap.js';
import { createBootstrapConnection } from './client.js';
import * as schema from './schema.js';

const env = loadTestEnv();
const options = {
  adminEmail: TEST_ADMIN_EMAIL,
  adminPassword: TEST_ADMIN_PASSWORD,
  bcryptCost: TEST_BCRYPT_COST,
};

describe('bootstrapDatabase', () => {
  const opened: Connection[] = [];

  async function open() {
    const connection = await createBootstrapConnection(env);
    opened.push(connection);
    return connection;
  }

  async function admins(connection: Connection) {
    const db = drizzle({ client: connection, schema, mode: 'default' });
    return { db, rows: await db.select().from(schema.adminUsers) };
  }

  beforeEach(async () => {
    await resetDatabase(await open(), env.DB_NAME);
  });

  afterAll(async () => {
    await Promise.all(opened.map((connection) => connection.end()));
  });

  it('creates the tables and the initial admin with a mandatory password change', async () => {
    const connection = await open();
    const result = await bootstrapDatabase(connection, options);

    const { rows } = await admins(connection);
    expect(result.adminCreated).toBe(true);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ email: TEST_ADMIN_EMAIL, mustChangePassword: true });
    expect(rows[0]?.passwordHash).not.toContain(TEST_ADMIN_PASSWORD);
  });

  it('is idempotent and keeps data changed after the first boot', async () => {
    const connection = await open();
    await bootstrapDatabase(connection, options);
    const { db } = await admins(connection);
    await db
      .update(schema.adminUsers)
      .set({ name: 'Nome editado', mustChangePassword: false, passwordHash: 'hash-novo' });

    const second = await bootstrapDatabase(await open(), options);

    const { rows } = await admins(connection);
    expect(second.adminCreated).toBe(false);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      name: 'Nome editado',
      mustChangePassword: false,
      passwordHash: 'hash-novo',
    });
  });

  it('boots without ADMIN_* once an admin exists', async () => {
    await bootstrapDatabase(await open(), options);

    await expect(
      bootstrapDatabase(await open(), { adminEmail: undefined, adminPassword: undefined }),
    ).resolves.toEqual({ adminCreated: false });
  });

  it('fails with a clear message on an empty database without ADMIN_*', async () => {
    await expect(
      bootstrapDatabase(await open(), { adminEmail: undefined, adminPassword: undefined }),
    ).rejects.toThrow(/ADMIN_EMAIL e ADMIN_PASSWORD/);
  });

  it('serializes concurrent boots with the lock and releases it at the end', async () => {
    const [a, b] = await Promise.all([open(), open()]);
    await Promise.all([bootstrapDatabase(a, options), bootstrapDatabase(b, options)]);

    const db = drizzle({ client: a, schema, mode: 'default' });
    const [total] = await db.select({ total: count() }).from(schema.adminUsers);
    expect(total?.total).toBe(1);

    const [rows] = await (await open()).query("SELECT IS_FREE_LOCK('webforge_bootstrap') AS free");
    expect((rows as { free: number }[])[0]?.free).toBe(1);
  });
});
