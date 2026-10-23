---
description: Fase 1 - tabelas criadas no boot (migrations) e autenticação do admin
agent: agent
---

Leia [as instruções do projeto](../copilot-instructions.md), [a arquitetura](../../docs/ARCHITECTURE.md) e as instruções de banco em [database](../instructions/database.instructions.md).

**Tarefa:** implementar o banco e a autenticação.

1. Schema Drizzle das tabelas definidas em `docs/ARCHITECTURE.md` (`users`, `site_sections`, `media`, `posts`, `form_submissions`) e a primeira migration.
2. `src/db/bootstrap.ts`: `GET_LOCK`, aplica migrations pendentes no boot, seed (admin inicial via `.env` com troca obrigatória de senha, e seções padrão) e libera o lock. Chamado antes de a API começar a ouvir requisições.
3. Autenticação: login/logout/`me`, cookie httpOnly, rate limit no login, troca de senha obrigatória no primeiro acesso.
4. Testes: bootstrap idempotente (rodar duas vezes não duplica nem apaga nada) e login.

Plano antes de codar; rode typecheck, lint e testes ao final.
