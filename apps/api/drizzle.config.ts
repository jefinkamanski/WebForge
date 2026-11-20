import { defineConfig } from 'drizzle-kit';

// Só gera os arquivos SQL a partir do schema (db:generate); não conecta ao banco.
// As migrations são aplicadas pela própria API no boot (src/db/bootstrap.ts).
export default defineConfig({
  dialect: 'mysql',
  schema: './src/db/schema.ts',
  out: './src/db/migrations',
});
