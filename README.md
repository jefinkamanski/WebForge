# WebForge

Plataforma **open source** para desenvolvedores web criarem **sites institucionais** com **painel administrativo**. O cliente final edita logo, vídeo da home, textos e posts do blog, e consulta os envios de formulário, sem mexer em código.

- **Site público:** Next.js (SSR/ISR), focado em SEO, visibilidade para LLMs e desempenho
- **Painel:** React + Vite + Tailwind CSS (build estático)
- **API:** Node.js + Express + Drizzle ORM + **MySQL**, que cria e migra as tabelas sozinha no boot
- Pensado para uma **VPS barata** (ex.: Hostinger KVM 1) que hospeda vários clientes; leve o bastante para hospedagem compartilhada com Node.js
- **Uma instalação por cliente:** faça uma cópia do projeto para cada site ([docs/NOVO-CLIENTE.md](docs/NOVO-CLIENTE.md))

> **Status:** fase 5 concluída (formulários com aviso e confirmação por e-mail). Veja o [roteiro](docs/ROADMAP.md).

## Requisitos

- Node.js 22+ (`nvm use`) e pnpm 10+
- MySQL 8 (ou MariaDB), instalado localmente ou via Docker (a partir da fase 1)

## Começando

```bash
cp .env.example .env     # ajuste as variáveis
pnpm secrets             # gera JWT_SECRET e REVALIDATE_SECRET para colar no .env
pnpm install
pnpm dev                 # api (3001), web (3000) e admin (5173)
```

## Banco de dados local

A API só precisa que as variáveis `DB_*` do `.env` apontem para um MySQL acessível.

**MySQL instalado na máquina:** crie o banco e um usuário dedicado (não use o `root`), trocando `<sua-senha>` por uma senha sua:

```sql
CREATE DATABASE webforge CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE webforge_test CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'webforge'@'localhost' IDENTIFIED BY '<sua-senha>';
GRANT ALL PRIVILEGES ON webforge.* TO 'webforge'@'localhost';
GRANT ALL PRIVILEGES ON webforge_test.* TO 'webforge'@'localhost';
FLUSH PRIVILEGES;
```

Os testes da API usam sempre o banco `<DB_NAME>_test` (ex.: `webforge_test`) e apagam as tabelas dele a cada execução. O banco de desenvolvimento nunca é tocado.

No primeiro `pnpm dev`, a API cria as tabelas e o administrador com `ADMIN_EMAIL`/`ADMIN_PASSWORD`. Entre no painel em `http://localhost:5173`, que pede a troca de senha no primeiro acesso.

**MySQL via Docker:** `pnpm db:up` sobe o MySQL 8 do `docker-compose.yml` com os valores do `.env`; `pnpm db:down` para o container.

## Estrutura

```
apps/api          API (Express + Drizzle): núcleo, igual em todos os clientes
apps/admin        Painel (React + Vite): src/core/ (núcleo) e src/site/ (cliente)
apps/web          Site (Next.js): app/ (páginas), core/ (núcleo) e site/ (cliente)
packages/shared   Schemas Zod compartilhados: src/core/ e src/site/
docs/             Arquitetura, seções, mídia, deploy e guias
```

Num cliente, o dev trabalha só nas pastas `site/`. Detalhes em [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Scripts

| Comando                       | O que faz                                     |
| ----------------------------- | --------------------------------------------- |
| `pnpm dev`                    | Sobe api, web e admin em modo desenvolvimento |
| `pnpm build`                  | Build de todos os apps                        |
| `pnpm lint`                   | Verifica o estilo de código                   |
| `pnpm typecheck`              | Verifica os tipos TypeScript                  |
| `pnpm test`                   | Roda os testes (os da API precisam do MySQL)  |
| `pnpm secrets`                | Gera segredos novos para o `.env`             |
| `pnpm db:up` / `pnpm db:down` | Sobe ou para o MySQL via Docker               |

## Documentação

- [Arquitetura](docs/ARCHITECTURE.md)
- [Seções do site](docs/SECOES.md)
- [Guia de mídia](docs/MIDIA.md)
- [Formulários](docs/FORMULARIOS.md) e [envio de e-mails](docs/EMAIL.md)
- [Deploy em hospedagem compartilhada (Hostinger)](docs/DEPLOY-HOSTINGER.md): o guia para VPS chega na última fase
- [Novo cliente](docs/NOVO-CLIENTE.md) e [Atualizando um cliente](docs/ATUALIZANDO.md)
- [Roteiro](docs/ROADMAP.md)
- [Como contribuir](CONTRIBUTING.md)

Usa um agente de IA (Copilot, Claude, Cursor…)? As regras do projeto para agentes estão em [AGENTS.md](AGENTS.md).

## Licença

MIT. Veja [LICENSE](LICENSE).
