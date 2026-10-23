---
description: Schemas Zod e tipos compartilhados
applyTo: "packages/shared/**"
---

# packages/shared

- Contém apenas schemas Zod, tipos inferidos (`z.infer`) e constantes. Sem dependência de Node, React ou banco.
- Para cada entidade: schema de criação, de atualização e de resposta.
- **Seções de conteúdo fixo** (header, hero, footer, logo...) ficam em um registro `sectionRegistry`, chave -> schema Zod. Criar uma seção nova não exige migration: basta registrar o schema.
- Mudanças aqui afetam api, web e admin: rode `pnpm typecheck` na raiz.
