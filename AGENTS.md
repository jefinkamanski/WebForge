# Instruções para agentes de IA

Vale para qualquer agente (GitHub Copilot, Claude, Cursor…). Antes de qualquer tarefa estrutural, leia `docs/ARCHITECTURE.md`: ele é a fonte de verdade.

## O projeto

Plataforma open source para criar sites institucionais com painel administrativo. **Uma instalação por cliente.** Monorepo pnpm com `apps/api` (Express + Drizzle + MySQL), `apps/admin` (React + Vite, estático), `apps/web` (Next.js) e `packages/shared` (Zod).

## Regra principal: simplicidade

Implemente o mínimo que atende ao pedido. Casos de borda fora do pedido devem ser listados como sugestão, não implementados. Prefira menos arquivos, menos abstrações e menos dependências.

## Núcleo × cliente

- `core/` e `apps/api` são o **núcleo**, iguais em todos os clientes.
- As pastas `site/` são do **cliente**: configuração, tema e seções.
- Seção nova segue `docs/SECOES.md`: todo campo com `.default()`, mídia com `imageField()`/`videoField()`, nenhuma migration.

## Restrições da hospedagem

VPS dividida entre vários clientes (ex.: Hostinger KVM 1): sem Redis, sem filas, sem ffmpeg, pouca RAM por instalação, pool do MySQL com no máximo 10 conexões. Única dependência nativa aceita: `sharp`. As migrations rodam sozinhas no boot da API.

## Segurança

Siga a seção 9 do `docs/ARCHITECTURE.md`. Em especial: valide toda entrada com Zod, nunca registre senhas, tokens ou dados pessoais em log, nunca commite segredos, e toda variável nova entra em `apps/api/src/config/env.ts` e no `.env.example`.

## Como trabalhar

- Tarefa grande: apresente um plano curto e aguarde confirmação.
- Ao terminar: `pnpm typecheck && pnpm lint && pnpm test` e informe o resultado.
- Dependência nova só com justificativa.
- Na dúvida sobre API ou versão de uma ferramenta, consulte a documentação oficial (ou o MCP Context7, se disponível) em vez de confiar na memória.
- Código em inglês; textos de interface e documentação em português (pt-BR).
- Commits no padrão Conventional Commits (`feat:`, `fix:`, `docs:`…).
