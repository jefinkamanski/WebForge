# Seções do site

Uma seção é um bloco de conteúdo editável pelo cliente com registro único (cabeçalho, destaque da home, rodapé…). Todas ficam nas pastas `site/` e não precisam de migration.

## Criar uma seção

Exemplo: uma seção de depoimentos. São **3 arquivos**, um em cada pasta `site/`, mais os registros.

**1. Schema** em `packages/shared/src/site/sections/testimonials.ts`:

```ts
import { z } from 'zod';
import { defineSection, imageField } from '../../core/index.js';

export const testimonials = defineSection({
  key: 'testimonials',
  label: 'Depoimentos',
  schema: z.object({
    title: z.string().trim().max(80).default('O que dizem nossos clientes'),
    items: z
      .array(
        z.object({
          name: z.string().trim().min(1).max(80),
          quote: z.string().trim().min(1).max(400),
          photo: imageField(),
        }),
      )
      .max(20)
      .default([]),
  }),
});
```

Registre em `packages/shared/src/site/index.ts`: `registerSections(header, hero, footer, seo, testimonials)`. A seção aparece sozinha no menu lateral do painel, em "Seções do site", na ordem do registro: use a mesma ordem em que os blocos aparecem no site. Conteúdo que não é um bloco visível (como o SEO global) leva `group: 'settings'` no `defineSection` e vai para "Configurações".

**2. Formulário do painel** em `apps/admin/src/site/sections/TestimonialsForm.tsx`, recebendo `SectionFormProps<'testimonials'>` (`value`, `onChange` e `errors`). Use os campos do núcleo: `TextField` e `TextAreaField` (`core/ui`), `ImageField`/`VideoField` (`core/modules/sections/MediaField.tsx`) e `LinkListField`. Os erros vêm por caminho do campo, ex.: `errors['items.0.name']`. Veja `HeroForm.tsx` como modelo.

Registre em `apps/admin/src/site/sections/index.ts` (`sectionForms`). Se esquecer, o `pnpm typecheck` acusa.

**3. Componente do site** em `apps/web/site/sections/Testimonials.tsx` (Server Component), que recebe `{ content }` com as mídias já resolvidas (`SiteContent['testimonials']`). Imagens com `next/image` e a URL de `mediaUrl()` (`@/core/site`); links com `SmartLink` (`@/core/SmartLink`). Veja `Hero.tsx` como modelo.

Registre em `apps/web/site/sections/index.ts` (`sectionComponents`) e inclua a chave em `homeSections`, no `apps/web/site/site.config.ts`, na posição em que o bloco aparece. Ao salvar a seção no painel, a home é regenerada sozinha.

Por fim, documente a seção na tabela abaixo.

## Regras

- **Todo campo com `.default()`.** Sem isso, um campo novo invalida o conteúdo já salvo. O `defineSection` recusa a seção se faltar algum.
- **Mídia com `imageField()` ou `videoField()`**, nunca um número solto: é assim que a API valida o tipo, resolve a URL e bloqueia a exclusão de mídia em uso.
- **Links com `hrefField()` ou `linkListField()`**, que recusam `javascript:` e similares.
- **Lista pequena é array dentro da seção** (ex.: até 20 depoimentos). Tabela própria só no núcleo, para listas paginadas como posts e envios.
- **Componente do site:** conteúdo no HTML inicial, headings em ordem, imagens com `alt`, `width`/`height` e `sizes`. JS de cliente só se houver interação.
- **Estilo:** só tokens do `theme.css` (ex.: `bg-brand-600`), sem cores soltas.

## Seções incluídas

| Seção            | Chave    | Conteúdo                                                             | Fase |
| ---------------- | -------- | -------------------------------------------------------------------- | ---- |
| Cabeçalho        | `header` | Logo (imagem) e itens do menu (até 8)                                | 2    |
| Destaque da home | `hero`   | Título, subtítulo, vídeo MP4, poster (obrigatório com vídeo) e botão | 2    |
| Rodapé           | `footer` | Texto e links (até 10)                                               | 2    |
| SEO global       | `seo`    | Nome do site, título e descrição padrão, imagem de compartilhamento  | 2    |
