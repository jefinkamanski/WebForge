import nodemailer, { type Transporter } from 'nodemailer';
import type { Env } from '../../config/env.js';

// Envio de e-mail do NÚCLEO (SMTP via nodemailer). Hoje usado pelos formulários; é o
// mesmo caminho para futuros e-mails de conta (confirmação, recuperação de senha).
// Ver docs/EMAIL.md.

export interface MailMessage {
  to: string;
  subject: string;
  text: string;
  html: string;
  replyTo?: string;
}

export interface Mailer {
  // false sem SMTP configurado: send() não faz nada
  readonly enabled: boolean;
  send(message: MailMessage): Promise<void>;
}

export type MailConfig = Pick<
  Env,
  'SMTP_HOST' | 'SMTP_PORT' | 'SMTP_SECURE' | 'SMTP_USER' | 'SMTP_PASSWORD' | 'MAIL_FROM'
>;

// `transport` permite trocar o SMTP nos testes (ex.: jsonTransport do nodemailer)
export function createMailer(config: MailConfig, transport?: Transporter): Mailer {
  if (!config.SMTP_HOST || !config.MAIL_FROM) {
    let warned = false;
    return {
      enabled: false,
      send() {
        if (!warned) {
          console.warn('E-mail desligado: defina SMTP_HOST e MAIL_FROM para enviar mensagens.');
          warned = true;
        }
        return Promise.resolve();
      },
    };
  }

  const transporter =
    transport ??
    nodemailer.createTransport({
      host: config.SMTP_HOST,
      port: config.SMTP_PORT,
      secure: config.SMTP_SECURE,
      tls: { rejectUnauthorized: true },
      ...(config.SMTP_USER && { auth: { user: config.SMTP_USER, pass: config.SMTP_PASSWORD } }),
      // Servidor de e-mail lento não pode segurar a API
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 20_000,
    });
  const from = config.MAIL_FROM;

  return {
    enabled: true,
    async send(message) {
      await transporter.sendMail({ from, ...message });
    },
  };
}

// Dispara sem esperar a resposta do servidor de e-mail. Uma falha só vira aviso no log,
// sem destinatário nem conteúdo (dados pessoais ficam fora dos logs).
export function sendInBackground(mailer: Mailer, message: MailMessage, label: string): void {
  mailer.send(message).catch((error: unknown) => {
    console.warn(`E-mail "${label}" não enviado. ${describeMailError(error)}`);
  });
}

interface SmtpError {
  code?: unknown;
  response?: unknown;
  message?: unknown;
}

const EMAIL_LIKE = /[^\s<>"'@]+@[^\s<>"'@]+/g;

// Explica a falha do nodemailer em português, com a resposta do servidor sem endereços de e-mail
export function describeMailError(error: unknown): string {
  const { code, response, message } = (
    typeof error === 'object' && error !== null ? error : {}
  ) as SmtpError;
  const detail = String(response ?? message ?? '')
    .replace(EMAIL_LIKE, '[e-mail]')
    .slice(0, 200)
    .trim();

  let hint = 'Confira as variáveis SMTP.';
  if (code === 'EAUTH') {
    hint =
      'Usuário ou senha recusados. Gmail exige senha de app; contas pessoais do Outlook/Hotmail/Live não aceitam login por senha no SMTP.';
  } else if (/wrong version number/i.test(detail)) {
    hint = 'Porta e SMTP_SECURE não combinam: SMTP_SECURE=false na 587, true na 465.';
  } else if (code === 'EENVELOPE' || code === 'EMESSAGE') {
    hint = 'Remetente ou destinatário recusado: MAIL_FROM deve ser o mesmo e-mail do SMTP_USER.';
  } else if (code === 'ETIMEDOUT' || code === 'ECONNECTION' || code === 'EDNS') {
    hint =
      'Sem conexão com o servidor: confira SMTP_HOST e SMTP_PORT (a rede pode bloquear a porta).';
  }

  return [hint, detail && `Resposta: ${detail}`].filter(Boolean).join(' ');
}

const HTML_ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

export const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (char) => HTML_ESCAPES[char] ?? char);

// Moldura simples, legível em qualquer cliente de e-mail
export function emailLayout(title: string, bodyHtml: string): string {
  return `<!doctype html><html lang="pt-BR"><body style="margin:0;padding:24px;background:#f8fafc;font-family:Arial,sans-serif;color:#0f172a"><div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:8px;padding:24px"><h1 style="margin:0 0 16px;font-size:20px">${escapeHtml(title)}</h1>${bodyHtml}</div></body></html>`;
}
