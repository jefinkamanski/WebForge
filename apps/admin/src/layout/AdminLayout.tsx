import { Button, Spinner } from '@site/ui';
import { Form, NavLink, Outlet, useLoaderData, useNavigation } from 'react-router';
import { requireUser } from '../modules/auth/auth.api.ts';

export const loader = () => requireUser();

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `rounded-md px-3 py-2 text-sm font-medium ${
    isActive ? 'bg-indigo-50 text-indigo-700' : 'text-slate-700 hover:bg-slate-100'
  }`;

export function Component() {
  const user = useLoaderData<typeof loader>();
  const navigating = useNavigation().state !== 'idle';

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-3">
          <nav aria-label="Principal" className="flex items-center gap-2">
            <span className="mr-4 font-bold text-slate-900">Painel</span>
            <NavLink to="/settings" className={linkClass}>
              Configurações do site
            </NavLink>
            <NavLink to="/media" className={linkClass}>
              Mídia
            </NavLink>
          </nav>
          <div className="flex items-center gap-4">
            {navigating && <Spinner className="size-4 text-indigo-600" label="Carregando" />}
            <span className="hidden text-sm text-slate-600 sm:inline">{user.email}</span>
            <Form method="post" action="/logout">
              <Button type="submit" variant="secondary">
                Sair
              </Button>
            </Form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-8">
        <Outlet />
      </main>
    </div>
  );
}
