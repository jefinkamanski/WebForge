---
description: Fase 3 - blog (posts) no painel e na API
agent: agent
---

Leia [as instruções do projeto](../copilot-instructions.md) e use a skill `add-admin-module` (caminho B).

**Tarefa:** módulo `posts` completo.
- Tabela e migration, CRUD na API (listagem paginada e busca), status rascunho/publicado, `slug` único, soft delete (`deleted_at`), imagem de capa (mídia), campos de SEO (`seo_title`, `seo_description`).
- Painel: listagem, editor de post, publicar/despublicar, excluir com confirmação.
- Ao publicar, editar ou excluir, revalidar as tags do post e da listagem no site.

Este será o **módulo de referência** para os próximos. Mantenha-o limpo e simples. Plano antes de codar.
