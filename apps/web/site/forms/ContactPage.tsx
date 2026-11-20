import { env } from '@/core/env';
import { ContactForm } from './ContactForm';

// Página de contato: texto (Server Component) e o formulário (cliente)
export function ContactPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-8 px-6 py-16">
      <header className="space-y-3">
        <h1 className="text-ink text-4xl font-bold">Contato</h1>
        <p className="text-ink-muted text-lg">
          Envie sua mensagem pelo formulário abaixo. Respondemos no e-mail que você informar.
        </p>
      </header>
      <ContactForm apiUrl={env.API_PUBLIC_URL} />
    </div>
  );
}
