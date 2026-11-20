import { MEDIA_KINDS, POST_STATUSES } from '@webforge/shared';
import {
  boolean,
  datetime,
  index,
  int,
  json,
  mysqlEnum,
  mysqlTable,
  timestamp,
  varchar,
} from 'drizzle-orm/mysql-core';

// Tabelas do NÚCLEO. Forks não alteram este arquivo (docs/ARCHITECTURE.md, seção 7).
// Depois de mudar o schema: pnpm --filter @webforge/api db:generate

const id = () => int('id').primaryKey().autoincrement();
const createdAt = () => timestamp('created_at').notNull().defaultNow();
const updatedAt = () => timestamp('updated_at').notNull().defaultNow().onUpdateNow();

// Contas do painel. Uma futura área de usuário do site usa outra tabela (seção 12).
export const adminUsers = mysqlTable('admin_users', {
  id: id(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  name: varchar('name', { length: 120 }).notNull(),
  mustChangePassword: boolean('must_change_password').notNull().default(false),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

// Conteúdo de cada seção do site (registro único por chave), validado pelo schema da seção
export const siteSections = mysqlTable('site_sections', {
  id: id(),
  key: varchar('key', { length: 60 }).notNull().unique(),
  content: json('content').notNull(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

// Biblioteca de mídia. storage_key é relativo a UPLOAD_DIR (ex.: "<uuid>/image.webp").
export const media = mysqlTable(
  'media',
  {
    id: id(),
    kind: mysqlEnum('kind', MEDIA_KINDS).notNull(),
    storageKey: varchar('storage_key', { length: 255 }).notNull().unique(),
    mime: varchar('mime', { length: 50 }).notNull(),
    size: int('size').notNull(),
    width: int('width'),
    height: int('height'),
    alt: varchar('alt', { length: 255 }).notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [index('media_kind_idx').on(table.kind)],
);

// Posts do blog. Excluir manda para a lixeira (deleted_at); a exclusão definitiva só
// sai da lixeira. A capa é FK: a mídia não pode sumir enquanto um post a usa.
export const posts = mysqlTable(
  'posts',
  {
    id: id(),
    slug: varchar('slug', { length: 160 }).notNull().unique(),
    title: varchar('title', { length: 160 }).notNull(),
    excerpt: varchar('excerpt', { length: 300 }).notNull().default(''),
    content: json('content').notNull(),
    coverMediaId: int('cover_media_id').references(() => media.id, { onDelete: 'restrict' }),
    seoTitle: varchar('seo_title', { length: 70 }).notNull().default(''),
    seoDescription: varchar('seo_description', { length: 160 }).notNull().default(''),
    status: mysqlEnum('status', POST_STATUSES).notNull().default('draft'),
    publishedAt: datetime('published_at'),
    deletedAt: datetime('deleted_at'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [index('posts_listing_idx').on(table.status, table.deletedAt, table.publishedAt)],
);

// Envios dos formulários do site (LGPD: o painel consulta e exclui). Sem IP nem outros
// dados além do que a pessoa preencheu; o consentimento vale na data do envio.
export const formSubmissions = mysqlTable(
  'form_submissions',
  {
    id: id(),
    formKey: varchar('form_key', { length: 60 }).notNull(),
    data: json('data').notNull(),
    readAt: datetime('read_at'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [index('form_submissions_listing_idx').on(table.formKey, table.createdAt)],
);

// Configuração de cada formulário, editada no painel
export const formSettings = mysqlTable('form_settings', {
  id: id(),
  formKey: varchar('form_key', { length: 60 }).notNull().unique(),
  notifyEmail: varchar('notify_email', { length: 255 }).notNull().default(''),
  sendConfirmation: boolean('send_confirmation').notNull().default(true),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});
