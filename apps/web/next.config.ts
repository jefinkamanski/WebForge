import { existsSync } from 'node:fs';
import path from 'node:path';
import type { NextConfig } from 'next';

// O .env fica na raiz do monorepo; em produção as variáveis vêm do painel da hospedagem
const rootEnvFile = path.resolve(process.cwd(), '../../.env');
if (existsSync(rootEnvFile)) {
  process.loadEnvFile(rootEnvFile);
}

const nextConfig: NextConfig = {};

export default nextConfig;
