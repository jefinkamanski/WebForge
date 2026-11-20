import type { FormSubmission, FormSummary, SubmissionList } from '@webforge/shared';
import nodemailer from 'nodemailer';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../../app.js';
import { createDb } from '../../db/client.js';
import {
  TEST_BCRYPT_COST,
  TEST_ORIGIN,
  fakeMailer,
  get,
  listen,
  loadTestEnv,
  post,
  readBody,
  resetAndBootstrap,
  send,
  signInAdmin,
  type ApiBody,
  type TestServer,
} from '../../test/helpers.js';
import { createMailer, describeMailError } from '../mail/mailer.js';

const env = loadTestEnv();

const filled = (overrides: Record<string, unknown> = {}) => ({
  name: 'Maria Souza',
  email: 'Maria@Exemplo.com',
  phone: '(11) 99999-0000',
  message: 'Gostaria de um orçamento para o meu site.',
  consent: true,
  ...overrides,
});

describe('forms', () => {
  const { pool, db } = createDb(env);
  const mailer = fakeMailer();
  const failingMailer = fakeMailer({ fail: true });
  let api: TestServer;
  let noMailApi: TestServer;
  let failingApi: TestServer;
  let limitedApi: TestServer;
  let cookie: string;

  const submit = (body: unknown, server = api) => post(server.baseUrl, '/site/forms/contact', body);
  const settings = (body: unknown, server = api) =>
    send('PUT', server.baseUrl, '/forms/contact/settings', body, cookie);
  const submissions = async (query = '') =>
    readBody<SubmissionList>(await get(api.baseUrl, `/forms/contact/submissions${query}`, cookie));

  beforeAll(async () => {
    const options = { env, db, bcryptCost: TEST_BCRYPT_COST };
    const generous = { windowMs: 60_000, limit: 1000 };
    api = await listen(createApp({ ...options, mailer, formRateLimit: generous }));
    noMailApi = await listen(createApp({ ...options, formRateLimit: generous }));
    failingApi = await listen(
      createApp({ ...options, mailer: failingMailer, formRateLimit: generous }),
    );
    limitedApi = await listen(
      createApp({ ...options, formRateLimit: { windowMs: 60_000, limit: 2 } }),
    );
  });

  beforeEach(async () => {
    await resetAndBootstrap(env);
    cookie = await signInAdmin(api.baseUrl);
    mailer.sent.length = 0;
  });

  afterAll(async () => {
    await Promise.all([api.close(), noMailApi.close(), failingApi.close(), limitedApi.close()]);
    await pool.end();
  });

  describe('public submission', () => {
    it('validates the fields and requires consent', async () => {
      const response = await submit(filled({ name: 'A', email: 'nao-e-email', consent: false }));
      const body = await readBody<ApiBody>(response);

      expect(response.status).toBe(400);
      expect(Object.keys(body.error?.fields ?? {}).sort()).toEqual(['consent', 'email', 'name']);
      expect((await submissions()).total).toBe(0);
    });

    it('stores the submission, accepting the site origin, and shows it in the panel', async () => {
      const response = await fetch(`${api.baseUrl}/site/forms/contact`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', origin: TEST_ORIGIN },
        body: JSON.stringify(filled({ phone: undefined })),
      });
      const list = await submissions();

      expect(response.status).toBe(201);
      expect(list.total).toBe(1);
      expect(list.items[0]).toMatchObject({
        formKey: 'contact',
        readAt: null,
        values: [
          { name: 'name', label: 'Nome', value: 'Maria Souza' },
          { name: 'email', label: 'E-mail', value: 'maria@exemplo.com' },
          { name: 'phone', label: 'Telefone', value: '' },
          {
            name: 'message',
            label: 'Mensagem',
            value: 'Gostaria de um orçamento para o meu site.',
          },
        ],
      });
    });

    it('sends the notification to the panel e-mail and a confirmation to whoever filled the form', async () => {
      await settings({ notifyEmail: 'Vendas@Cliente.com', sendConfirmation: true });
      await submit(filled({ message: 'Mensagem com <b>HTML</b> e um link http://spam.example' }));

      expect(mailer.sent).toHaveLength(2);
      const [notification, confirmation] = mailer.sent;
      expect(notification).toMatchObject({
        to: 'vendas@cliente.com',
        replyTo: 'maria@exemplo.com',
        subject: '[Meu site] Novo envio: Contato',
      });
      expect(notification?.text).toContain('Mensagem: Mensagem com <b>HTML</b>');
      expect(notification?.html).toContain('Mensagem com &lt;b&gt;HTML&lt;/b&gt;');
      expect(notification?.html).not.toContain('<b>HTML</b>');

      expect(confirmation).toMatchObject({
        to: 'maria@exemplo.com',
        replyTo: 'vendas@cliente.com',
        subject: 'Recebemos sua mensagem – Meu site',
      });
      // A confirmação nunca repete o que foi escrito (o formulário não vira canal de spam)
      for (const part of [confirmation?.text, confirmation?.html]) {
        expect(part).not.toContain('spam.example');
        expect(part).not.toContain('Maria');
      }
    });

    it('skips the notification without a panel e-mail, and the confirmation when turned off', async () => {
      await submit(filled());
      expect(mailer.sent.map((message) => message.to)).toEqual(['maria@exemplo.com']);

      mailer.sent.length = 0;
      await settings({ notifyEmail: 'vendas@cliente.com', sendConfirmation: false });
      await submit(filled());
      expect(mailer.sent.map((message) => message.to)).toEqual(['vendas@cliente.com']);
    });

    it('still stores the submission when e-mail fails or is not configured', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
      await settings({ notifyEmail: 'vendas@cliente.com', sendConfirmation: true });

      expect((await submit(filled(), failingApi)).status).toBe(201);
      expect((await submit(filled(), noMailApi)).status).toBe(201);
      await vi.waitFor(() =>
        expect(warn).toHaveBeenCalledWith(
          expect.stringContaining('E-mail "aviso do formulário contact" não enviado.'),
        ),
      );
      // O log nunca leva destinatário nem conteúdo
      expect(warn.mock.calls.flat().join(' ')).not.toContain('@');
      expect((await submissions()).total).toBe(2);
      warn.mockRestore();
    });

    it('accepts and silently drops submissions with the honeypot filled', async () => {
      const response = await submit(filled({ website: 'http://robo.example' }));

      expect(response.status).toBe(201);
      expect((await submissions()).total).toBe(0);
      expect(mailer.sent).toEqual([]);
    });

    it('limits submissions per IP and answers 404 for unknown forms', async () => {
      expect((await submit(filled(), limitedApi)).status).toBe(201);
      expect((await submit(filled(), limitedApi)).status).toBe(201);
      const blocked = await submit(filled(), limitedApi);

      expect(blocked.status).toBe(429);
      expect(await readBody(blocked)).toMatchObject({ error: { code: 'TOO_MANY_SUBMISSIONS' } });
      expect((await post(api.baseUrl, '/site/forms/naoexiste', filled())).status).toBe(404);
    });
  });

  describe('panel', () => {
    it('requires an admin session', async () => {
      expect((await get(api.baseUrl, '/forms')).status).toBe(401);
      expect((await get(api.baseUrl, '/forms/contact/submissions')).status).toBe(401);
    });

    it('lists the forms with totals, unread counts and settings', async () => {
      await submit(filled());
      await submit(filled());
      const [first] = (await submissions()).items;
      await send(
        'PATCH',
        api.baseUrl,
        `/forms/contact/submissions/${first?.id}`,
        { read: true },
        cookie,
      );

      const forms = await readBody<FormSummary[]>(await get(api.baseUrl, '/forms', cookie));
      expect(forms).toEqual([
        {
          key: 'contact',
          label: 'Contato',
          total: 2,
          unread: 1,
          settings: { notifyEmail: '', sendConfirmation: true },
          mailEnabled: true,
        },
      ]);
      expect((await submissions('?unread=true')).total).toBe(1);
    });

    it('marks as read or unread and deletes for good', async () => {
      await submit(filled());
      const [item] = (await submissions()).items;
      const path = `/forms/contact/submissions/${item?.id}`;

      const read = await readBody<FormSubmission>(
        await send('PATCH', api.baseUrl, path, { read: true }, cookie),
      );
      expect(read.readAt).not.toBeNull();
      const unread = await readBody<FormSubmission>(
        await send('PATCH', api.baseUrl, path, { read: false }, cookie),
      );
      expect(unread.readAt).toBeNull();

      const removed = await fetch(`${api.baseUrl}${path}`, {
        method: 'DELETE',
        headers: { cookie },
      });
      expect(removed.status).toBe(204);
      expect((await submissions()).total).toBe(0);
      expect((await send('PATCH', api.baseUrl, path, { read: true }, cookie)).status).toBe(404);
    });

    it('validates the settings', async () => {
      const invalid = await readBody<ApiBody>(await settings({ notifyEmail: 'nao-e-email' }));
      const cleared = await readBody(await settings({ notifyEmail: '', sendConfirmation: false }));

      expect(Object.keys(invalid.error?.fields ?? {})).toEqual(['notifyEmail']);
      expect(cleared).toEqual({ notifyEmail: '', sendConfirmation: false });
    });

    it('sends a test e-mail only when e-mail and the panel address are configured', async () => {
      const disabled = await post(noMailApi.baseUrl, '/forms/contact/test-email', {}, cookie);
      const noAddress = await post(api.baseUrl, '/forms/contact/test-email', {}, cookie);
      await settings({ notifyEmail: 'vendas@cliente.com', sendConfirmation: true });
      const sent = await post(api.baseUrl, '/forms/contact/test-email', {}, cookie);
      const refused = await post(failingApi.baseUrl, '/forms/contact/test-email', {}, cookie);

      expect(disabled.status).toBe(503);
      expect(noAddress.status).toBe(400);
      expect(await readBody(sent)).toEqual({ to: 'vendas@cliente.com' });
      expect(mailer.sent).toMatchObject([
        { to: 'vendas@cliente.com', subject: '[Meu site] Teste de e-mail' },
      ]);
      expect(refused.status).toBe(502);
    });
  });
});

