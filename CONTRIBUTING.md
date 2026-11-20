# Como contribuir

1. Faça um fork e crie uma branch: `feat/minha-mudanca`.
2. Rode `pnpm install` e `pnpm dev` (veja o README).
3. Antes do PR: `pnpm lint && pnpm typecheck && pnpm test && pnpm build`.
4. Commits em **Conventional Commits** (`feat:`, `fix:`, `docs:`…).
5. Mudou o banco? Crie uma **nova migration**; nunca edite as existentes.
6. Mudança que exige ação nos sites de clientes? Registre no `CHANGELOG.md` como **Ação necessária**.
7. Dependência nova? Justifique no PR (a hospedagem alvo tem RAM e build limitados).

## Princípios

- **Simples e legível:** o mínimo que resolve o problema. Outros devs vão ler e personalizar este código.
- **Núcleo × cliente:** contribuições ao WebForge mexem em `core/` e `apps/api`. As pastas `site/` contêm só o exemplo padrão.
- **Conteúdo editável vem da API**, nunca fica fixo no código.
- **Leve:** a VPS é dividida entre vários clientes; sem Redis, sem filas, sem ffmpeg no servidor.
- **Seguro por padrão:** veja a seção 9 do `docs/ARCHITECTURE.md`.
