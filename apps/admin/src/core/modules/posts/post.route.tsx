import {
  EMPTY_POST_DOC,
  POST_SLUG_MAX,
  postInputSchema,
  slugify,
  type PostDoc,
  type PostEdit,
  type PostFields,
  type PostInput,
  type PostStatus,
} from '@webforge/shared';
import { useCallback, useMemo, useState } from 'react';
import { ExternalLinkIcon, Trash2Icon } from 'lucide-react';
import {
  redirect,
  useFetcher,
  useLoaderData,
  useSearchParams,
  type ShouldRevalidateFunctionArgs,
} from 'react-router';
import { ApiError } from '../../lib/api.ts';
import { issuesToFieldErrors } from '../../lib/forms.ts';
import {
  Alert,
  Button,
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  ConfirmDialog,
  PageHeader,
  StatusBadge,
  TextAreaField,
  TextField,
} from '../../ui/index.ts';
import { MediaLibrary, useMediaLibraryState } from '../media/media-context.ts';
import { ImageField } from '../sections/MediaField.tsx';
import { RichTextEditor, toEditorContent } from './RichTextEditor.tsx';
import {
  createPost,
  getPost,
  postPublicUrl,
  restorePost,
  trashPost,
  updatePost,
} from './posts.api.ts';

type Intent = 'save' | 'trash' | 'restore';

interface ActionBody {
  intent: Intent;
  fields?: PostInput;
}

interface ActionResult {
  edit?: PostEdit;
  errors?: Record<string, string>;
  message?: string;
}

function parseId(value: string | undefined): number | null {
  if (value === undefined) return null;
  const id = Number(value);
  if (!Number.isInteger(id) || id < 1) throw new Response('Post não encontrado', { status: 404 });
  return id;
}

// Sem :id = post novo
export async function loader({ params }: { params: { id?: string } }) {
  const id = parseId(params.id);
  return { edit: id ? await getPost(id) : null };
}

// Erros do texto (content.content.3...) aparecem todos embaixo do editor
function groupErrors(errors: Record<string, string>): Record<string, string> {
  const grouped: Record<string, string> = {};
  for (const [path, message] of Object.entries(errors)) {
    const key = path.startsWith('content') ? 'content' : path;
    grouped[key] ??= message;
  }
  return grouped;
}

export async function action({
  request,
  params,
}: {
  request: Request;
  params: { id?: string };
}): Promise<ActionResult | Response> {
  const id = parseId(params.id);
  const { intent, fields } = (await request.json()) as ActionBody;

  try {
    if (id && intent === 'trash') {
      await trashPost(id);
      return redirect('/posts');
    }
    if (id && intent === 'restore') {
      await restorePost(id);
      return redirect(`/posts/${id}`);
    }

    // Mesma validação da API, antes de enviar
    const parsed = postInputSchema.safeParse(fields);
    if (!parsed.success || !fields) {
      return {
        errors: parsed.success ? {} : groupErrors(issuesToFieldErrors(parsed.error)),
        message: 'Corrija os campos destacados.',
      };
    }
    if (!id) {
      const created = await createPost(fields);
      return redirect(`/posts/${created.post.id}?criado=1`);
    }
    return { edit: await updatePost(id, fields) };
  } catch (error) {
    if (!(error instanceof ApiError)) throw error;
    const errors: Record<string, string> = {};
    for (const [path, messages] of Object.entries(error.fields)) {
      if (messages[0]) errors[path] = messages[0];
    }
    return { errors: groupErrors(errors), message: error.message };
  }
}

// Enviar mídia no seletor não recarrega o post (o que está na tela seria perdido)
export function shouldRevalidate({
  formAction,
  defaultShouldRevalidate,
}: ShouldRevalidateFunctionArgs) {
  return formAction?.startsWith('/media') ? false : defaultShouldRevalidate;
}

const emptyFields = (): PostFields => ({
  title: '',
  slug: '',
  excerpt: '',
  cover: null,
  content: EMPTY_POST_DOC,
  seoTitle: '',
  seoDescription: '',
  status: 'draft',
});

