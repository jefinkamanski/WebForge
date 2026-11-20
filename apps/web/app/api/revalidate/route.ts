import { revalidateTag } from 'next/cache';
import { env } from '@/core/env';
import { handleRevalidate } from '@/core/revalidate';

// Expira na hora: quem salvou no painel já vê a mudança no próximo acesso
export function POST(request: Request) {
  return handleRevalidate(request, env.REVALIDATE_SECRET, (tag) =>
    revalidateTag(tag, { expire: 0 }),
  );
}
