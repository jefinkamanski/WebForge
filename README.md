# Meu Projeto

Plataforma **open source** para desenvolvedores web criarem **sites institucionais** com **painel administrativo**. O cliente final edita logo, vídeo da home, textos e posts do blog, e consulta os envios de formulário, sem mexer em código.

- **Site público:** Next.js (SSR/ISR), focado em SEO, visibilidade para LLMs e desempenho
- **Painel:** React + Vite + Tailwind CSS (build estático)
- **API:** Node.js + Express + Drizzle ORM + **MySQL**, que cria e migra as tabelas sozinha no boot
- Pensado para **hospedagem compartilhada com Node.js** (ex.: Hostinger Business), sem exigir VPS

> **Status:** em construção. O desenvolvimento segue as fases em `.github/prompts/`.

## Requisitos

- Node.js 22+ (`nvm use`) e pnpm 10+
- **MySQL 8** (ou MariaDB), instalado localmente **ou** via Docker (opcional, veja [Banco de dados local](#banco-de-dados-local))
- VS Code com GitHub Copilot (plano pago e utilizando o sonnet 5.5), para desenvolver com as skills e prompts do projeto

## Começando

```bash
cp .env.example .env     # ajuste as variáveis (principalmente DB_*)
pnpm install
pnpm dev                 # api (3001), web (3000) e admin (5173)
```

Na primeira execução, a API cria as tabelas e o administrador inicial (`ADMIN_EMAIL` / `ADMIN_PASSWORD` do `.env`). A senha deve ser trocada no primeiro login. Reiniciar a API **nunca apaga dados**.

## Banco de dados local

Escolha **uma** das opções. A API só precisa que as variáveis `DB_*` do `.env` apontem para um MySQL acessível.

### Opção A: MySQL já instalado na sua máquina

Crie o banco e um usuário dedicado (evite usar o `root`):

```sql
CREATE DATABASE site_platform CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'site_user'@'localhost' IDENTIFIED BY 'jk@157810';
GRANT ALL PRIVILEGES ON site_platform.* TO 'site_user'@'localhost';
FLUSH PRIVILEGES;
```

Depois ajuste o `.env`:

```
DB_HOST=localhost
DB_PORT=3306
DB_NAME=site_platform
DB_USER=site_user
DB_PASSWORD=jk@157810
```

### Opção B: MySQL via Docker

```bash
pnpm db:up      # sobe o MySQL 8 definido em docker-compose.yml
pnpm db:down    # para o container
```

Os valores padrão do `.env.example` já funcionam com essa opção.

> Se o MySQL local já usa a porta 3306, não suba o Docker ao mesmo tempo (conflito de porta), ou altere `DB_PORT` no `.env`.

## Estrutura

```
apps/api          API Node.js + Express + Drizzle (MySQL)
apps/web          Site público (Next.js)
apps/admin        Painel administrativo (React + Vite)
packages/shared   Schemas Zod e tipos compartilhados
packages/ui       Componentes React compartilhados
docs/             Arquitetura, deploy, mídia e seções
.github/          Instruções, skills e prompts do Copilot
.vscode/          Configurações compartilhadas do editor e MCP (Context7)
```

## Scripts

| Comando | O que faz |
|---|---|
| `pnpm dev` | Sobe api, web e admin em modo desenvolvimento |
| `pnpm build` | Build de todos os apps |
| `pnpm lint` | Verifica o estilo de código |
| `pnpm typecheck` | Verifica os tipos TypeScript |
| `pnpm test` | Roda os testes |
| `pnpm db:up` / `pnpm db:down` | Sobe ou para o MySQL via Docker (opcional) |

## Desenvolvendo com GitHub Copilot  (VS Code)

1. Abra a pasta no VS Code e instale as extensões recomendadas.
2. No **Copilot Chat**, use o modo **Agent** e escolha o modelo **Claude Sonnet 5.5** no seletor de modelos.
3. Em **Configure Tools**, habilite o servidor MCP **context7** (definido em `.vscode/mcp.json`). O VS Code pode pedir confirmação para iniciá-lo.
4. Execute as fases na ordem, digitando no chat:

   | Prompt | Objetivo |
   |---|---|
   | `/fase-0-esqueleto` | Esqueleto do monorepo |
   | `/fase-1-banco-e-auth` | Tabelas no boot e autenticação |
   | `/fase-2-configuracoes-e-midia` | Logo, vídeo da home e upload de mídia |
   | `/fase-3-blog` | Posts do blog |
   | `/fase-4-formularios` | Envios de formulário |
   | `/fase-5-site-publico-seo` | Site público, SEO e performance |
   | `/fase-6-qualidade-e-deploy` | Lighthouse CI, CI e preparação do deploy |

5. Para tarefas recorrentes, peça em linguagem natural (por exemplo, "adicione uma seção de depoimentos"). O Copilot carrega a skill correspondente (`add-site-section`, `add-admin-module`, `seo-audit`).
6. Confirme que as instruções foram carregadas: a resposta do Chat lista `copilot-instructions.md` em "References".

**Dicas:** use uma fase por conversa, peça o plano antes do código e revise o diff antes de aceitar.

## Requisitos de qualidade

- **SEO e LLMs:** conteúdo no HTML inicial, metadata, JSON-LD, sitemap e robots
- **Desempenho:** LCP ≤ 2,5 s, INP ≤ 200 ms, CLS ≤ 0,1; imagens WebP; vídeo MP4 (H.264) + WebM
- **Convenções:** práticas oficiais de cada ferramenta, consultando o Context7 em caso de dúvida

## Deploy

O alvo é hospedagem compartilhada com Node.js (2 apps Node: `web` e `api`; o `admin` é estático). Veja o passo a passo e os pontos a verificar em [docs/DEPLOY-HOSTINGER.md](docs/DEPLOY-HOSTINGER.md).

## Documentação

- [Arquitetura](docs/ARCHITECTURE.md)
- [Deploy na Hostinger](docs/DEPLOY-HOSTINGER.md)
- [Guia de mídia (imagens e vídeos)](docs/MIDIA.md)
- [Seções do site](docs/SECOES.md)
- [Como contribuir](CONTRIBUTING.md)

## Licença

MIT. Veja [LICENSE](LICENSE).
