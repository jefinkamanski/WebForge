import { createBrowserRouter, redirect, type RouteObject } from 'react-router';
import { Spinner } from '@site/ui';

function Fallback() {
  return (
    <div className="flex min-h-screen items-center justify-center text-indigo-600">
      <Spinner label="Carregando…" />
    </div>
  );
}

function RouteError() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-3 px-6">
      <h1 className="text-xl font-bold text-slate-900">Algo deu errado</h1>
      <p className="text-sm text-slate-700">
        Não foi possível carregar esta página. Verifique sua conexão e tente novamente.
      </p>
      <a href="/" className="text-sm font-medium text-indigo-700 underline">
        Voltar ao início
      </a>
    </main>
  );
}

const routes: RouteObject[] = [
  {
    path: '/login',
    lazy: () => import('./modules/auth/login.route.tsx'),
    errorElement: <RouteError />,
    hydrateFallbackElement: <Fallback />,
  },
  {
    path: '/change-password',
    lazy: () => import('./modules/auth/change-password.route.tsx'),
    errorElement: <RouteError />,
    hydrateFallbackElement: <Fallback />,
  },
  { path: '/logout', lazy: () => import('./modules/auth/logout.route.ts') },
  {
    path: '/',
    lazy: () => import('./layout/AdminLayout.tsx'),
    errorElement: <RouteError />,
    hydrateFallbackElement: <Fallback />,
    children: [
      { index: true, Component: () => null, loader: () => redirect('/settings') },
      { path: 'settings', lazy: () => import('./modules/site-settings/settings.route.tsx') },
      { path: 'media', lazy: () => import('./modules/media/media.route.tsx') },
    ],
  },
];

export const router = createBrowserRouter(routes);
