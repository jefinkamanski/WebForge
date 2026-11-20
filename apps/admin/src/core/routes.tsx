import { sections } from '@webforge/shared';
import { createBrowserRouter, redirect, type RouteObject } from 'react-router';
import { Spinner } from './ui/index.ts';

function Fallback() {
  return (
    <div className="text-primary flex min-h-screen items-center justify-center">
      <Spinner label="Carregando…" />
    </div>
  );
}

function RouteError() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-3 px-6">
      <h1 className="text-xl font-semibold">Algo deu errado</h1>
      <p className="text-muted-foreground text-sm">
        Não foi possível carregar esta página. Verifique sua conexão e tente novamente.
      </p>
      <a href="/" className="text-primary text-sm font-medium underline">
        Voltar ao início
      </a>
    </main>
  );
}

// Início do painel: o primeiro bloco visível do site
const firstSection =
  Object.values(sections).find((section) => section.group === 'content')?.key ??
  Object.keys(sections)[0] ??
  '';

const page = { errorElement: <RouteError />, hydrateFallbackElement: <Fallback /> };

const routes: RouteObject[] = [
  { path: '/login', lazy: () => import('./modules/auth/login.route.tsx'), ...page },
  {
    path: '/change-password',
    lazy: () => import('./modules/auth/change-password.route.tsx'),
    ...page,
  },
  { path: '/logout', lazy: () => import('./modules/auth/logout.route.ts') },
  {
    path: '/',
    lazy: () => import('./layout/AdminLayout.tsx'),
    ...page,
    children: [
      // Início: abre a primeira seção do site
      { index: true, loader: () => redirect(`/sections/${firstSection}`), Component: () => null },
      {
        path: 'sections/:key',
        lazy: () => import('./modules/sections/section.route.tsx'),
        ...page,
      },
      { path: 'posts', lazy: () => import('./modules/posts/posts.route.tsx'), ...page },
      { path: 'posts/new', lazy: () => import('./modules/posts/post.route.tsx'), ...page },
      { path: 'posts/:id', lazy: () => import('./modules/posts/post.route.tsx'), ...page },
      { path: 'forms/:key', lazy: () => import('./modules/forms/form.route.tsx'), ...page },
      { path: 'media', lazy: () => import('./modules/media/media.route.tsx'), ...page },
    ],
  },
];

export const router = createBrowserRouter(routes);
