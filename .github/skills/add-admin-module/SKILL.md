---
name: add-admin-module
description: Cria um módulo de ponta a ponta (banco, API e tela no painel admin) para conteúdo editável pelo cliente, como posts, banners, configurações ou envios. Use ao criar CRUD, nova área do painel, nova tabela ou nova seção editável.
---

# Adicionar módulo ao painel admin

## Passo 0: escolha o tipo de conteúdo
- **A) Seção de conteúdo fixo** (header, hero, footer, textos, logo): um único registro por seção na tabela `site_sections` (coluna `content` JSON). **Sem migration**: basta o schema Zod no `sectionRegistry`.
- **B) Entidade com lista, busca e paginação** (posts, depoimentos, envios): tabela própria, com **migration**.

Em caso de dúvida, pergunte ao usuário antes de continuar.

## Caminho A: seção de conteúdo fixo
1. Schema Zod em `packages/shared` e registro no `sectionRegistry`.
2. Valor padrão da seção no seed (`src/db/seed.ts`).
3. Admin: `apps/admin/src/modules/site-settings/` com o formulário da seção (usa `GET/PUT /sections/:key`).
4. Se alterar o que o site mostra, a API pede revalidação da tag `section:<chave>`.

## Caminho B: entidade com tabela própria
1. Schema Zod em `packages/shared/src/<modulo>.ts` (criar, atualizar, resposta).
2. Tabela em `apps/api/src/db/schema.ts` e migration com `drizzle-kit generate`. Ela é aplicada sozinha no próximo boot da API. Nunca edite migrations antigas.
3. API: `apps/api/src/modules/<modulo>/` (routes, controller, service). Escrita protegida por autenticação.
4. Admin: `apps/admin/src/modules/<modulo>/` com listagem (paginada), formulário de criar/editar e exclusão com confirmação. Registre em `routes.tsx` e no menu.
5. Testes: ao menos o service e uma rota.

## Sempre
- Siga o módulo `posts` como referência quando existir.
- Rode `pnpm typecheck && pnpm lint && pnpm test` ao final.
- Consulte o Context7 para sintaxe atual do Drizzle e do Zod.
