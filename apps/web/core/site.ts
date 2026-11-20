import {
  mapMedia,
  sections,
  type PostSlug,
  type PublicPost,
  type PublicPostList,
  type SectionDefinition,
  type SectionKey,
  type SiteContent,
} from '@webforge/shared';
import { env } from './env';

// Uma tag por seção: salvar uma seção no painel revalida só o que a usa.
// "site" revalida tudo de uma vez.
export const SITE_TAGS = ['site', ...Object.keys(sections).map((key) => `section:${key}`)];
// Lista, páginas dos posts e sitemap: qualquer mudança num post publicado revalida todos
const POSTS_TAGS = ['site', 'posts'];

export const POSTS_PER_PAGE = 12;

// Rede de segurança: mesmo sem revalidação sob demanda, o conteúdo se renova a cada hora
const SAFETY_REVALIDATE_SECONDS = 3600;

// Conteúdo padrão (dos .default() de cada seção), com as mídias vazias
function defaultSite(): SiteContent {
  const registry = sections as Record<SectionKey, SectionDefinition>;
  const site: Record<string, unknown> = {};
  for (const [key, definition] of Object.entries(registry)) {
    site[key] = mapMedia(definition.schema, definition.defaults, () => null);
  }
  return site as SiteContent;
}

const isBuild = () => process.env.NEXT_PHASE === 'phase-production-build';
let warnedBuildFallback = false;

class NotFoundError extends Error {}

// GET na API com cache por tags. Chamadas repetidas na mesma renderização (layout,
// página, metadata) viram uma requisição só.
async function apiGet<T>(path: string, tags: string[], buildFallback: () => T): Promise<T> {
  try {
    const response = await fetch(`${env.API_INTERNAL_URL}${path}`, {
      next: { tags, revalidate: SAFETY_REVALIDATE_SECONDS },
    });
    if (response.status === 404) throw new NotFoundError(path);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return (await response.json()) as T;
  } catch (error) {
    // No build, a API pode ainda não estar no ar: gera com o padrão e se corrige na
    // primeira revalidação. Fora do build, o erro mantém a última versão boa em cache.
    if (isBuild() && !(error instanceof NotFoundError)) {
      if (!warnedBuildFallback) {
        warnedBuildFallback = true;
        console.warn(
          `API indisponível no build (${error instanceof Error ? error.message : 'erro'}): ` +
            'páginas geradas com o conteúdo padrão até a próxima revalidação.',
        );
      }
      return buildFallback();
    }
    throw error;
  }
}

// Todas as seções, com as mídias resolvidas
export const getSite = () => apiGet<SiteContent>('/site', SITE_TAGS, defaultSite);

// Posts publicados, do mais novo para o mais antigo
export const getPosts = (page: number) =>
  apiGet<PublicPostList>(`/site/posts?page=${page}&pageSize=${POSTS_PER_PAGE}`, POSTS_TAGS, () => ({
    items: [],
    page,
    pageSize: POSTS_PER_PAGE,
    total: 0,
  }));

// Um post publicado, ou null se não existir (ou não estiver publicado)
export async function getPost(slug: string): Promise<PublicPost | null> {
  try {
    return await apiGet<PublicPost | null>(
      `/site/posts/${encodeURIComponent(slug)}`,
      POSTS_TAGS,
      () => null,
    );
  } catch (error) {
    if (error instanceof NotFoundError) return null;
    throw error;
  }
}

export const getPostSlugs = () => apiGet<PostSlug[]>('/site/posts/slugs', POSTS_TAGS, () => []);

// URLs de mídia vêm relativas à API (/uploads/...)
export const mediaUrl = (url: string) => `${env.API_PUBLIC_URL}${url}`;
