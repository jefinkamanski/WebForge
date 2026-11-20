import {
  forms,
  formSettingsSchema,
  type AnyFormDefinition,
  type FormSubmission,
} from '@webforge/shared';
import { ChevronRightIcon, InboxIcon, MailIcon, SendIcon, Trash2Icon } from 'lucide-react';
import { Link, useFetcher, useLoaderData } from 'react-router';
import { ApiError } from '../../lib/api.ts';
import {
  Alert,
  Button,
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Checkbox,
  ConfirmDialog,
  PageHeader,
  Pagination,
  StatusBadge,
  TextField,
} from '../../ui/index.ts';
import { formatDate } from '../posts/posts.api.ts';
import {
  deleteSubmission,
  listForms,
  listSubmissions,
  sendTestEmail,
  setSubmissionRead,
  updateFormSettings,
} from './forms.api.ts';

const registry = forms as Record<string, AnyFormDefinition>;

function parseKey(value: string | undefined): string {
  if (!value || !Object.hasOwn(registry, value)) {
    throw new Response('Formulário não encontrado', { status: 404 });
  }
  return value;
}

export async function loader({ request, params }: { request: Request; params: { key?: string } }) {
  const key = parseKey(params.key);
  const search = new URL(request.url).searchParams;
  const unread = search.get('filtro') === 'nao-lidos';
  const page = Math.max(1, Number(search.get('page')) || 1);
  const [summaries, list] = await Promise.all([
    listForms(request.signal),
    listSubmissions(key, { page, unread }, request.signal),
  ]);
  const summary = summaries.find((form) => form.key === key);
  if (!summary) throw new Response('Formulário não encontrado', { status: 404 });
  return { key, summary, list, unread };
}

interface ActionResult {
  intent: string;
  id?: number;
  message?: string;
  success?: string;
  errors?: Record<string, string>;
}

export async function action({
  request,
  params,
}: {
  request: Request;
  params: { key?: string };
}): Promise<ActionResult> {
  const key = parseKey(params.key);
  const form = await request.formData();
  const intent = String(form.get('intent'));
  const id = Number(form.get('id'));

  try {
    switch (intent) {
      case 'settings': {
        const parsed = formSettingsSchema.safeParse({
          notifyEmail: String(form.get('notifyEmail') ?? ''),
          sendConfirmation: form.get('sendConfirmation') === 'on',
        });
        if (!parsed.success) {
          return { intent, errors: { notifyEmail: 'Informe um e-mail válido ou deixe vazio.' } };
        }
        await updateFormSettings(key, parsed.data);
        return { intent, success: 'Configurações salvas.' };
      }
      case 'test': {
        const { to } = await sendTestEmail(key);
        return {
          intent,
          success: `E-mail de teste enviado para ${to}. Confira a caixa de entrada (e o spam).`,
        };
      }
      case 'read':
      case 'unread':
        await setSubmissionRead(key, id, intent === 'read');
        return { intent, id };
      default:
        await deleteSubmission(key, id);
        return { intent: 'delete', id };
    }
  } catch (error) {
    if (error instanceof ApiError) {
      const field = error.fields['notifyEmail']?.[0];
      return {
        intent,
        id,
        message: error.message,
        ...(field && { errors: { notifyEmail: field } }),
      };
    }
    throw error;
  }
}

