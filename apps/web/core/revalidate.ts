import { createHash, timingSafeEqual } from 'node:crypto';
import { z } from 'zod';

export const REVALIDATE_SECRET_HEADER = 'x-revalidate-secret';

const bodySchema = z.object({
  tags: z
    .array(
      z
        .string()
        .max(256)
        .regex(/^[a-z][a-zA-Z0-9:_-]*$/),
    )
    .min(1)
    .max(50),
});

// Compara em tempo constante (o hash iguala os tamanhos)
function sameSecret(provided: string, expected: string): boolean {
  const digest = (value: string) => createHash('sha256').update(value).digest();
  return timingSafeEqual(digest(provided), digest(expected));
}

const json = (status: number, body: unknown) => Response.json(body, { status });

// POST /api/revalidate, chamado pela API ao salvar conteúdo: { tags: ["section:hero"] }
export async function handleRevalidate(
  request: Request,
  secret: string | undefined,
  revalidate: (tag: string) => void,
): Promise<Response> {
  if (!secret) return json(503, { error: 'REVALIDATION_DISABLED' });
  if (!sameSecret(request.headers.get(REVALIDATE_SECRET_HEADER) ?? '', secret)) {
    return json(401, { error: 'INVALID_SECRET' });
  }

  const body = bodySchema.safeParse(await request.json().catch(() => null));
  if (!body.success) return json(400, { error: 'INVALID_TAGS' });

  for (const tag of body.data.tags) revalidate(tag);
  return json(200, { revalidated: body.data.tags });
}
