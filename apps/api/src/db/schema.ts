import {
  boolean,
  datetime,
  index,
  int,
  json,
  mediumtext,
  mysqlEnum,
  mysqlTable,
  timestamp,
  varchar,
} from 'drizzle-orm/mysql-core';

const id = () => int('id').primaryKey().autoincrement();
const createdAt = () => timestamp('created_at').notNull().defaultNow();
const updatedAt = () => timestamp('updated_at').notNull().defaultNow().onUpdateNow();

export const users = mysqlTable('users', {
  id: id(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  name: varchar('name', { length: 120 }).notNull(),
  role: varchar('role', { length: 32 }).notNull().default('admin'),
  mustChangePassword: boolean('must_change_password').notNull().default(false),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const siteSections = mysqlTable('site_sections', {
  id: id(),
  key: varchar('key', { length: 100 }).notNull().unique(),
  content: json('content').notNull(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const media = mysqlTable('media', {
  id: id(),
  kind: mysqlEnum('kind', ['image', 'video']).notNull(),
  storageKey: varchar('storage_key', { length: 512 }).notNull(),
  mime: varchar('mime', { length: 100 }).notNull(),
  size: int('size').notNull(),
  width: int('width'),
  height: int('height'),
  alt: varchar('alt', { length: 255 }),
  variants: json('variants'),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const posts = mysqlTable(
  'posts',
  {
    id: id(),
    slug: varchar('slug', { length: 191 }).notNull().unique(),
    title: varchar('title', { length: 255 }).notNull(),
    excerpt: varchar('excerpt', { length: 500 }),
    content: mediumtext('content').notNull(),
    coverMediaId: int('cover_media_id').references(() => media.id, { onDelete: 'restrict' }),
    seoTitle: varchar('seo_title', { length: 255 }),
    seoDescription: varchar('seo_description', { length: 320 }),
    status: mysqlEnum('status', ['draft', 'published']).notNull().default('draft'),
    publishedAt: datetime('published_at'),
    deletedAt: datetime('deleted_at'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [index('posts_status_published_at_idx').on(table.status, table.publishedAt)],
);

export const formSubmissions = mysqlTable(
  'form_submissions',
  {
    id: id(),
    formKey: varchar('form_key', { length: 100 }).notNull(),
    data: json('data').notNull(),
    readAt: datetime('read_at'),
    userAgent: varchar('user_agent', { length: 512 }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [index('form_submissions_form_key_idx').on(table.formKey)],
);
