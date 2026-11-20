import { POST_STATUSES, type PostStatus, type PostSummary } from '@webforge/shared';
import { NewspaperIcon, PencilIcon, PlusIcon, RotateCcwIcon, Trash2Icon } from 'lucide-react';
import { Link, useFetcher, useLoaderData } from 'react-router';
import { ApiError } from '../../lib/api.ts';
import { cn } from '../../lib/utils.ts';
import {
  Alert,
  Button,
  Card,
  CardContent,
  ConfirmDialog,
  PageHeader,
  Pagination,
  StatusBadge,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../ui/index.ts';
import { destroyPost, formatDate, listPosts, restorePost } from './posts.api.ts';

type Filter = 'all' | PostStatus | 'trash';

const filters: { value: Filter; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'published', label: 'Publicados' },
  { value: 'draft', label: 'Rascunhos' },
  { value: 'trash', label: 'Lixeira' },
];

const statusBadges: Record<PostStatus, { label: string; tone: 'success' | 'warning' }> = {
  published: { label: 'Publicado', tone: 'success' },
  draft: { label: 'Rascunho', tone: 'warning' },
};

function parseFilter(value: string | null): Filter {
  return value === 'trash' || (POST_STATUSES as readonly string[]).includes(value ?? '')
    ? (value as Filter)
    : 'all';
}

const filterLink = (filter: Filter, page = 1) =>
  `/posts?${new URLSearchParams({ ...(filter !== 'all' && { filter }), page: String(page) }).toString()}`;

export async function loader({ request }: { request: Request }) {
  const params = new URL(request.url).searchParams;
  const filter = parseFilter(params.get('filter'));
  const page = Math.max(1, Number(params.get('page')) || 1);
  const list = await listPosts(
    {
      page,
      view: filter === 'trash' ? 'trash' : 'active',
      status: filter === 'trash' || filter === 'all' ? undefined : filter,
    },
    request.signal,
  );
  return { list, filter };
}

interface ActionResult {
  id: number;
  message?: string;
}

// Ações da lixeira: restaurar e excluir de vez
export async function action({ request }: { request: Request }): Promise<ActionResult> {
  const form = await request.formData();
  const id = Number(form.get('id'));
  try {
    if (form.get('intent') === 'restore') await restorePost(id);
    else await destroyPost(id);
    return { id };
  } catch (error) {
    if (error instanceof ApiError) return { id, message: error.message };
    throw error;
  }
}

// Botão redondo só com ícone, usado nas ações das linhas
const rowAction = (tone: 'primary' | 'error') =>
  cn(
    'size-8 rounded-full',
    tone === 'primary'
      ? 'bg-primary/12 text-primary hover:bg-primary/20 hover:text-primary'
      : 'bg-error/12 text-error-foreground hover:bg-error/20 hover:text-error-foreground',
  );

function TrashActions({ post }: { post: PostSummary }) {
  const fetcher = useFetcher<ActionResult>();
  const busy = fetcher.state !== 'idle';
  const submit = (intent: 'restore' | 'destroy') =>
    void fetcher.submit({ intent, id: String(post.id) }, { method: 'post' });

  return (
    <div className="flex items-center justify-end gap-2">
      {fetcher.data?.message && (
        <span className="text-error-foreground text-xs">{fetcher.data.message}</span>
      )}
      <Button
        variant="ghost"
        size="icon"
        className={rowAction('primary')}
        aria-label={`Restaurar "${post.title}"`}
        title="Restaurar"
        disabled={busy}
        onClick={() => submit('restore')}
      >
        <RotateCcwIcon aria-hidden="true" />
      </Button>
      <ConfirmDialog
        title="Excluir este post de vez?"
        description={`"${post.title}" será apagado. Não é possível desfazer.`}
        confirmLabel="Excluir de vez"
        onConfirm={() => submit('destroy')}
        trigger={
          <Button
            variant="ghost"
            size="icon"
            className={rowAction('error')}
            aria-label={`Excluir "${post.title}" de vez`}
            title="Excluir de vez"
            disabled={busy}
          >
            <Trash2Icon aria-hidden="true" />
          </Button>
        }
      />
    </div>
  );
}

