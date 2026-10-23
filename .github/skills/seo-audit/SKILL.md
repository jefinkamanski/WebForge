---
name: seo-audit
description: Audita uma página ou seção do site público quanto a SEO técnico, dados estruturados, visibilidade para LLMs e performance (Core Web Vitals). Use ao revisar, validar ou finalizar páginas do apps/web, ou quando pedirem auditoria de SEO ou desempenho.
---

# Auditoria de SEO e performance

Analise o código da página/seção indicada (e o HTML gerado, se possível) e responda com uma lista de problemas por prioridade (crítico, importante, melhoria), citando arquivo e linha.

## SEO técnico
- [ ] `generateMetadata`: title (até ~60 caracteres), description (até ~160), canonical, Open Graph, Twitter
- [ ] Um único `h1`; headings em ordem lógica; HTML semântico
- [ ] Conteúdo presente no HTML inicial (sem depender de JS)
- [ ] Presente no `sitemap.ts`; `robots.ts` correto; páginas do admin com `noindex`
- [ ] URLs limpas; redirecionamento 301 para slugs alterados
- [ ] Imagens com `alt` descritivo; links com texto significativo

## Dados estruturados e LLMs
- [ ] JSON-LD adequado (`Organization`, `WebSite`, `BlogPosting`, `BreadcrumbList`) e válido
- [ ] Conteúdo claro, factual e bem estruturado (respostas diretas, listas, títulos descritivos)
- [ ] `robots.txt` coerente com a política de crawlers de IA escolhida pelo dono do site

## Performance
- [ ] LCP: imagem/poster principal com `priority`, WebP, dimensões corretas
- [ ] CLS: `width`/`height` definidos; fontes com `next/font`
- [ ] INP/JS: `"use client"` só onde necessário; sem bibliotecas pesadas; `dynamic import` quando útil
- [ ] Vídeo do hero com `poster`, `preload="metadata"`, WebM + MP4, `muted playsInline`
- [ ] Cache e revalidação (tags) configurados

## Saída
Termine com: (1) resumo de 3 linhas, (2) lista priorizada, (3) correções sugeridas. Só altere arquivos se o usuário pedir.
