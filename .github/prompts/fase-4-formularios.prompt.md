---
description: Fase 4 - envios de formulário (público) e consulta no painel
agent: agent
---

Leia [as instruções do projeto](../copilot-instructions.md) e use a skill `add-admin-module` (caminho B), com o módulo `posts` como referência.

**Tarefa:**
- Endpoint público `POST /forms/:formKey/submissions` validado por Zod, com rate limit e honeypot anti-spam.
- Painel: listagem paginada de envios, visualização, marcar como lido e exclusão (para atender pedidos de remoção de dados, LGPD).
- Aviso sobre privacidade e consentimento no formulário do site; não armazene dados além do necessário.

Plano antes de codar; testes para validação e anti-spam.
