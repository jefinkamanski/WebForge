import { createApp } from './app.js';
import { loadEnv } from './config/env.js';
import { bootstrapDatabase } from './db/bootstrap.js';
import { createBootstrapConnection, createDb } from './db/client.js';

// Boot: valida o ambiente → aplica migrations e seed (com GET_LOCK) → começa a ouvir
async function main() {
  const env = loadEnv();

  const connection = await createBootstrapConnection(env);
  try {
    const { adminCreated } = await bootstrapDatabase(connection, {
      adminEmail: env.ADMIN_EMAIL,
      adminPassword: env.ADMIN_PASSWORD,
    });
    if (adminCreated) {
      console.log('Administrador inicial criado: troque a senha no primeiro acesso.');
    }
  } finally {
    await connection.end();
  }

  const { pool, db } = createDb(env);
  const server = createApp({ env, db }).listen(env.PORT, () => {
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
