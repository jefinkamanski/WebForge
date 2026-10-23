import { sectionKeys } from '@site/shared';
import { count, eq } from 'drizzle-orm';
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

  async function snapshot(connection: Connection) {
    const db = drizzle({ client: connection, schema, mode: 'default' });
    const [users] = await db.select({ total: count() }).from(schema.users);
    const [sections] = await db.select({ total: count() }).from(schema.siteSections);
    return { db, users: users?.total, sections: sections?.total };
  }

  beforeEach(async () => {
    await resetDatabase(await open(), env.DB_NAME);
  });

  afterAll(async () => {
    await Promise.all(opened.map((connection) => connection.end()));
  });

  it('creates the tables and seeds the admin and the default sections', async () => {
    const connection = await open();
    await bootstrapDatabase(connection, options);

    const { db, users, sections } = await snapshot(connection);
    expect(users).toBe(1);
    expect(sections).toBe(sectionKeys.length);

    const [admin] = await db.select().from(schema.users);
    expect(admin?.email).toBe(TEST_ADMIN_EMAIL);
    expect(admin?.mustChangePassword).toBe(true);
    expect(admin?.passwordHash).not.toContain(TEST_ADMIN_PASSWORD);

    const [tables] = await connection.query(
      'SELECT COUNT(*) AS total FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME IN (?)',
      [env.DB_NAME, ['users', 'site_sections', 'media', 'posts', 'form_submissions']],
    );
    expect((tables as { total: number }[])[0]?.total).toBe(5);
  });

  it('is idempotent: running twice neither duplicates nor deletes anything', async () => {
    const connection = await open();
    await bootstrapDatabase(connection, options);
    const first = await snapshot(connection);
    const [adminBefore] = await first.db.select().from(schema.users);

    await bootstrapDatabase(connection, options);
    const second = await snapshot(connection);
    const [adminAfter] = await second.db.select().from(schema.users);

    expect(second.users).toBe(first.users);
    expect(second.sections).toBe(first.sections);
    expect(adminAfter).toEqual(adminBefore);
  });

  it('keeps data changed after the first boot', async () => {
    const connection = await open();
    await bootstrapDatabase(connection, options);
    const { db } = await snapshot(connection);

    await db
      .update(schema.users)
      .set({ name: 'Nome editado', mustChangePassword: false, passwordHash: 'hash-novo' });
    await db
      .update(schema.siteSections)
      .set({ content: { siteName: 'Editado' } })
      .where(eq(schema.siteSections.key, 'header'));
    await db.insert(schema.posts).values({ slug: 'meu-post', title: 'Meu post', content: 'Oi' });

    await bootstrapDatabase(await open(), options);

    const [admin] = await db.select().from(schema.users);
    expect(admin).toMatchObject({
      name: 'Nome editado',
      mustChangePassword: false,
      passwordHash: 'hash-novo',
    });
    const [header] = await db
      .select()
      .from(schema.siteSections)
      .where(eq(schema.siteSections.key, 'header'));
    expect(header?.content).toEqual({ siteName: 'Editado' });
    const [posts] = await db.select({ total: count() }).from(schema.posts);
    expect(posts?.total).toBe(1);
  });

  it('serializes concurrent boots with the lock', async () => {
    const [a, b] = await Promise.all([open(), open()]);

    await Promise.all([bootstrapDatabase(a, options), bootstrapDatabase(b, options)]);

    const { users, sections } = await snapshot(a);
    expect(users).toBe(1);
    expect(sections).toBe(sectionKeys.length);
  });

  it('releases the lock when it finishes', async () => {
    const connection = await open();
    await bootstrapDatabase(connection, options);

    const other = await open();
    const [rows] = await other.query("SELECT IS_FREE_LOCK('app_bootstrap') AS free");
    expect((rows as { free: number }[])[0]?.free).toBe(1);
  });
});
