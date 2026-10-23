---
description: SEO, visibilidade para LLMs e performance do site público (Next.js)
applyTo: 'apps/web/**'
---

# Site público (Next.js): SEO e performance

## Renderização

- Páginas públicas são Server Components com SSG/ISR. Todo conteúdo relevante deve estar no HTML inicial.
- `"use client"` apenas onde há interação real (slider, menu mobile). Prefira carregar com `dynamic import`.
- Dados vêm da API via `lib/api.ts`, com tags de cache por seção/post para revalidação sob demanda.
- A rota `app/api/revalidate/route.ts` valida o header com `REVALIDATE_SECRET` antes de revalidar.
- Exibir um load(simbolo de carregamento) enquanto os dados da página estão sendo carregados, para melhorar a percepção de performance.

## SEO

- Metadata por página (`generateMetadata`): title, description, canonical, Open Graph e Twitter.
- Um único `h1` por página, hierarquia de headings correta, HTML semântico (`header`, `main`, `nav`, `article`, `footer`).
- JSON-LD em `lib/seo.ts`: `Organization`, `WebSite`, `BlogPosting`, `BreadcrumbList`.
- `sitemap.ts` e `robots.ts` gerados a partir dos dados. O robots deve permitir os crawlers de IA configurados (GPTBot, ClaudeBot, PerplexityBot etc.) conforme opção do dono do site.
- URLs limpas e estáveis; redirecionamento 301 quando um slug mudar.
- Imagens sempre com `alt` descritivo. Links com texto significativo.

## Performance

- Metas: LCP ≤ 2,5 s, INP ≤ 200 ms, CLS ≤ 0,1.
- `next/image` com `width`/`height` ou `fill` + `sizes`; `priority` só na imagem/poster do LCP.
- `next/font` com fonte self-hosted e `display: swap`.
- Vídeo do hero: `muted autoplay loop playsInline`, `poster` em WebP, `preload="metadata"`, fontes WebM e MP4, respeitando `prefers-reduced-motion`.
- Sem bibliotecas pesadas no cliente sem justificativa. Verifique o peso antes de adicionar.
- Defina `Cache-Control` adequado para estáticos.
- Confirme as APIs atuais do Next.js (cache, `revalidateTag`, metadata) no Context7 antes de usar.
