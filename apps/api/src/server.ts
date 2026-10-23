import { createApp } from './app.js';
import { loadEnv } from './config/env.js';
import { createDb } from './db/client.js';

function main() {
  const env = loadEnv();
  const { pool } = createDb(env);
  const server = createApp({ corsOrigins: env.CORS_ORIGINS }).listen(env.PORT, () => {
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

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
