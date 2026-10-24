import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router/dom';
import { z } from 'zod';
import pt from 'zod/v4/locales/pt.js';
import { router } from './routes.tsx';
import './index.css';

// Mensagens de validação dos schemas compartilhados em português (só o idioma usado no bundle)
z.config(pt());

const root = document.getElementById('root');
if (!root) {
  throw new Error('Elemento #root não encontrado');
}

createRoot(root).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);
