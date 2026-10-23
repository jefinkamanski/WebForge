---
description: Convenções de React, TypeScript e Tailwind para web, admin e ui
applyTo: "apps/web/**,apps/admin/**,packages/ui/**"
---

# React + Tailwind

- Componentes funcionais com hooks; um componente por arquivo; props tipadas.
- Estilo apenas com classes Tailwind. Sem CSS inline e sem CSS modules.
- Cores, fontes e espaçamentos vêm do tema do Tailwind, nunca valores soltos.
- Componentes genéricos (Button, Input, Modal) ficam em `packages/ui`.
- Todo formulário valida com o schema Zod de `packages/shared`.
- Acessibilidade: `alt` em imagens, `label` em inputs, foco visível, contraste adequado.
- Sem `any` sem comentário justificando. Sem `useEffect` para buscar dados quando houver alternativa melhor.
- Confirme sintaxe atual do Tailwind (a configuração mudou nas versões recentes) no Context7.
