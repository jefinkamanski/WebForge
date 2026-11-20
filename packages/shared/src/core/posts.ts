import { z } from 'zod';
import type { ImageAsset, MediaItem } from './media.js';
import { HREF_MESSAGE, isSafeHref } from './sections.js';

// ===== Conteúdo do post (formato do editor visual do painel, TipTap) =====
// Só os elementos abaixo são aceitos: o site monta o HTML a partir deles, então nunca
// chega HTML nem atributo solto do navegador. `I` é o que a imagem carrega: o id da
// mídia no painel e na API, ou a imagem já resolvida no site.

export type Mark =
  { type: 'bold' } | { type: 'italic' } | { type: 'link'; attrs: { href: string } };

export interface TextNode {
  type: 'text';
  text: string;
  marks?: Mark[];
}

export type InlineNode = TextNode | { type: 'hardBreak' };

export interface ImageNode<I> {
  type: 'image';
  attrs: I;
}

export type BlockNode<I = { mediaId: number }> =
  | { type: 'paragraph'; content?: InlineNode[] }
  | { type: 'heading'; attrs: { level: 2 | 3 }; content?: InlineNode[] }
  | { type: 'bulletList' | 'orderedList'; content: ListItemNode<I>[] }
  | { type: 'blockquote'; content: BlockNode<I>[] }
  | { type: 'horizontalRule' }
  | ImageNode<I>;

export interface ListItemNode<I = { mediaId: number }> {
  type: 'listItem';
  content: BlockNode<I>[];
}

export interface PostDoc<I = { mediaId: number }> {
  type: 'doc';
  content: BlockNode<I>[];
}

const markSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('bold') }),
  z.object({ type: z.literal('italic') }),
  z.object({
    type: z.literal('link'),
    attrs: z.object({
      href: z.string().trim().min(1).max(2000).refine(isSafeHref, HREF_MESSAGE),
    }),
  }),
]);

const inlineSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('text'),
    text: z.string().min(1).max(20_000),
    marks: z.array(markSchema).max(5).optional(),
  }),
  z.object({ type: z.literal('hardBreak') }),
]);

const inlineContent = z.array(inlineSchema).max(2_000).optional();

const blockSchema: z.ZodType<BlockNode> = z.lazy(() =>
  z.discriminatedUnion('type', [
    z.object({ type: z.literal('paragraph'), content: inlineContent }),
    z.object({
      type: z.literal('heading'),
      attrs: z.object({ level: z.union([z.literal(2), z.literal(3)]) }),
      content: inlineContent,
    }),
    z.object({ type: z.literal('bulletList'), content: z.array(listItemSchema).min(1).max(500) }),
    z.object({ type: z.literal('orderedList'), content: z.array(listItemSchema).min(1).max(500) }),
    z.object({ type: z.literal('blockquote'), content: z.array(blockSchema).min(1).max(500) }),
    z.object({ type: z.literal('horizontalRule') }),
    z.object({
      type: z.literal('image'),
      attrs: z.object({ mediaId: z.number().int().positive() }),
    }),
  ]),
);

const listItemSchema: z.ZodType<ListItemNode> = z.lazy(() =>
  z.object({ type: z.literal('listItem'), content: z.array(blockSchema).min(1).max(500) }),
);

export const postDocSchema: z.ZodType<PostDoc> = z.object({
  type: z.literal('doc'),
  content: z.array(blockSchema).max(5_000),
});

export const EMPTY_POST_DOC: PostDoc = { type: 'doc', content: [{ type: 'paragraph' }] };

// Troca cada imagem do texto pelo retorno de `map` (null remove a imagem)
export function mapPostImages<I, O>(doc: PostDoc<I>, map: (attrs: I) => O | null): PostDoc<O> {
  const mapBlocks = (blocks: BlockNode<I>[]): BlockNode<O>[] =>
    blocks.flatMap((block): BlockNode<O>[] => {
      switch (block.type) {
        case 'image': {
          const attrs = map(block.attrs);
          return attrs === null ? [] : [{ type: 'image', attrs }];
        }
        case 'bulletList':
        case 'orderedList':
          return [
            {
              type: block.type,
              content: block.content.map((item) => ({
                type: 'listItem',
                content: mapBlocks(item.content),
              })),
            },
          ];
        case 'blockquote':
          return [{ type: 'blockquote', content: mapBlocks(block.content) }];
        default:
          return [block];
      }
    });
  return { type: 'doc', content: mapBlocks(doc.content) };
}

