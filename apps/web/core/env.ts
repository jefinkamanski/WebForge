import { z } from 'zod';

// Variáveis do site, lidas só no servidor. Em desenvolvimento há padrões para localhost;
// em produção todas as URLs são obrigatórias (o build falha sem elas).
const isProduction = process.env.NODE_ENV === 'production';
const url = (fallback: string) => (isProduction ? z.url() : z.url().default(fallback));

const envSchema = z.object({
  // URL pública do site: canonical, Open Graph, sitemap e robots
  NEXT_PUBLIC_SITE_URL: url('http://localhost:3000'),
  // URL que o servidor do Next.js usa para falar com a API
  API_INTERNAL_URL: url('http://localhost:3001'),
  // URL pública da API: imagens e vídeos no HTML
  API_PUBLIC_URL: url('http://localhost:3001'),
  // Segredo compartilhado com a API para a rota de revalidação
  REVALIDATE_SECRET: z.string().min(32).optional(),
});

export type WebEnv = z.infer<typeof envSchema>;

export function parseWebEnv(source: Record<string, string | undefined>): WebEnv {
  const result = envSchema.safeParse(source);
  if (!result.success) {
    throw new Error(`Variáveis de ambiente do site inválidas:\n${z.prettifyError(result.error)}`);
  }
  // Sem barra no fim, para montar URLs com `${base}${caminho}`
  return {
    ...result.data,
    NEXT_PUBLIC_SITE_URL: result.data.NEXT_PUBLIC_SITE_URL.replace(/\/$/, ''),
    API_INTERNAL_URL: result.data.API_INTERNAL_URL.replace(/\/$/, ''),
    API_PUBLIC_URL: result.data.API_PUBLIC_URL.replace(/\/$/, ''),
  };
}

export const env = parseWebEnv(process.env);
