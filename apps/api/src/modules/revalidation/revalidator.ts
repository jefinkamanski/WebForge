export interface Revalidator {
  revalidate(tags: string[]): Promise<void>;
}

export interface RevalidatorOptions {
  webUrl?: string | undefined;
  secret?: string | undefined;
  timeoutMs?: number;
}

// Pede ao Next.js que regenere as tags alteradas. NUNCA lança: falhar aqui não pode
// derrubar a requisição de quem salvou o conteúdo.
export function createRevalidator({
  webUrl,
  secret,
  timeoutMs = 2000,
}: RevalidatorOptions): Revalidator {
  return {
    async revalidate(tags) {
      if (!webUrl || !secret) {
        console.warn('Revalidação ignorada: defina WEB_URL e REVALIDATE_SECRET.');
        return;
      }

      try {
        const response = await fetch(new URL('/api/revalidate', webUrl), {
          method: 'POST',
          headers: { 'content-type': 'application/json', 'x-revalidate-secret': secret },
          body: JSON.stringify({ tags }),
          signal: AbortSignal.timeout(timeoutMs),
        });
        if (!response.ok) {
          console.warn(`Revalidação recusada pelo site (HTTP ${response.status}).`);
        }
      } catch (error) {
        console.warn(
          'Revalidação falhou:',
          error instanceof Error ? error.name : 'erro desconhecido',
        );
      }
    },
  };
}