// Ids das imagens usadas no texto
export function postImageIds(doc: PostDoc): number[] {
  const ids: number[] = [];
  mapPostImages(doc, (attrs) => {
    ids.push(attrs.mediaId);
    return attrs;
  });
  return ids;
}

// Resumo automático: os parágrafos do texto (sem títulos, listas e citações), cortado
// numa palavra inteira
export function postPlainText(doc: PostDoc<unknown>, maxLength = 160): string {
  const text = doc.content
    .flatMap((block) =>
      block.type === 'paragraph' && block.content
        ? [block.content.map((node) => (node.type === 'text' ? node.text : ' ')).join('')]
        : [],
    )
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (text.length <= maxLength) return text;
  const cut = text.slice(0, maxLength - 1);
  return `${cut.slice(0, cut.lastIndexOf(' ') > 0 ? cut.lastIndexOf(' ') : cut.length)}…`;
}

// ===== Post =====

export const POST_STATUSES = ['draft', 'published'] as const;
export type PostStatus = (typeof POST_STATUSES)[number];

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const POST_SLUG_MAX = 160;

// "Ação & Reação!" -> "acao-reacao"
export function slugify(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+/, '')
    .slice(0, POST_SLUG_MAX)
    .replace(/-+$/, '');
}

export const postInputSchema = z.object({
  title: z.string().trim().min(1).max(160),
  slug: z
    .string()
    .trim()
    .min(1)
    .max(POST_SLUG_MAX)
    .regex(SLUG, 'Use só letras minúsculas, números e hífens (ex.: meu-primeiro-post)'),
  // Vazio = o site usa o começo do texto
  excerpt: z.string().trim().max(300).default(''),
  cover: z.number().int().positive().brand<'ImageId'>().nullable().default(null),
  content: postDocSchema,
  // Vazios = o site usa o título e o resumo
  seoTitle: z.string().trim().max(70).default(''),
  seoDescription: z.string().trim().max(160).default(''),
  status: z.enum(POST_STATUSES).default('draft'),
});
export type PostInput = z.input<typeof postInputSchema>;
export type PostFields = z.output<typeof postInputSchema>;

export const POST_VIEWS = ['active', 'trash'] as const;

export const listPostsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
  status: z.enum(POST_STATUSES).optional(),
  // "trash" lista só os posts na lixeira
  view: z.enum(POST_VIEWS).default('active'),
});
export type ListPostsQuery = z.infer<typeof listPostsQuerySchema>;

export const listPublicPostsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(12),
});

// Post como o painel recebe (datas em ISO)
export interface Post extends PostFields {
  id: number;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface PostSummary {
  id: number;
  title: string;
  slug: string;
  status: PostStatus;
  publishedAt: string | null;
  updatedAt: string;
  deletedAt: string | null;
}

export interface PostList {
  items: PostSummary[];
  page: number;
  pageSize: number;
  total: number;
}

// GET/POST/PUT /posts: o post e as mídias citadas (capa e imagens do texto)
export interface PostEdit {
  post: Post;
  media: Record<number, MediaItem>;
}

// ===== Site =====

export interface PublicPostSummary {
  slug: string;
  title: string;
  // Resumo escrito ou, se vazio, o começo do texto
  excerpt: string;
  cover: ImageAsset | null;
  publishedAt: string;
  updatedAt: string;
}

export interface PublicPost extends PublicPostSummary {
  content: PostDoc<ImageAsset>;
  seoTitle: string;
  seoDescription: string;
}

export interface PublicPostList {
  items: PublicPostSummary[];
  page: number;
  pageSize: number;
  total: number;
}

// Para o sitemap e a geração estática das páginas
export interface PostSlug {
  slug: string;
  updatedAt: string;
}
