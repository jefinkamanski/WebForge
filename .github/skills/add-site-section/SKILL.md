---
name: add-site-section
description: Cria uma nova seção para o site público em apps/web (ex.: depoimentos, galeria, FAQ, equipe, parceiros). Use quando pedirem para adicionar, criar ou alterar uma seção, bloco ou componente de página do site institucional.
---

# Adicionar seção ao site público

## Passos
1. Defina o **schema Zod** do conteúdo da seção em `packages/shared` e registre-o no `sectionRegistry` (a chave da seção é o identificador, ex.: `testimonials`).
2. Crie `apps/web/src/sections/<NomeSecao>/` com `<NomeSecao>.tsx` e `index.ts`. Server Component por padrão; os dados chegam por props tipadas.
3. Busque os dados em `lib/api.ts` usando a tag de cache `section:<chave>` (para revalidação sob demanda).
4. Registre a seção em `apps/web/src/site.config.ts` (ordem e visibilidade).
5. Se o cliente deve editar o conteúdo, use a skill `add-admin-module` (caminho "seção de conteúdo fixo") para criar o formulário no painel.
6. Estilize só com Tailwind, seguindo o tema existente.
7. Rode `pnpm typecheck` e `pnpm lint`.

## Checklist final
- [ ] Todo o conteúdo aparece no HTML inicial (sem depender de JS para renderizar)
- [ ] Headings em ordem; no máximo um `h1` por página
- [ ] Imagens com `alt`, `width`/`height` e `sizes` (WebP via `next/image`)
- [ ] JS de cliente apenas se houver interação, carregado com `dynamic import`
- [ ] Responsiva (mobile, tablet, desktop) e acessível (foco, contraste)
- [ ] Dados estruturados (JSON-LD) adicionados se a seção os justificar (FAQ, equipe, etc.)
- [ ] Uma linha documentando a seção e suas props em `docs/SECOES.md`
