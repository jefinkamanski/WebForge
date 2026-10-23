---
description: Banco MySQL, Drizzle e migrations automáticas no boot da API
applyTo: "apps/api/src/db/**"
---

# Banco de dados (MySQL + Drizzle)

## Princípio
A API cria e atualiza as tabelas sozinha **no boot**, porque a hospedagem compartilhada não garante terminal. Isso é feito com **migrations versionadas**, nunca com um "create" avulso.

## Regras
- Schema em `src/db/schema.ts`. Migrations geradas com `drizzle-kit generate` em `src/db/migrations/`.
- `src/db/bootstrap.ts` roda no boot: obtém `GET_LOCK`, aplica as migrations pendentes, executa o seed e libera o lock.
- Primeira execução cria tudo; as seguintes aplicam somente o que for novo. **Reiniciar a API nunca apaga dados.**
- **Nunca** use `DROP`, `TRUNCATE` ou recriação de tabela em código que rode automaticamente.
- Nunca edite uma migration já publicada: crie uma nova.
- O DDL do MySQL não é transacional: escreva migrations idempotentes (`IF NOT EXISTS` quando aplicável) e pequenas.
- Seed só roda com tabela vazia: admin inicial a partir de `ADMIN_EMAIL`/`ADMIN_PASSWORD` (com `must_change_password = true`) e seções padrão.
- Um "reset" destrutivo, se existir, é um comando manual separado, com confirmação, e bloqueado quando `NODE_ENV=production`.
- Use `utf8mb4` / `utf8mb4_unicode_ci`. Toda tabela tem `id`, `created_at` e `updated_at`.
- Pool de conexões limitado por `DB_POOL_LIMIT` (máx. 10).
- Compatibilidade: MySQL 8 e MariaDB. Em MariaDB o tipo `JSON` é alias de texto: faça parse e valide com Zod no service.
- Confirme a API do migrator do Drizzle (`drizzle-orm/mysql2/migrator`) no Context7 antes de implementar.
