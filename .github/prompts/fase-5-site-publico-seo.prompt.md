---
description: Fase 5 - site público em Next.js com seções, SEO e performance
agent: agent
---

Leia [as instruções do projeto](../copilot-instructions.md) e [web-seo-performance](../instructions/web-seo-performance.instructions.md). Use a skill `add-site-section`.

**Tarefa:** construir o site público.
1. Seções: Header, HeroVideo, Slider, BlogList, ContactForm, Footer, compostas por `site.config.ts`.
2. Páginas: Home, Blog (listagem), Post (`/blog/[slug]`), Contato.
3. SEO: metadata por página, JSON-LD (`Organization`, `WebSite`, `BlogPosting`, `BreadcrumbList`), `sitemap.ts`, `robots.ts` e rota de revalidação (`REVALIDATE_SECRET`).
4. Performance: Server Components, `next/image` (WebP), `next/font`, vídeo do hero conforme as instruções, JS de cliente mínimo.
5. Ao final, rode a skill `seo-audit` na Home e no Post e corrija o que for crítico.

Confirme as APIs atuais do Next.js no Context7. Plano antes de codar.
