import { Fragment, type ReactNode } from 'react';
import { Link } from 'react-router';

export interface Crumb {
  label: string;
  // Sem `to`: é a página atual
  to?: string;
}

export interface PageHeaderProps {
  title: string;
  crumbs?: Crumb[];
  description?: ReactNode;
  // Botões da página (ex.: "Novo post"), à direita
  actions?: ReactNode;
}

// Faixa de título que abre toda página interna (docs/DESIGN-ADMIN.md, seção 6)
export function PageHeader({ title, crumbs = [], description, actions }: PageHeaderProps) {
  return (
    <div className="bg-highlight/12 flex flex-wrap items-center justify-between gap-4 rounded-lg px-6 py-4">
      <div className="min-w-0 space-y-2">
        <h1 className="text-xl font-semibold">{title}</h1>
        {crumbs.length > 0 && (
          <nav aria-label="Você está em">
            <ol className="text-muted-foreground flex flex-wrap items-center gap-2 text-sm">
              {crumbs.map((crumb, index) => (
                <Fragment key={`${crumb.label}-${index}`}>
                  {index > 0 && <li aria-hidden="true">•</li>}
                  <li>
                    {crumb.to ? (
                      <Link to={crumb.to} className="hover:text-foreground hover:underline">
                        {crumb.label}
                      </Link>
                    ) : (
                      <span aria-current="page">{crumb.label}</span>
                    )}
                  </li>
                </Fragment>
              ))}
            </ol>
          </nav>
        )}
        {description && <div className="text-muted-foreground text-sm">{description}</div>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
