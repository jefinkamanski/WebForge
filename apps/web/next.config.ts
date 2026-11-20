import { existsSync } from 'node:fs';
import path from 'node:path';
import type { NextConfig } from 'next';

// O .env fica na raiz do monorepo; em produção as variáveis vêm do painel da hospedagem
const rootEnvFile = path.resolve(process.cwd(), '../../.env');
if (existsSync(rootEnvFile)) {
  process.loadEnvFile(rootEnvFile);
}

const isProduction = process.env.NODE_ENV === 'production';

// Imagens vêm da API (/uploads/...). Só esse endereço passa pelo otimizador do next/image.
const apiPublicUrl = new URL(process.env.API_PUBLIC_URL ?? 'http://localhost:3001');
// Em desenvolvimento a API roda em localhost, que o Next bloqueia por padrão
const apiIsLocal = ['localhost', '127.0.0.1', '[::1]'].includes(apiPublicUrl.hostname);

const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  // Só em produção: em localhost (http) o HSTS atrapalharia o desenvolvimento
  ...(isProduction ? [{ key: 'Strict-Transport-Security', value: 'max-age=31536000' }] : []),
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  images: {
    remotePatterns: [new URL('/uploads/**', apiPublicUrl)],
    dangerouslyAllowLocalIP: apiIsLocal,
  },
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
};

export default nextConfig;
