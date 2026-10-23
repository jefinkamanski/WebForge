# Instruções do projeto

Plataforma **open source** para desenvolvedores web criarem **sites institucionais** (header, vídeo/slide, blog, formulários, footer) com um **painel administrativo** para o cliente final editar o conteúdo (logo, vídeo da home, posts, consulta de envios de formulário).

Antes de qualquer tarefa estrutural, leia `docs/ARCHITECTURE.md`. Ele é a fonte de verdade das decisões.

## Stack
- Monorepo **pnpm**: `apps/api`, `apps/web`, `apps/admin`, `packages/shared`, `packages/ui`
- `apps/web`: **Next.js (App Router)** + React + TypeScript + Tailwind CSS. Site público com SSR/ISR.
- `apps/admin`: React + Vite + TypeScript + Tailwind CSS. Painel, gerado como build **estático**.
- `apps/api`: Node.js + Express + TypeScript + **Drizzle ORM** + `mysql2`.
- Banco: **MySQL 8** (compatível com MariaDB). Local via `docker compose`.
- Validação: **Zod**, com schemas em `packages/shared` (contrato entre front e back).

## Restrições de hospedagem (importante)
O projeto roda em hospedagem compartilhada com Node.js (ex.: Hostinger plano Business), sem VPS e sem terminal garantido:
- Sem Redis, sem filas de jobs, sem ffmpeg no servidor.
- Pouca RAM e poucas conexões MySQL: pool com no máximo 10 conexões.
- Evite dependências nativas. Prefira JS puro (ex.: `bcryptjs`). Exceção aceita: `sharp`.
- A API cria e migra as tabelas sozinha no boot (migrations versionadas, ver `docs/ARCHITECTURE.md`).

## Requisitos inegociáveis
1. **SEO e visibilidade para LLMs:** todo conteúdo público chega no HTML inicial (SSR/SSG/ISR), com metadata, JSON-LD, sitemap e robots.
2. **Desempenho exemplar:** LCP ≤ 2,5 s, INP ≤ 200 ms, CLS ≤ 0,1. Imagens em WebP, vídeos em MP4 (H.264) e WebM. Pouco JavaScript no cliente.
3. **Convenções oficiais:** siga as práticas atuais de cada ferramenta. **Em caso de dúvida sobre API, sintaxe ou versão de Next.js, React, Tailwind, Drizzle, Zod, Express ou Vite, consulte o servidor MCP `context7` antes de escrever o código.** Não confie na memória para versões.

## Comandos
- `pnpm install` instala tudo
- `pnpm dev` sobe api, web e admin
- `pnpm db:up` sobe o MySQL local (Docker)
- `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`

## Como trabalhar
- Para tarefas grandes, apresente um **plano curto** (tópicos) e aguarde confirmação antes de alterar arquivos.
- Entregue em **passos pequenos**. Ao final de cada passo, rode `pnpm typecheck` e `pnpm lint` e informe o resultado.
- Não instale dependências novas sem avisar e justificar (RAM e build limitados na hospedagem).
- Nunca invente informação: se faltar contexto, pergunte.
- Reutilize os padrões existentes: o módulo `posts` é a referência para novos módulos.
- Código em inglês. Textos de interface e documentação em português (pt-BR).
- Commits no padrão Conventional Commits (`feat:`, `fix:`, `docs:`...).
- Nunca commite segredos. Toda variável nova entra em `.env.example`.

## Tarefas recorrentes
Use as skills em `.github/skills/` (`add-site-section`, `add-admin-module`, `seo-audit`) e os prompts de fase em `.github/prompts/` (`/fase-0-esqueleto` ... `/fase-6-qualidade-e-deploy`).
