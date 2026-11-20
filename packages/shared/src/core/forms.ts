import { z } from 'zod';
import type { forms } from '../site/index.js';
import { CONSENT_FIELD, HONEYPOT_FIELD } from './form-fields.js';

// ===== Definição de formulários =====

export interface FormField<S extends z.ZodType = z.ZodType> {
  // Nome do campo nos e-mails e no painel
  label: string;
  schema: S;
}

export const formField = <S extends z.ZodType>(label: string, schema: S): FormField<S> => ({
  label,
  schema,
});

// E-mail de quem preenche (recebe a confirmação)
export const emailFieldSchema = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email('Informe um e-mail válido.').max(255));

export { CONSENT_FIELD, HONEYPOT_FIELD } from './form-fields.js';
export const CONSENT_MESSAGE = 'Para enviar, concorde com o uso dos seus dados para o contato.';

type Fields = Record<string, FormField>;

type FormSchema<F extends Fields> = z.ZodObject<
  { [K in keyof F]: F[K]['schema'] } & { consent: z.ZodLiteral<true> }
>;

export interface FormDefinition<K extends string = string, F extends Fields = Fields> {
  key: K;
  // Nome exibido no painel e no assunto dos e-mails
  label: string;
  fields: F;
  // Campo com o e-mail de quem preenche
  emailField: keyof F & string;
  // Campos + consentimento, validado na API
  schema: FormSchema<F>;
}

// Forma comum a todos os formulários (para o registro e para quem lê qualquer um deles)
export interface AnyFormDefinition {
  key: string;
  label: string;
  fields: Fields;
  emailField: string;
  schema: z.ZodObject;
}

const FORM_KEY = /^[a-z][a-zA-Z0-9]*$/;

export function defineForm<const K extends string, F extends Fields>({
  key,
  label,
  fields,
  emailField,
}: {
  key: K;
  label: string;
  fields: F;
  emailField: keyof F & string;
}): FormDefinition<K, F> {
  if (!FORM_KEY.test(key)) {
    throw new Error(`Formulário "${key}": use uma chave em camelCase, sem espaços ou símbolos.`);
  }
  if (!Object.hasOwn(fields, emailField)) {
    throw new Error(`Formulário "${key}": o campo de e-mail "${emailField}" não existe.`);
  }
  if (Object.hasOwn(fields, HONEYPOT_FIELD) || Object.hasOwn(fields, CONSENT_FIELD)) {
    throw new Error(
      `Formulário "${key}": "${HONEYPOT_FIELD}" e "${CONSENT_FIELD}" são reservados.`,
    );
  }

  const shape: Record<string, z.ZodType> = {};
  for (const [name, field] of Object.entries(fields)) shape[name] = field.schema;
  shape[CONSENT_FIELD] = z.literal(true, CONSENT_MESSAGE);

  return { key, label, fields, emailField, schema: z.object(shape) as FormSchema<F> };
}

export function registerForms<const T extends readonly AnyFormDefinition[]>(
  ...definitions: T
): { [D in T[number] as D['key']]: D } {
  const registry: Record<string, AnyFormDefinition> = {};
  for (const definition of definitions) {
    if (Object.hasOwn(registry, definition.key)) {
      throw new Error(`Formulário "${definition.key}" registrado duas vezes.`);
    }
    registry[definition.key] = definition;
  }
  return registry as { [D in T[number] as D['key']]: D };
}

export type Forms = typeof forms;
export type FormKey = keyof Forms & string;

// ===== Configuração no painel =====

export const formSettingsSchema = z.object({
  // Quem recebe o aviso de cada envio (vazio = nenhum aviso por e-mail)
  notifyEmail: z.union([z.literal(''), emailFieldSchema]).default(''),
  // Envia um e-mail de confirmação para quem preencheu
  sendConfirmation: z.boolean().default(true),
});
export type FormSettings = z.output<typeof formSettingsSchema>;

export const listSubmissionsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
  unread: z.stringbool().optional(),
});

export const updateSubmissionSchema = z.object({ read: z.boolean() });

export interface FormSummary {
  key: string;
  label: string;
  total: number;
  unread: number;
  settings: FormSettings;
  // Os e-mails só saem com o SMTP configurado na API
  mailEnabled: boolean;
}

export interface FormSubmission {
  id: number;
  formKey: string;
  // Campo -> valor, na ordem da definição (o consentimento vale na data do envio)
  values: { name: string; label: string; value: string }[];
  readAt: string | null;
  createdAt: string;
}

export interface SubmissionList {
  items: FormSubmission[];
  page: number;
  pageSize: number;
  total: number;
}
