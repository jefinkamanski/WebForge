import { config } from 'dotenv';
import path from 'node:path';
import { z } from 'zod';

const port = z.coerce.number().int().min(1).max(65535);

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: port.default(3001),
  DB_HOST: z.string().min(1),
  DB_PORT: port.default(3306),
  DB_NAME: z.string().min(1),
  DB_USER: z.string().min(1),
  DB_PASSWORD: z.string().min(1),
  // Hospedagem compartilhada limita conexões por usuário
  DB_POOL_LIMIT: z.coerce.number().int().min(1).max(10).default(5),
  CORS_ORIGINS: z
    .string()
    .transform((value) =>
      value
        .split(',')
        .map((origin) => origin.trim())
        .filter(Boolean),
    )
    .pipe(z.array(z.url()).min(1)),
});

export type Env = z.infer<typeof envSchema>;

export function parseEnv(source: NodeJS.ProcessEnv): Env {
  const result = envSchema.safeParse(source);
  if (!result.success) {
    throw new Error(`Variáveis de ambiente inválidas:\n${z.prettifyError(result.error)}`);
  }
  return result.data;
}

// O .env fica na raiz do monorepo; em produção as variáveis vêm do painel da hospedagem
export function loadEnv(): Env {
  config({ path: path.resolve(import.meta.dirname, '../../../../.env'), quiet: true });
  return parseEnv(process.env);
}
