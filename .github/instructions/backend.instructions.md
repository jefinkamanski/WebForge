---
description: Regras da API Node.js + Express
applyTo: "apps/api/**"
---

# API

- Estrutura por módulo: `routes` -> `controller` -> `service`. Controllers só lidam com HTTP; regra de negócio fica no service.
- Valide toda entrada com Zod (schemas de `packages/shared`). Nunca confie em dados do cliente.
- Rotas de escrita e do painel exigem autenticação (cookie httpOnly, `Secure`, `SameSite=Lax`, domínio via `COOKIE_DOMAIN`).
- Rate limit no login e no endpoint público de formulário. Proteção contra spam (honeypot).
- Erros passam por um error handler central; nunca vaze stack trace em produção.
- Senhas com `bcryptjs` (JS puro). Nunca registre senhas ou tokens em log.
- Configuração só via variáveis de ambiente validadas por Zod no boot (falhe cedo se faltar algo).
- CORS restrito a `CORS_ORIGINS`. Headers de segurança com `helmet`.
- Após salvar conteúdo publicado, peça revalidação ao Next.js (`WEB_URL` + `REVALIDATE_SECRET`). Falha na revalidação não pode derrubar a requisição.
- Memória limitada: sem carregar arquivos grandes inteiros em memória; use streams.
- Evite dependências nativas e pesadas; justifique qualquer nova dependência.
