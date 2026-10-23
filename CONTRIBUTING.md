# Como contribuir

1. Faça um fork e crie uma branch: `feat/minha-mudanca`.
2. Rode `pnpm install` e `pnpm dev` (veja o README).
3. Antes do PR: `pnpm lint && pnpm typecheck && pnpm test && pnpm build`.
4. Commits em **Conventional Commits** (`feat:`, `fix:`, `docs:`...).
5. Mudou o banco? Crie uma **nova migration**; nunca edite as existentes.
6. Mudou algo que afeta SEO ou performance? Rode a auditoria (`/seo-audit`) e o Lighthouse.
7. Nova dependência? Justifique no PR (a hospedagem alvo tem RAM e build limitados).

## Princípios
- Simples e legível: este é um projeto open source, pensado para outros devs customizarem.
- Seções do site são independentes e configuráveis por `site.config.ts`.
- Todo conteúdo editável pelo cliente vem da API, nunca fica fixo no código.
- Compatível com hospedagem compartilhada: sem Redis, sem filas, sem ffmpeg no servidor.
