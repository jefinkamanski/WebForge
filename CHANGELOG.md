# Changelog

Mudanças que afetam os sites de clientes ficam marcadas como **Ação necessária**.

## 0.6.0

- Fase 5: formulários. `defineForm`/`registerForms` em `packages/shared` com consentimento (LGPD) obrigatório; formulário de contato e página `/contato` no site.
- API: `POST /site/forms/:key` público com rate limit por IP, honeypot e validação; tabelas `form_submissions` e `form_settings` (migration no boot); rotas `/forms` no painel (envios, lido/não lido, exclusão, configuração e e-mail de teste).
- E-mail com `nodemailer` (SMTP): a cada envio, aviso para o e-mail cadastrado no painel e confirmação para quem preencheu. A confirmação não repete o que foi escrito. Guia em `docs/EMAIL.md`, incluindo o caminho para e-mails de conta no futuro.
- Painel: menu "Formulários" com uma página por formulário.
- **Ação necessária:** novas variáveis `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASSWORD` e `MAIL_FROM` (opcionais; sem elas os e-mails ficam desligados). Num fork, registre os formulários próprios em `registerForms`.

## 0.5.0

- Fase 4: blog. Tabela `posts` (migration no boot), rotas `/posts` no painel (rascunho, publicação, lixeira, restauração e exclusão definitiva) e `/site/posts` públicas.
- Painel: menu "Blog → Posts", lista com filtros e lixeira, editor visual (TipTap) com títulos, listas, citação, links e imagens da biblioteca, capa, resumo e SEO do post.
- Site: `/blog` paginado, `/blog/[slug]` com JSON-LD `BlogPosting` e `BreadcrumbList`, posts no sitemap. Texto montado a partir do JSON do editor, sem HTML cru.
- Mídia usada por um post (capa ou texto) não pode ser excluída.
- Correção: enviar um arquivo pelo seletor de mídia disparava também o salvamento do formulário da seção.
- **Ação necessária:** `site.config.ts` ganhou `timeZone` e `blog` (título e descrição); num fork, copie os dois campos. Variável opcional `VITE_SITE_URL` no painel (link "Ver no site" dos posts).

## 0.4.0

- Roteiro: o alvo de hospedagem passa a ser uma VPS (ex.: Hostinger KVM 1), e o deploy vira a última fase. Blog é a fase 4, formulários a 5 e qualidade a 6.

- Fase 3: home pública. Header e Footer em todas as páginas e Hero na home, lendo `GET /site` com cache por tags e revalidação sob demanda (`POST /api/revalidate`).
- SEO: título, descrição e Open Graph da seção SEO global, canonical, JSON-LD (Organization e WebSite), `sitemap.xml` e `robots.txt` (crawlers de IA conforme `aiCrawlers`).
- Hero com poster como LCP e vídeo por cima, respeitando `prefers-reduced-motion`.
- Tokens novos no `theme.css`: `brand-900`, `ink`, `ink-muted`, `surface`, `surface-muted`, `line`.
- **Ação necessária:** nova variável `API_PUBLIC_URL` (site). `site.config.ts` perdeu `name` e `description` (agora vêm da seção SEO global) e `homeSections` passou a ser tipado; num fork, registre os componentes dos blocos em `apps/web/site/sections/index.ts`.

## 0.3.0

- Fase 2: seções e mídia. `defineSection`, `registerSections`, `imageField`/`videoField`, `hrefField`/`linkListField` em `packages/shared`; seções `header`, `hero`, `footer` e `seo`.
- API: tabelas `site_sections` e `media` (migration aplicada no boot), `GET /site` público com mídias resolvidas, `GET`/`PUT /sections/:key`, `POST`/`GET`/`PATCH`/`DELETE /media`, arquivos em `/uploads`. Imagens viram uma WebP de até 1920 px sem metadados; vídeo só MP4.
- Revalidação do site ao salvar uma seção ou o texto alternativo de uma mídia em uso (o endpoint do site chega na fase 3; até lá a API só registra um aviso).
- Erros de validação agora vêm por caminho do campo (`navItems.0.href`).
- Painel: menu lateral com cada seção do site (na ordem do registro), Mídia e Configurações (seções com `group: 'settings'`, como o SEO global); editor de cada seção com seletor e envio de mídia; página Mídia com a galeria de todos os arquivos (texto alternativo e exclusão). No celular, o menu fica atrás do botão "Menu".
- **Ação necessária:** `UPLOAD_DIR` relativo agora parte da raiz do projeto. Num fork, crie os formulários das seções próprias em `apps/admin/src/site/sections/` e registre-os em `sectionForms`.

## 0.2.0

- Fase 1: MySQL com Drizzle, migrations e admin inicial aplicados no boot (com `GET_LOCK`).
- Login do painel: cookie `wf_admin` (httpOnly, SameSite=Lax) com token `aud: 'admin'`, rate limit de tentativas falhas, troca de senha obrigatória no primeiro acesso, sessões antigas derrubadas ao trocar a senha.
- CORS restrito a `CORS_ORIGINS` e escritas de outras origens recusadas.
- Painel com React Router: login, troca de senha, layout protegido e saída.
- **Ação necessária:** preencher `DB_*`, `JWT_SECRET` (`pnpm secrets`), `CORS_ORIGINS` e, no primeiro boot, `ADMIN_EMAIL`/`ADMIN_PASSWORD` no `.env`. Criar também o banco `<DB_NAME>_test` para os testes.

## 0.1.0

- Esqueleto do monorepo (fase 0): api com `/health`, site e painel com páginas placeholder, configs e documentação.
