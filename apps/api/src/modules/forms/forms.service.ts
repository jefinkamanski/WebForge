import {
  formSettingsSchema,
  forms,
  type AnyFormDefinition,
  type FormKey,
  type FormSettings,
  type FormSubmission,
  type FormSummary,
  type SubmissionList,
} from '@webforge/shared';
import { and, count, desc, eq, isNull, sql } from 'drizzle-orm';
import type { Db } from '../../db/client.js';
import { formSettings, formSubmissions } from '../../db/schema.js';
import { HttpError } from '../../http/errors.js';
import { describeMailError, sendInBackground, type Mailer } from '../mail/mailer.js';
import { confirmationEmail, notificationEmail, testEmail } from './form-emails.js';

type SubmissionRow = typeof formSubmissions.$inferSelect;

const registry = forms as Record<FormKey, AnyFormDefinition>;

export function parseFormKey(value: unknown): FormKey {
  if (typeof value !== 'string' || !Object.hasOwn(registry, value)) {
    throw new HttpError(404, 'FORM_NOT_FOUND', 'Formulário não encontrado.');
  }
  return value as FormKey;
}

// Em MariaDB a coluna JSON é texto
function readData(row: SubmissionRow): Record<string, unknown> {
  try {
    const raw: unknown = typeof row.data === 'string' ? JSON.parse(row.data) : row.data;
    return typeof raw === 'object' && raw !== null ? (raw as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

// Valores na ordem dos campos da definição, como texto (o consentimento fica de fora)
function toValues(definition: AnyFormDefinition, data: Record<string, unknown>) {
  return Object.entries(definition.fields).map(([name, field]) => {
    const value = data[name];
    return {
      name,
      label: field.label,
      value: value === undefined || value === null ? '' : String(value),
    };
  });
}

function toSubmission(row: SubmissionRow): FormSubmission {
  const definition = registry[row.formKey as FormKey];
  return {
    id: row.id,
    formKey: row.formKey,
    values: definition ? toValues(definition, readData(row)) : [],
    readAt: row.readAt ? row.readAt.toISOString() : null,
    createdAt: row.createdAt.toISOString(),
  };
}

export interface FormsServiceDeps {
  db: Db;
  mailer: Mailer;
  // Nome do site (seção SEO global), usado nos e-mails
  getSiteName: () => Promise<string>;
}

export function createFormsService({ db, mailer, getSiteName }: FormsServiceDeps) {
  async function getSettings(key: FormKey): Promise<FormSettings> {
    const [row] = await db
      .select()
      .from(formSettings)
      .where(eq(formSettings.formKey, key))
      .limit(1);
    return row
      ? { notifyEmail: row.notifyEmail, sendConfirmation: row.sendConfirmation }
      : formSettingsSchema.parse({});
  }

  async function findSubmission(key: FormKey, id: number): Promise<SubmissionRow> {
    const [row] = await db
      .select()
      .from(formSubmissions)
      .where(and(eq(formSubmissions.id, id), eq(formSubmissions.formKey, key)))
      .limit(1);
    if (!row) throw new HttpError(404, 'SUBMISSION_NOT_FOUND', 'Envio não encontrado.');
    return row;
  }

  return {
    // Envio público: valida, grava e dispara os e-mails sem esperar por eles
    async submit(key: FormKey, body: unknown): Promise<void> {
      const definition = registry[key];
      const data = definition.schema.parse(body) as Record<string, unknown>;
      await db.insert(formSubmissions).values({ formKey: key, data });

      if (!mailer.enabled) return;
      const [settings, siteName] = await Promise.all([getSettings(key), getSiteName()]);
      const context = { siteName, formLabel: definition.label };
      const submitterEmail = String(data[definition.emailField]);

      if (settings.notifyEmail) {
        sendInBackground(
          mailer,
          notificationEmail(
            context,
            toValues(definition, data),
            settings.notifyEmail,
            submitterEmail,
          ),
          `aviso do formulário ${key}`,
        );
      }
      if (settings.sendConfirmation) {
        sendInBackground(
          mailer,
          confirmationEmail(context, submitterEmail, settings.notifyEmail || undefined),
          `confirmação do formulário ${key}`,
        );
      }
    },

    async list(): Promise<FormSummary[]> {
      const totals = await db
        .select({
          formKey: formSubmissions.formKey,
          total: count(),
          unread: sql<number>`sum(case when ${formSubmissions.readAt} is null then 1 else 0 end)`,
        })
        .from(formSubmissions)
        .groupBy(formSubmissions.formKey);
      const byKey = new Map(totals.map((row) => [row.formKey, row]));

      return Promise.all(
        (Object.keys(registry) as FormKey[]).map(async (key) => ({
          key,
          label: registry[key].label,
          total: byKey.get(key)?.total ?? 0,
          unread: Number(byKey.get(key)?.unread ?? 0),
          settings: await getSettings(key),
          mailEnabled: mailer.enabled,
        })),
      );
    },

    async submissions(
      key: FormKey,
      { page, pageSize, unread }: { page: number; pageSize: number; unread?: boolean | undefined },
    ): Promise<SubmissionList> {
      const where = and(
        eq(formSubmissions.formKey, key),
        unread ? isNull(formSubmissions.readAt) : undefined,
      );
      const [totals] = await db.select({ total: count() }).from(formSubmissions).where(where);
      const rows = await db
        .select()
        .from(formSubmissions)
        .where(where)
        .orderBy(desc(formSubmissions.createdAt), desc(formSubmissions.id))
        .limit(pageSize)
        .offset((page - 1) * pageSize);
      return { items: rows.map(toSubmission), page, pageSize, total: totals?.total ?? 0 };
    },

    async setRead(key: FormKey, id: number, read: boolean): Promise<FormSubmission> {
      await findSubmission(key, id);
      await db
        .update(formSubmissions)
        .set({ readAt: read ? new Date() : null })
        .where(eq(formSubmissions.id, id));
      return toSubmission(await findSubmission(key, id));
    },

    // Exclusão definitiva (LGPD: o titular pode pedir que os dados sejam apagados)
    async remove(key: FormKey, id: number): Promise<void> {
      await findSubmission(key, id);
      await db.delete(formSubmissions).where(eq(formSubmissions.id, id));
    },

    getSettings,

    async updateSettings(key: FormKey, body: unknown): Promise<FormSettings> {
      const settings = formSettingsSchema.parse(body);
      await db
        .insert(formSettings)
        .values({ formKey: key, ...settings })
        .onDuplicateKeyUpdate({ set: settings });
      return settings;
    },

    // Envia na hora (e espera) um e-mail de teste para o endereço configurado
    async sendTest(key: FormKey): Promise<{ to: string }> {
      if (!mailer.enabled) {
        throw new HttpError(
          503,
          'MAIL_DISABLED',
          'O envio de e-mails não está configurado na API.',
        );
      }
      const { notifyEmail } = await getSettings(key);
      if (!notifyEmail) {
        throw new HttpError(
          400,
          'NO_NOTIFY_EMAIL',
          'Salve um e-mail para receber os avisos antes de testar.',
        );
      }
      const context = { siteName: await getSiteName(), formLabel: registry[key].label };
      try {
        await mailer.send(testEmail(context, notifyEmail));
      } catch (error) {
        throw new HttpError(
          502,
          'MAIL_FAILED',
          `O servidor de e-mail recusou o envio. ${describeMailError(error)}`,
        );
      }
      return { to: notifyEmail };
    },
  };
}

export type FormsService = ReturnType<typeof createFormsService>;