function Settings() {
  const { summary } = useLoaderData<typeof loader>();
  const save = useFetcher<ActionResult>();
  const test = useFetcher<ActionResult>();
  const busy = save.state !== 'idle' || test.state !== 'idle';

  return (
    <Card>
      <CardHeader>
        <CardTitle role="heading" aria-level={2}>
          E-mails
        </CardTitle>
        <CardDescription>Avisos de novos envios e confirmação para quem preencheu.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {!summary.mailEnabled && (
          <Alert>
            O envio de e-mails ainda não está configurado na API (variáveis SMTP). Os envios ficam
            salvos aqui mesmo assim.
          </Alert>
        )}
        <save.Form method="post" className="space-y-5" noValidate>
          <input type="hidden" name="intent" value="settings" />
          <TextField
            label="E-mail que recebe os avisos"
            name="notifyEmail"
            type="email"
            defaultValue={summary.settings.notifyEmail}
            hint="Cada envio chega neste e-mail; responder vai direto para quem preencheu. Vazio: sem aviso."
            error={save.data?.errors?.['notifyEmail']}
          />
          <label className="flex items-start gap-3 text-sm">
            <Checkbox
              name="sendConfirmation"
              defaultChecked={summary.settings.sendConfirmation}
              className="mt-0.5"
            />
            <span>
              Enviar confirmação para quem preencher
              <span className="text-muted-foreground block text-xs">
                Um e-mail curto avisando que a mensagem foi recebida.
              </span>
            </span>
          </label>
          {save.data?.message && <Alert tone="error">{save.data.message}</Alert>}
          {save.data?.success && save.state === 'idle' && (
            <Alert tone="success">{save.data.success}</Alert>
          )}
          <div className="flex flex-wrap gap-2">
            <Button type="submit" loading={save.state !== 'idle'} disabled={busy}>
              Salvar
            </Button>
          </div>
        </save.Form>

        <test.Form method="post" className="space-y-3 border-t pt-5">
          <input type="hidden" name="intent" value="test" />
          <p className="text-muted-foreground text-sm">
            Confira se os e-mails estão saindo: enviamos um teste para o e-mail de avisos salvo.
          </p>
          {test.data?.message && <Alert tone="error">{test.data.message}</Alert>}
          {test.data?.success && test.state === 'idle' && (
            <Alert tone="success">{test.data.success}</Alert>
          )}
          <Button type="submit" variant="outline" loading={test.state !== 'idle'} disabled={busy}>
            <SendIcon aria-hidden="true" />
            Enviar e-mail de teste
          </Button>
        </test.Form>
      </CardContent>
    </Card>
  );
}

function Submission({ item, emailField }: { item: FormSubmission; emailField: string }) {
  const fetcher = useFetcher<ActionResult>();
  const busy = fetcher.state !== 'idle';
  const unread = item.readAt === null;
  const [first, second] = item.values;
  const email = item.values.find((value) => value.name === emailField)?.value;

  return (
    <li>
      <details className="group">
        <summary className="hover:bg-accent/60 flex cursor-pointer list-none flex-wrap items-center gap-x-3 gap-y-1 px-4 py-4 [&::-webkit-details-marker]:hidden">
          <ChevronRightIcon
            className="text-muted-foreground size-4 shrink-0 transition-transform group-open:rotate-90"
            aria-hidden="true"
          />
          <span className={unread ? 'font-semibold' : ''}>{first?.value || 'Sem nome'}</span>
          {second && <span className="text-muted-foreground text-sm">{second.value}</span>}
          {unread && <StatusBadge tone="warning">Não lido</StatusBadge>}
          <span className="text-muted-foreground ml-auto text-xs">
            {formatDate(item.createdAt)}
          </span>
        </summary>
        <div className="bg-muted/60 space-y-4 border-t px-4 py-4 sm:pl-11">
          <dl className="grid gap-3 sm:grid-cols-[10rem_1fr]">
            {item.values.map((value) => (
              <div key={value.name} className="contents">
                <dt className="text-muted-foreground text-sm font-medium">{value.label}</dt>
                <dd className="text-sm whitespace-pre-wrap">{value.value || '—'}</dd>
              </div>
            ))}
          </dl>
          {fetcher.data?.message && <Alert tone="error">{fetcher.data.message}</Alert>}
          <div className="flex flex-wrap items-center gap-2">
            {email && (
              <Button asChild variant="secondary">
                <a href={`mailto:${email}`}>
                  <MailIcon aria-hidden="true" />
                  Responder por e-mail
                </a>
              </Button>
            )}
            <fetcher.Form method="post">
              <input type="hidden" name="id" value={item.id} />
              <Button
                type="submit"
                name="intent"
                value={unread ? 'read' : 'unread'}
                variant="outline"
                disabled={busy}
              >
                {unread ? 'Marcar como lido' : 'Marcar como não lido'}
              </Button>
            </fetcher.Form>
            <ConfirmDialog
              title="Excluir este envio?"
              description="Os dados de quem preencheu são apagados de vez. Não é possível desfazer."
              confirmLabel="Excluir"
              onConfirm={() =>
                void fetcher.submit({ intent: 'delete', id: String(item.id) }, { method: 'post' })
              }
              trigger={
                <Button
                  variant="outline"
                  className="text-error-foreground hover:bg-error/12 hover:text-error-foreground"
                  disabled={busy}
                >
                  <Trash2Icon aria-hidden="true" />
                  Excluir
                </Button>
              }
            />
          </div>
        </div>
      </details>
    </li>
  );
}

