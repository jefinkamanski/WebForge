export interface Revalidator {
  revalidate(tags: string[]): Promise<void>;
}

export interface RevalidatorOptions {
  webUrl: string | undefined;
  secret: string | undefined;
  timeoutMs?: number;
}

// Pede ao site (Next.js) que regenere as tags alteradas. NUNCA lança: uma falha aqui
// não pode derrubar a requisição de quem salvou o conteúdo.
export function createRevalidator({
  webUrl,
  secret,
  timeoutMs = 3000,
}: RevalidatorOptions): Revalidator {
  let warnedMissingConfig = false;

  return {
    async revalidate(tags) {
      if (!webUrl || !secret) {
        if (!warnedMissingConfig) {
          console.warn('Revalidação do site desligada: defina WEB_URL e REVALIDATE_SECRET.');
          warnedMissingConfig = true;
        }
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
