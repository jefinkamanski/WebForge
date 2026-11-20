import { describe, expect, it } from 'vitest';
import { REVALIDATE_SECRET_HEADER, handleRevalidate } from './revalidate';

const SECRET = 's'.repeat(40);

function request(body: unknown, secret: string | null = SECRET) {
  return new Request('http://site.test/api/revalidate', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(secret !== null && { [REVALIDATE_SECRET_HEADER]: secret }),
    },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}

// null = REVALIDATE_SECRET não configurado no site
async function run(req: Request, secret: string | null = SECRET) {
  const tags: string[] = [];
  const response = await handleRevalidate(req, secret ?? undefined, (tag) => tags.push(tag));
  return { status: response.status, body: (await response.json()) as unknown, tags };
}

describe('handleRevalidate', () => {
  it('revalidates the requested tags with the right secret', async () => {
    const result = await run(request({ tags: ['section:hero', 'site'] }));

    expect(result).toEqual({
      status: 200,
      body: { revalidated: ['section:hero', 'site'] },
      tags: ['section:hero', 'site'],
    });
  });

  it('refuses a missing or wrong secret without revalidating', async () => {
    expect(await run(request({ tags: ['site'] }, null))).toMatchObject({ status: 401, tags: [] });
    expect(await run(request({ tags: ['site'] }, 'errado'))).toMatchObject({
      status: 401,
      tags: [],
    });
  });

  it('is disabled while REVALIDATE_SECRET is not configured', async () => {
    expect(await run(request({ tags: ['site'] }), null)).toMatchObject({ status: 503 });
  });

  it('rejects invalid bodies and tags', async () => {
    for (const body of ['nao-e-json', {}, { tags: [] }, { tags: ['<script>'] }]) {
      expect(await run(request(body))).toMatchObject({ status: 400, tags: [] });
    }
  });
});
