import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Atalho "@/" -> src/, usado pelos componentes do shadcn
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  // O .env fica na raiz do monorepo; só variáveis com prefixo VITE_ chegam ao navegador
  envDir: '../..',
  server: { port: 5173, strictPort: true },
});
