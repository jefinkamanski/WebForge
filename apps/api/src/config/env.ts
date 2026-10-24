import { config } from 'dotenv';
import path from 'node:path';
import { z } from 'zod';

const port = z.coerce.number().int().min(1).max(65535);
const rootDir = path.resolve(import.meta.dirname, '../../../..');

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: port.default(3001),
  // Nº de proxies reversos à frente da API (hospedagem compartilhada costuma ter 1)
  TRUST_PROXY: z.coerce.number().int().min(0).max(5).default(0),
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
  JWT_SECRET: z.string().min(32),
  COOKIE_DOMAIN: z.string().min(1).default('localhost'),
  ADMIN_EMAIL: z.string().trim().toLowerCase().pipe(z.email()),
  ADMIN_PASSWORD: z.string().min(8),
  // Relativo = a partir da raiz do monorepo. Em produção, use uma pasta fora do app.
  UPLOAD_DIR: z
    .string()
    .min(1)
    .default('./uploads')
    .transform((dir) => path.resolve(rootDir, dir)),
  UPLOAD_MAX_IMAGE_MB: z.coerce.number().positive().max(50).default(8),
  UPLOAD_MAX_VIDEO_MB: z.coerce.number().positive().max(200).default(25),
  WEB_URL: z.url().optional(),
  // Sem o segredo, a revalidação do cache do site é pulada
  REVALIDATE_SECRET: z.string().min(16).optional(),
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
  config({ path: path.join(rootDir, '.env'), quiet: true });
  return parseEnv(process.env);
}