describe('mailer', () => {
  it('stays off without SMTP_HOST and builds messages with the configured sender', async () => {
    const off = createMailer({ SMTP_PORT: 587, SMTP_SECURE: false });
    const transport = nodemailer.createTransport({ jsonTransport: true });
    const sendMail = vi.spyOn(transport, 'sendMail');
    const on = createMailer(
      {
        SMTP_HOST: 'smtp.test',
        SMTP_PORT: 587,
        SMTP_SECURE: false,
        MAIL_FROM: 'Site <site@cliente.com>',
      },
      transport,
    );
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    await off.send({ to: 'a@b.com', subject: 'x', text: 'x', html: 'x' });
    await on.send({ to: 'a@b.com', subject: 'Assunto', text: 'Texto', html: '<p>Texto</p>' });

    expect(
      describeMailError({
        code: 'EAUTH',
        response: '535 5.7.3 Authentication unsuccessful for fulano@live.com',
      }),
    ).toMatch(/^Usuário ou senha recusados.*Resposta: 535 5\.7\.3 .* for \[e-mail\]$/);
    expect(off.enabled).toBe(false);
    expect(on.enabled).toBe(true);
    expect(sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        from: 'Site <site@cliente.com>',
        to: 'a@b.com',
        subject: 'Assunto',
      }),
    );
    warn.mockRestore();
  });
});