function EmptyState({ inTrash }: { inTrash: boolean }) {
  return (
    <div className="flex flex-col items-center gap-2 py-10 text-center">
      <NewspaperIcon className="text-muted-foreground size-10" aria-hidden="true" />
      <p className="text-base font-semibold">
        {inTrash ? 'A lixeira está vazia' : 'Nenhum post por aqui ainda'}
      </p>
      {!inTrash && (
        <Button asChild className="mt-2">
          <Link to="/posts/new">
            <PlusIcon aria-hidden="true" />
            Criar primeiro post
          </Link>
        </Button>
      )}
    </div>
  );
}

export function Component() {
  const { list, filter } = useLoaderData<typeof loader>();
  const pages = Math.max(1, Math.ceil(list.total / list.pageSize));
  const inTrash = filter === 'trash';

  return (
    <div className="space-y-6">
      <PageHeader
        title="Posts do blog"
        crumbs={[{ label: 'Blog' }, { label: 'Posts' }]}
        actions={
          <Button asChild>
            <Link to="/posts/new">
              <PlusIcon aria-hidden="true" />
              Novo post
            </Link>
          </Button>
        }
      />

      <Card>
        <CardContent className="space-y-5">
          <nav aria-label="Filtrar posts" className="flex flex-wrap gap-2">
            {filters.map((option) => (
              <Button
                key={option.value}
                asChild
                size="sm"
                variant={option.value === filter ? 'default' : 'outline'}
                className="rounded-full"
              >
                <Link
                  to={filterLink(option.value)}
                  aria-current={option.value === filter ? 'page' : undefined}
                >
                  {option.label}
                </Link>
              </Button>
            ))}
          </nav>

          {inTrash && list.items.length > 0 && (
            <Alert>Posts na lixeira não aparecem no site. Restaure para voltar a editá-los.</Alert>
          )}

          {list.items.length === 0 ? (
            <EmptyState inTrash={inTrash} />
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="px-4">Título</TableHead>
                    <TableHead className="px-4">Situação</TableHead>
                    <TableHead className="px-4">Data</TableHead>
                    <TableHead className="px-4 text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {list.items.map((post) => (
                    <TableRow key={post.id}>
                      <TableCell className="max-w-md p-4 whitespace-normal">
                        {inTrash ? (
                          <span className="font-medium">{post.title}</span>
                        ) : (
                          <Link to={`/posts/${post.id}`} className="font-medium hover:underline">
                            {post.title}
                          </Link>
                        )}
                        <span className="text-muted-foreground block text-xs">
                          /blog/{post.slug}
                        </span>
                      </TableCell>
                      <TableCell className="p-4">
                        <StatusBadge tone={statusBadges[post.status].tone}>
                          {statusBadges[post.status].label}
                        </StatusBadge>
                      </TableCell>
                      <TableCell className="text-muted-foreground p-4">
                        {post.publishedAt
                          ? `Publicado em ${formatDate(post.publishedAt)}`
                          : `Editado em ${formatDate(post.updatedAt)}`}
                      </TableCell>
                      <TableCell className="p-4">
                        {inTrash ? (
                          <TrashActions post={post} />
                        ) : (
                          <div className="flex justify-end">
                            <Button
                              asChild
                              variant="ghost"
                              size="icon"
                              className={rowAction('primary')}
                            >
                              <Link
                                to={`/posts/${post.id}`}
                                aria-label={`Editar "${post.title}"`}
                                title="Editar"
                              >
                                <PencilIcon aria-hidden="true" />
                              </Link>
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          <Pagination page={list.page} pages={pages} hrefFor={(page) => filterLink(filter, page)} />
        </CardContent>
      </Card>
    </div>
  );
}
