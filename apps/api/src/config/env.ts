import { PASSWORD_MIN_LENGTH } from '@webforge/shared';
import { config } from 'dotenv';
import path from 'node:path';
import { z } from 'zod';

const rootDir = path.resolve(import.meta.dirname, '../../../..');
const port = z.coerce.number().int().min(1).max(65535);
// "VAR=" no .env chega como texto vazio: trata como não definida
const blankAsUndefined = <T extends z.ZodType>(schema: T) =>
  z.preprocess((value) => (value === '' ? undefined : value), schema);

// Toda variável nova entra aqui e no .env.example. Falha no boot se algo estiver errado.
const envSchema = z
  .object({
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

    JWT_SECRET: z.string().min(32),
    COOKIE_DOMAIN: z.string().min(1).default('localhost'),
    CORS_ORIGINS: z
      .string()
      .transform((value) =>
        value
          .split(',')
          .map((origin) => origin.trim())
          .filter(Boolean),
      )
      .pipe(z.array(z.url()).min(1)),

    // Só usados no primeiro boot (tabela de admins vazia); podem ser removidos depois
    ADMIN_EMAIL: z.string().trim().toLowerCase().pipe(z.email()).optional(),
    ADMIN_PASSWORD: z.string().min(PASSWORD_MIN_LENGTH).optional(),

    // Caminho relativo parte da raiz do projeto; em produção use uma pasta fora do app
    UPLOAD_DIR: z
      .string()
      .min(1)
      .default('./uploads')
      .transform((value) => path.resolve(rootDir, value)),

    // Revalidação do site ao salvar conteúdo; sem elas, a API só registra um aviso
    WEB_URL: z.url().optional(),
    REVALIDATE_SECRET: z.string().min(32).optional(),

    // E-mail (SMTP). Sem SMTP_HOST, nada é enviado e a API só registra um aviso.
    SMTP_HOST: blankAsUndefined(z.string().min(1).optional()),
    SMTP_PORT: port.default(587),
    // true na porta 465 (TLS direto); false na 587 (STARTTLS)
    SMTP_SECURE: blankAsUndefined(z.stringbool().default(false)),
    SMTP_USER: blankAsUndefined(z.string().min(1).optional()),
    SMTP_PASSWORD: blankAsUndefined(z.string().min(1).optional()),
    // Remetente, ex.: "Site do Cliente <contato@cliente.com>"
    MAIL_FROM: blankAsUndefined(z.string().min(3).optional()),
  })
  .superRefine((env, ctx) => {
    if (env.SMTP_HOST && !env.MAIL_FROM) {
      ctx.addIssue({
        code: 'custom',
        path: ['MAIL_FROM'],
        message: 'Obrigatório quando SMTP_HOST está definido.',
      });
    }
    // Combinação errada não conecta e o erro do TLS não diz o motivo
    if (env.SMTP_HOST && env.SMTP_PORT === 587 && env.SMTP_SECURE) {
      ctx.addIssue({
        code: 'custom',
        path: ['SMTP_SECURE'],
        message: 'Use false na porta 587 (STARTTLS); true é para a porta 465.',
      });
    }
    if (env.SMTP_HOST && env.SMTP_PORT === 465 && !env.SMTP_SECURE) {
      ctx.addIssue({
        code: 'custom',
        path: ['SMTP_SECURE'],
        message: 'Use true na porta 465 (TLS direto); false é para a porta 587.',
      });
    }
    if (env.SMTP_USER && !env.SMTP_PASSWORD) {
      ctx.addIssue({
        code: 'custom',
        path: ['SMTP_PASSWORD'],
        message: 'Obrigatório quando SMTP_USER está definido.',
      });
    }
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
