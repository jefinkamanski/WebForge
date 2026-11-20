'use client';

import { CONSENT_FIELD, HONEYPOT_FIELD } from '@webforge/shared/form-fields';
import { useId, useState, type FormEvent, type ReactNode } from 'react';
import { submitForm, type SubmitResult } from '@/core/submitForm';

// Formulário de contato. Componente de cliente: precisa de JS para enviar e mostrar
// os erros sem recarregar a página.

const inputClass =
  'border-line bg-surface text-ink block w-full rounded-md border px-3 py-2 focus:border-brand-600 focus:outline-2 focus:outline-brand-600 aria-[invalid=true]:border-red-600';

interface FieldProps {
  name: string;
  label: string;
  error: string | undefined;
  hint?: string;
  children: (props: {
    id: string;
    'aria-invalid'?: true;
    'aria-describedby'?: string;
  }) => ReactNode;
}

function Field({ name, label, error, hint, children }: FieldProps) {
  const id = `${useId()}-${name}`;
  const describedBy = [hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(' ');
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="text-ink block text-sm font-medium">
        {label}
      </label>
      {children({
        id,
        ...(error && { 'aria-invalid': true as const }),
        ...(describedBy && { 'aria-describedby': describedBy }),
      })}
      {hint && (
        <p id={`${id}-hint`} className="text-ink-muted text-xs">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="text-sm font-medium text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}

export function ContactForm({ apiUrl }: { apiUrl: string }) {
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<SubmitResult | null>(null);
  const errors = result && !result.ok ? result.fields : {};

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = Object.fromEntries(new FormData(form));
    setSending(true);
    const sent = await submitForm(apiUrl, 'contact', {
      ...data,
      [CONSENT_FIELD]: data[CONSENT_FIELD] === 'on',
    });
    setSending(false);
    setResult(sent);
    if (sent.ok) form.reset();
  }

  if (result?.ok) {
    return (
      <div role="status" className="bg-brand-50 text-ink space-y-3 rounded-xl p-6">
        <p className="text-lg font-semibold">Mensagem enviada. Obrigado!</p>
        <p className="text-ink-muted">Vamos responder em breve no e-mail que você informou.</p>
        <button
          type="button"
          onClick={() => setResult(null)}
          className="text-brand-700 font-medium underline"
        >
          Enviar outra mensagem
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      {result && !result.ok && (
        <p role="alert" className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-800">
          {result.message}
        </p>
      )}

      <Field name="name" label="Nome" error={errors['name']}>
        {(props) => (
          <input
            {...props}
            name="name"
            autoComplete="name"
            required
            maxLength={120}
            className={inputClass}
          />
        )}
      </Field>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field name="email" label="E-mail" error={errors['email']}>
          {(props) => (
            <input
              {...props}
              name="email"
              type="email"
              autoComplete="email"
              required
              maxLength={255}
              className={inputClass}
            />
          )}
        </Field>
        <Field name="phone" label="Telefone (opcional)" error={errors['phone']}>
          {(props) => (
            <input
              {...props}
              name="phone"
              type="tel"
              autoComplete="tel"
              maxLength={30}
              className={inputClass}
            />
          )}
        </Field>
      </div>
      <Field name="message" label="Mensagem" error={errors['message']}>
        {(props) => (
          <textarea
            {...props}
            name="message"
            rows={6}
            required
            maxLength={5000}
            className={inputClass}
          />
        )}
      </Field>

      {/* Armadilha para robôs: escondida de pessoas e de leitores de tela */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label>
          Não preencha este campo
          <input name={HONEYPOT_FIELD} type="text" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      <div className="space-y-1">
        <label className="text-ink flex items-start gap-3 text-sm">
          <input
            name={CONSENT_FIELD}
            type="checkbox"
            required
            aria-invalid={errors[CONSENT_FIELD] ? true : undefined}
            className="accent-brand-600 mt-1 size-4"
          />
          <span>
            Concordo com o uso dos meus dados apenas para responder a este contato. Eles podem ser
            excluídos a qualquer momento, a meu pedido.
          </span>
        </label>
        {errors[CONSENT_FIELD] && (
          <p className="text-sm font-medium text-red-700">{errors[CONSENT_FIELD]}</p>
        )}
      </div>

      <button
        type="submit"
        disabled={sending}
        className="bg-brand-600 hover:bg-brand-700 rounded-md px-6 py-3 font-semibold text-white disabled:opacity-60"
      >
        {sending ? 'Enviando…' : 'Enviar mensagem'}
      </button>
      <noscript>
        <p className="text-ink-muted text-sm">Ative o JavaScript para enviar o formulário.</p>
      </noscript>
    </form>
  );
}