function fieldsOf(edit: PostEdit | null): PostFields {
  if (!edit) return emptyFields();
  const { post } = edit;
  return {
    title: post.title,
    slug: post.slug,
    excerpt: post.excerpt,
    cover: post.cover,
    content: post.content,
    seoTitle: post.seoTitle,
    seoDescription: post.seoDescription,
    status: post.status,
  };
}

function PostEditor({ edit }: { edit: PostEdit | null }) {
  const fetcher = useFetcher<ActionResult>();
  const [searchParams] = useSearchParams();
  const [fields, setFields] = useState(() => fieldsOf(edit));
  // Num post novo, o endereço acompanha o título até ser editado à mão
  const [slugTouched, setSlugTouched] = useState(edit !== null);
  const [dirty, setDirty] = useState(false);
  const [savedStatus, setSavedStatus] = useState<PostStatus>(edit?.post.status ?? 'draft');
  const mediaLibrary = useMediaLibraryState(edit?.media ?? {});
  const initialContent = useMemo(
    () => toEditorContent(edit?.post.content ?? EMPTY_POST_DOC, edit?.media ?? {}),
    [edit],
  );

  // Ao salvar, adota os campos normalizados pela API (o editor mantém o próprio texto)
  const result = fetcher.state === 'idle' ? fetcher.data : undefined;
  const [handled, setHandled] = useState(result);
  if (result !== handled) {
    setHandled(result);
    if (result?.edit) {
      const saved = fieldsOf(result.edit);
      setFields((current) => ({ ...saved, content: current.content }));
      setSavedStatus(result.edit.post.status);
      mediaLibrary.setMedia(result.edit.media);
      setDirty(false);
    }
  }

  const update = useCallback((patch: Partial<PostFields>) => {
    setFields((current) => ({ ...current, ...patch }));
    setDirty(true);
  }, []);
  const onContentChange = useCallback((content: PostDoc) => update({ content }), [update]);

  const submit = (intent: Intent, status?: PostStatus) => {
    const body: ActionBody = {
      intent,
      ...(intent === 'save' && { fields: { ...fields, status: status ?? fields.status } }),
    };
    void fetcher.submit(body as never, { method: 'post', encType: 'application/json' });
  };

  const errors = result?.errors ?? {};
  const saving = fetcher.state !== 'idle';
  const published = savedStatus === 'published';
  const publicUrl = published && edit ? postPublicUrl(fields.slug) : null;
  const justCreated = searchParams.has('criado') && !dirty && !result;

  return (
    <MediaLibrary.Provider value={mediaLibrary.value}>
      <form
        className="space-y-6"
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          submit('save');
        }}
      >
        {result?.message && <Alert tone="error">{result.message}</Alert>}
        {justCreated && <Alert tone="success">Post criado.</Alert>}
        {result?.edit && !dirty && (
          <Alert tone="success">
            {published ? 'Post salvo. O site é atualizado em instantes.' : 'Rascunho salvo.'}
          </Alert>
        )}

        <div className="grid items-start gap-6 lg:grid-cols-12">
          <Card className="lg:col-span-8">
            <CardContent className="space-y-5">
              <TextField
                label="Título"
                value={fields.title}
                maxLength={160}
                onChange={(event) => {
                  const title = event.target.value;
                  update(slugTouched ? { title } : { title, slug: slugify(title) });
                }}
                error={errors['title']}
              />
              <TextField
                label="Endereço"
                value={fields.slug}
                maxLength={POST_SLUG_MAX}
                hint={`O post fica em /blog/${fields.slug || 'endereco-do-post'}. Mudar depois de publicado quebra links antigos.`}
                onChange={(event) => {
                  setSlugTouched(true);
                  update({ slug: event.target.value });
                }}
                onBlur={() => update({ slug: slugify(fields.slug) })}
                error={errors['slug']}
              />
              <RichTextEditor
                label="Texto"
                initialContent={initialContent}
                onChange={onContentChange}
                error={errors['content']}
              />
            </CardContent>
          </Card>

          <aside className="space-y-6 lg:col-span-4">
            <Card>
              <CardHeader>
                <CardTitle>Publicação</CardTitle>
                <CardAction>
                  <StatusBadge tone={published ? 'success' : 'warning'}>
                    {published ? 'Publicado' : 'Rascunho'}
                  </StatusBadge>
                </CardAction>
                <CardDescription>
                  {dirty ? 'Há alterações não salvas.' : 'Tudo salvo.'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {published ? (
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                    <Button type="submit" loading={saving}>
                      Salvar
                    </Button>
                    <Button
                      variant="outline"
                      disabled={saving}
                      onClick={() => submit('save', 'draft')}
                    >
                      Despublicar
                    </Button>
                  </div>
                ) : (
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                    <Button loading={saving} onClick={() => submit('save', 'published')}>
                      Publicar
                    </Button>
                    <Button type="submit" variant="outline" disabled={saving}>
                      Salvar rascunho
                    </Button>
                  </div>
                )}
                {publicUrl && (
                  <Button asChild variant="ghost" className="w-full">
                    <a href={publicUrl} target="_blank" rel="noreferrer">
                      Ver no site
                      <ExternalLinkIcon aria-hidden="true" />
                    </a>
                  </Button>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Capa e resumo</CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <ImageField
                  label="Capa"
                  hint="Aparece na lista do blog e ao compartilhar o post."
                  value={fields.cover}
                  onChange={(cover) => update({ cover })}
                  error={errors['cover']}
                />
                <TextAreaField
                  label="Resumo"
                  hint="Até 300 caracteres. Vazio: o site usa o começo do texto."
                  value={fields.excerpt}
                  maxLength={300}
                  onChange={(event) => update({ excerpt: event.target.value })}
                  error={errors['excerpt']}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>SEO</CardTitle>
                <CardDescription>Opcional. Vazio: o site usa o título e o resumo.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <TextField
                  label="Título para buscadores"
                  hint="Até 70 caracteres. Vazio: usa o título do post."
                  value={fields.seoTitle}
                  maxLength={70}
                  onChange={(event) => update({ seoTitle: event.target.value })}
                  error={errors['seoTitle']}
                />
                <TextAreaField
                  label="Descrição para buscadores"
                  hint="Até 160 caracteres. Vazio: usa o resumo."
                  value={fields.seoDescription}
                  maxLength={160}
                  onChange={(event) => update({ seoDescription: event.target.value })}
                  error={errors['seoDescription']}
                />
              </CardContent>
            </Card>

            {edit && (
              <ConfirmDialog
                title="Mover este post para a lixeira?"
                description="Ele sai do site. Dá para restaurar depois, na aba Lixeira."
                confirmLabel="Mover para a lixeira"
                onConfirm={() => submit('trash')}
                trigger={
                  <Button
                    variant="outline"
                    className="text-error-foreground hover:bg-error/12 hover:text-error-foreground w-full"
                    disabled={saving}
                  >
                    <Trash2Icon aria-hidden="true" />
                    Mover para a lixeira
                  </Button>
                }
              />
            )}
          </aside>
        </div>
      </form>
    </MediaLibrary.Provider>
  );
}

function TrashedPost({ edit }: { edit: PostEdit }) {
  const fetcher = useFetcher();
  return (
    <div className="max-w-xl space-y-4">
      <Alert>
        “{edit.post.title}” está na lixeira e não aparece no site. Restaure para voltar a editá-lo.
      </Alert>
      <Button
        loading={fetcher.state !== 'idle'}
        onClick={() =>
          void fetcher.submit(
            { intent: 'restore' },
            { method: 'post', encType: 'application/json' },
          )
        }
      >
        Restaurar
      </Button>
    </div>
  );
}

export function Component() {
  const { edit } = useLoaderData<typeof loader>();

  return (
    <div className="space-y-6">
      <PageHeader
        title={edit ? 'Editar post' : 'Novo post'}
        crumbs={[
          { label: 'Blog' },
          { label: 'Posts', to: '/posts' },
          { label: edit ? 'Editar' : 'Novo' },
        ]}
      />
      {edit?.post.deletedAt ? (
        <TrashedPost edit={edit} />
      ) : (
        // key: outro post (ou o mesmo restaurado) recomeça o formulário do zero
        <PostEditor
          key={edit ? `${edit.post.id}-${edit.post.deletedAt ?? ''}` : 'new'}
          edit={edit}
        />
      )}
    </div>
  );
}
