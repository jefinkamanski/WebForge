import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // O .env fica na raiz do monorepo; só variáveis com prefixo VITE_ chegam ao navegador
  envDir: '../..',
  server: { port: 5173, strictPort: true },
});
