import type { Server } from 'node:http';
import { createApp } from './app.js';
import { loadEnv } from './config/env.js';
import { bootstrapDatabase } from './db/bootstrap.js';
import { createBootstrapConnection, createDb } from './db/client.js';

async function main() {
  const env = loadEnv();

  const connection = await createBootstrapConnection(env);
  try {
    await bootstrapDatabase(connection, {
      adminEmail: env.ADMIN_EMAIL,
      adminPassword: env.ADMIN_PASSWORD,
    });
  } finally {
    await connection.end();
  }

  const { pool, db } = createDb(env);
  const server: Server = createApp({ env, db }).listen(env.PORT, () => {
    console.log(`API ouvindo na porta ${env.PORT}`);
  });

  const shutdown = () => {
    server.close(() => {
      void pool.end().finally(() => process.exit(0));
    });
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
