import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react';
import { Link } from 'react-router';
import { Button } from '../components/ui/button.tsx';

export interface PaginationProps {
  page: number;
  pages: number;
  // Endereço de cada página (mantém os filtros da lista)
  hrefFor: (page: number) => string;
}

// "Página 1 de 3" com Anterior/Próxima. Some quando há uma página só.
export function Pagination({ page, pages, hrefFor }: PaginationProps) {
  if (pages <= 1) return null;
  return (
    <nav aria-label="Páginas" className="flex items-center justify-between gap-4">
      <span className="text-muted-foreground text-sm">
        Página {page} de {pages}
      </span>
      <div className="flex gap-2">
        {page > 1 && (
          <Button asChild variant="outline">
            <Link to={hrefFor(page - 1)}>
              <ChevronLeftIcon aria-hidden="true" />
              Anterior
            </Link>
          </Button>
        )}
        {page < pages && (
          <Button asChild>
            <Link to={hrefFor(page + 1)}>
              Próxima
              <ChevronRightIcon aria-hidden="true" />
            </Link>
          </Button>
        )}
      </div>
    </nav>
  );
}
