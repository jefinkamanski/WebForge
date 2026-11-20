# Atualizando um cliente

Como trazer correções e novidades do WebForge (upstream) para o repositório de um cliente.

```bash
git fetch upstream
git merge upstream/main
pnpm install
pnpm typecheck && pnpm lint && pnpm test && pnpm build
```

## Por que costuma ser tranquilo

O WebForge só altera `core/` e `apps/api`; o cliente só altera as pastas `site/`. Os dois lados mexem em arquivos diferentes, então o merge raramente tem conflito.

## Antes de atualizar

- Leia o `CHANGELOG.md` do WebForge: mudanças que exigem ação no cliente vêm marcadas como **Ação necessária**.
- Migrations novas do núcleo são aplicadas sozinhas no próximo boot da API. Faça backup do banco antes de publicar.

## Se houver conflito

Quase sempre é sinal de que alguém editou um arquivo do núcleo no cliente. Fique com a versão do upstream e mova a personalização para a pasta `site/` correspondente.
