---
description: Fase 0 - monta o esqueleto do monorepo (somente estrutura, sem funcionalidades)
agent: agent
---

Leia [as instruções do projeto](../copilot-instructions.md) e [a arquitetura](../../docs/ARCHITECTURE.md).

**Tarefa:** montar o esqueleto do monorepo. Somente estrutura e configuração, **sem funcionalidades**.

Escopo:
- `apps/api`: Express + TypeScript, rota `GET /health`, validação de variáveis de ambiente com Zod, pool `mysql2` e Drizzle configurados (ainda sem tabelas).
- `apps/web`: Next.js (App Router) + TypeScript + Tailwind, página inicial mínima.
- `apps/admin`: React + Vite + TypeScript + Tailwind, tela inicial mínima.
- `packages/shared` e `packages/ui`: configurados como workspaces, com exportações vazias.
- ESLint + Prettier + TypeScript strict em todo o monorepo, scripts `dev`, `lint`, `typecheck`, `test`, `build` funcionando.
- Consulte o Context7 para criar cada projeto com as convenções atuais (Next.js, Vite, Tailwind, Drizzle).

**Regras:** antes de criar qualquer arquivo, mostre o plano em tópicos curtos e aguarde minha confirmação. Ao terminar, rode `pnpm install` e `pnpm typecheck` e informe o resultado. Não implemente nada além do descrito.
