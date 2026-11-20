# Formulários do site

Um formulário é definido no código (campos e validação) e funciona de ponta a ponta sem migration: a API grava os envios em `form_submissions`, o painel mostra e exclui, e os e-mails saem conforme `docs/EMAIL.md`.

## Como um envio funciona

1. O visitante preenche o formulário no site (componente de cliente) e o navegador envia para `POST /site/forms/:key`, na API.
2. A API aplica o **rate limit** por IP (5 envios a cada 10 minutos), descarta em silêncio envios com o **honeypot** preenchido (campo escondido que só robôs preenchem) e valida os campos com o schema do formulário.
3. Grava o envio e dispara os e-mails (aviso e confirmação).
4. No painel, em **Formulários → nome do formulário**, o cliente lê os envios, marca como lido, responde por e-mail e exclui. Ali também ficam o e-mail que recebe os avisos e a opção de confirmação.

## Criar um formulário

Exemplo: um formulário de orçamento.

**1. Definição** em `packages/shared/src/site/forms/budget.ts`:

```ts
import { z } from 'zod';
import { defineForm, emailFieldSchema, formField } from '../../core/index.js';

export const budget = defineForm({
  key: 'budget',
  label: 'Orçamento',
  // Campo com o e-mail de quem preenche (recebe a confirmação)
  emailField: 'email',
  fields: {
    name: formField('Nome', z.string().trim().min(2, 'Informe seu nome.').max(120)),
    email: formField('E-mail', emailFieldSchema),
    service: formField('Serviço', z.enum(['site', 'loja', 'outro'])),
    details: formField('Detalhes', z.string().trim().max(5000).default('')),
  },
});
```

Registre em `packages/shared/src/site/index.ts`: `registerForms(contact, budget)`. O formulário aparece sozinho no menu "Formulários" do painel.

**2. Componente do site** em `apps/web/site/forms/BudgetForm.tsx` (com `'use client'`), no modelo do `ContactForm.tsx`: envia com `submitForm(apiUrl, 'budget', dados)` (`@/core/submitForm`) e mostra os erros por campo. Mantenha o **honeypot** e o **consentimento** como no modelo, com os nomes de `@webforge/shared/form-fields`.

**3. Página** em `apps/web/app/<caminho>/page.tsx`, como `app/contato/page.tsx`, e a URL no `app/sitemap.ts`.

## Regras

- **Consentimento (LGPD) é obrigatório:** `defineForm` acrescenta o campo `consent`, que precisa chegar como `true`. O texto do aviso fica no componente do site.
- **Colete só o necessário** para responder. Nada de CPF, documentos ou dados sensíveis num formulário de contato.
- **Campos opcionais com `.default('')`**, para o envio não falhar quando o campo vier vazio.
- **Nomes reservados:** `website` (honeypot) e `consent` não podem ser campos do formulário.
- **Não guarde IP** nem dados extras: o envio tem só o que a pessoa preencheu e a data (que vale como data do consentimento).
- **Exclusão:** o painel exclui envios de forma definitiva. Oriente o cliente a apagar os que não forem mais necessários e a atender pedidos de exclusão.

## Formulários incluídos

| Formulário | Chave     | Campos                                      | Página     |
| ---------- | --------- | ------------------------------------------- | ---------- |
| Contato    | `contact` | Nome, e-mail, telefone (opcional), mensagem | `/contato` |