const listLink = (key: string, unread: boolean, page = 1) =>
  `/forms/${key}?${new URLSearchParams({ ...(unread && { filtro: 'nao-lidos' }), page: String(page) }).toString()}`;

export function Component() {
  const { key, summary, list, unread } = useLoaderData<typeof loader>();
  const definition = registry[key];
  const pages = Math.max(1, Math.ceil(list.total / list.pageSize));

  return (
    <div className="space-y-6">
      <PageHeader
        title={summary.label}
        crumbs={[{ label: 'Formulários' }, { label: summary.label }]}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:max-w-xl">
        <div className="bg-primary/12 rounded-lg p-5">
          <p className="text-secondary-foreground text-sm font-semibold">Envios</p>
          <p className="text-secondary-foreground text-lg font-semibold">{summary.total}</p>
        </div>
        <div className="bg-warning/12 rounded-lg p-5">
          <p className="text-warning-foreground text-sm font-semibold">Não lidos</p>
          <p className="text-warning-foreground text-lg font-semibold">{summary.unread}</p>
        </div>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-12">
        <Card className="lg:col-span-8">
          <CardHeader>
            <CardTitle role="heading" aria-level={2}>
              Envios
            </CardTitle>
            <CardAction>
              <nav aria-label="Filtrar envios" className="flex gap-2">
                {[
                  { label: 'Todos', value: false },
                  { label: 'Não lidos', value: true },
                ].map((option) => (
                  <Button
                    key={option.label}
                    asChild
                    size="sm"
                    variant={option.value === unread ? 'default' : 'outline'}
                    className="rounded-full"
                  >
                    <Link
                      to={listLink(key, option.value)}
                      aria-current={option.value === unread ? 'page' : undefined}
                    >
                      {option.label}
                    </Link>
                  </Button>
                ))}
              </nav>
            </CardAction>
          </CardHeader>
          <CardContent className="space-y-4">
            {list.items.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-10 text-center">
                <InboxIcon className="text-muted-foreground size-10" aria-hidden="true" />
                <p className="text-base font-semibold">
                  {unread ? 'Nenhum envio não lido' : 'Nenhum envio ainda'}
                </p>
              </div>
            ) : (
              <ul className="divide-y overflow-hidden rounded-md border">
                {list.items.map((item) => (
                  <Submission key={item.id} item={item} emailField={definition?.emailField ?? ''} />
                ))}
              </ul>
            )}

            <Pagination
              page={list.page}
              pages={pages}
              hrefFor={(page) => listLink(key, unread, page)}
            />
            <p className="text-muted-foreground text-xs">
              LGPD: exclua os envios que não forem mais necessários ou quando a pessoa pedir.
            </p>
          </CardContent>
        </Card>

        <div className="lg:col-span-4">
          <Settings />
        </div>
      </div>
    </div>
  );
}
