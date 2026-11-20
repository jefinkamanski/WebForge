import type { FormSubmission } from '@webforge/shared';
import { emailLayout, escapeHtml, type MailMessage } from '../mail/mailer.js';

interface EmailContext {
  siteName: string;
  formLabel: string;
}

// Aviso para o e-mail configurado no painel, com tudo o que foi preenchido.
// "Responder" vai direto para quem preencheu.
export function notificationEmail(
  { siteName, formLabel }: EmailContext,
  values: FormSubmission['values'],
  to: string,
  replyTo: string,
): MailMessage {
  const subject = `[${siteName}] Novo envio: ${formLabel}`;
  const text = [
    `Novo envio do formulário "${formLabel}".`,
    '',
    ...values.map(({ label, value }) => `${label}: ${value || '-'}`),
    '',
    'Responda este e-mail para falar com quem preencheu.',
  ].join('\n');
  const rows = values
    .map(
      ({ label, value }) =>
        `<tr><th style="text-align:left;vertical-align:top;padding:6px 12px 6px 0;white-space:nowrap">${escapeHtml(label)}</th><td style="padding:6px 0;white-space:pre-wrap">${escapeHtml(value || '-')}</td></tr>`,
    )
    .join('');
  const html = emailLayout(
    `Novo envio: ${formLabel}`,
    `<table style="border-collapse:collapse;font-size:14px">${rows}</table><p style="margin-top:16px;font-size:13px;color:#475569">Responda este e-mail para falar com quem preencheu.</p>`,
  );
  return { to, subject, text, html, replyTo };
}

// Confirmação para quem preencheu. De propósito, não repete nada do que a pessoa
// escreveu: assim o formulário não serve para mandar texto de terceiros a qualquer
// endereço (spam usando o site).
export function confirmationEmail(
  { siteName, formLabel }: EmailContext,
  to: string,
  replyTo?: string,
): MailMessage {
  const subject = `Recebemos sua mensagem – ${siteName}`;
  const message = `Recebemos o seu envio pelo formulário "${formLabel}" e vamos responder em breve.`;
  const text = ['Olá!', '', message, '', `Se não foi você, ignore este e-mail.`, '', siteName].join(
    '\n',
  );
  const html = emailLayout(
    'Recebemos sua mensagem',
    `<p>Olá!</p><p>${escapeHtml(message)}</p><p style="font-size:13px;color:#475569">Se não foi você, ignore este e-mail.</p><p>${escapeHtml(siteName)}</p>`,
  );
  return { to, subject, text, html, ...(replyTo && { replyTo }) };
}

// Teste do envio, disparado pelo painel
export function testEmail({ siteName, formLabel }: EmailContext, to: string): MailMessage {
  const message = `Este é um teste do envio de e-mails do formulário "${formLabel}". Se chegou, está tudo certo.`;
  return {
    to,
    subject: `[${siteName}] Teste de e-mail`,
    text: message,
    html: emailLayout('Teste de e-mail', `<p>${escapeHtml(message)}</p>`),
  };
}
