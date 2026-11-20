# Arquitetura

Fonte de verdade das decisões do projeto. Se algo aqui mudar, atualize este arquivo na mesma mudança.

## 1. Objetivo

Plataforma open source para devs web criarem **sites institucionais** (header, vídeo, blog, formulários, footer) com **painel administrativo** para o cliente final editar o conteúdo sem mexer em código.

**Modelo de uso:** cada instalação atende **um único cliente**. O dev faz um fork (ou cópia) do projeto por cliente, personaliza o visual e as seções e publica numa VPS, que pode hospedar vários clientes.

## 2. Requisitos inegociáveis

1. **SEO e visibilidade para LLMs:** conteúdo no HTML inicial, metadata, JSON-LD, sitemap e robots.
2. **Desempenho:** LCP ≤ 2,5 s, INP ≤ 200 ms, CLS ≤ 0,1; imagens WebP; vídeo MP4 (H.264) com poster.
3. **Segurança por padrão:** ver a seção 9.
4. **Custo baixo:** uma VPS barata (ex.: Hostinger KVM 1: 1 vCPU, 4 GB de RAM, 50 GB NVMe) com Node.js, MySQL e nginx, dividida entre vários clientes.

## 3. Princípios

- **Simplicidade:** implementar o mínimo que atende ao pedido. Caso de borda fora do pedido vira sugestão, não código.
- **Núcleo × cliente:** o que vem do projeto original fica em `core/`; o que muda por cliente fica em `site/` (seção 5).
- **Convenções oficiais** de cada ferramenta. Na dúvida sobre versão ou API, consulte a documentação oficial.
- **Leve:** cada instalação divide a VPS com outros clientes, então nada de Redis, filas ou ffmpeg no servidor; pouca RAM e poucas conexões no banco. O mesmo cuidado mantém o projeto viável em hospedagem compartilhada com Node.js.

## 4. Topologia de produção

```
www.cliente.com     -> apps/web    Next.js (1 app Node)
api.cliente.com     -> apps/api    Express (1 app Node)
admin.cliente.com   -> apps/admin  build estático do Vite (sem Node)
MySQL (da hospedagem) <- apps/api
```

- O **site** lê o conteúdo no servidor com uma chamada a `GET /site` (todas as seções, com as mídias já resolvidas em URL).
- O **painel** fala com a API pelo navegador, com cookie de sessão compartilhado em `.cliente.com`.
- Ao salvar conteúdo, a **API** pede ao site `POST /api/revalidate` com `REVALIDATE_SECRET`, e o Next.js regenera só o que mudou.
- Imagens e vídeos são servidos pela API; o site monta as URLs com `API_PUBLIC_URL` (pública), e lê o conteúdo por `API_INTERNAL_URL` (pode ser interna).

## 5. Estrutura de diretórios

```
webForgeV2/
├─ apps/
│  ├─ api/                       NÚCLEO: não muda por cliente
│  │  └─ src/
│  │     ├─ server.ts            boot: env → migrations/seed (GET_LOCK) → listen
│  │     ├─ app.ts               middlewares, rotas dos módulos, erros
│  │     ├─ config/env.ts        variáveis validadas com Zod
│  │     ├─ db/                  schema.ts, client.ts, bootstrap.ts, migrations/
│  │     ├─ http/                HttpError, error handler, origin guard
│  │     ├─ modules/             auth/, sections/ (inclui GET /site), media/, revalidation/, posts/, forms/, mail/
│  │     └─ storage/             gravação em disco (UPLOAD_DIR)
│  ├─ admin/
│  │  ├─ public/.htaccess        rotas da SPA + cabeçalhos de segurança (vai junto no build)
│  │  └─ src/
│  │     ├─ core/                NÚCLEO: routes.tsx, layout/, ui/, lib/ (cliente da API), modules/ (auth, mídia, seções, posts)
│  │     └─ site/sections/       CLIENTE: formulário de cada seção (HeroForm.tsx…) e o registro sectionForms
│  └─ web/
│     ├─ app/                    páginas: /, /blog, /blog/pagina/[page], /blog/[slug], /contato, sitemap, robots
│     ├─ core/                   NÚCLEO: env, leitura da API (site.ts), SEO/JSON-LD, revalidação, SmartLink
│     └─ site/                   CLIENTE
│        ├─ site.config.ts       idioma, blocos da home, política de crawlers de IA
│        ├─ theme.css            cores e fontes (@theme do Tailwind)
│        ├─ sections/            Header, Footer e os blocos da home (Hero.tsx…), registro em index.ts
│        └─ blog/                visual do blog: PostCard, BlogIndex (lista) e PostArticle (post)
├─ packages/shared/src/
│  ├─ core/                      NÚCLEO: schemas de auth e mídia, defineSection(), imageField(), videoField(), linkListField()
│  └─ site/                      CLIENTE: registro e schemas das seções (sections/hero.ts…)
├─ docs/
├─ scripts/gerar-segredos.mjs
└─ uploads/                      só em desenvolvimento
```

**Regra de ouro:** o upstream altera `core/` e a API; o fork do cliente altera só as pastas `site/`. Assim, `git pull upstream main` traz correções sem conflitar com a personalização (ver `docs/ATUALIZANDO.md`).

## 6. Stack e decisões

| Área          | Escolha                                | Motivo                                                                       | Entra na fase |
| ------------- | -------------------------------------- | ---------------------------------------------------------------------------- | ------------- |
| Site público  | Next.js (App Router)                   | SSR/SSG/ISR para SEO e velocidade                                            | 0             |
| Painel        | React + Vite (estático) + React Router | Sem SEO, leve, não ocupa processo Node                                       | 0 / 1         |
| API           | Express 5 + TypeScript                 | Simples e conhecida                                                          | 0             |
| Banco         | MySQL 8 (compatível com MariaDB)       | Disponível em planos baratos                                                 | 1             |
| ORM           | Drizzle + mysql2                       | Leve, tipado, migrator programático                                          | 1             |
| Validação     | Zod em `packages/shared`               | Contrato único entre os apps                                                 | 0             |
| Estilo        | Tailwind CSS v4                        | Tokens do tema em `site/theme.css`                                           | 0             |
| Senhas        | `bcryptjs`                             | JS puro, sem compilação nativa                                               | 1             |
| Sessão        | JWT (HS256) em cookie httpOnly         | Sem estado no servidor                                                       | 1             |
| Imagens       | `sharp`                                | Binários pré-compilados; única dependência nativa aceita                     | 2             |
| Upload        | `multer` (direto para disco)           | Nunca carrega o arquivo inteiro na memória                                   | 2             |
| Editor visual | TipTap 3 (só no painel)                | Editor de texto pronto e acessível; carregado só na tela do post             | 4             |
| E-mail        | `nodemailer` (SMTP)                    | Padrão do Node, sem serviço pago obrigatório; troca de provedor só no `.env` | 5             |

Cada dependência entra só na fase que a usa. Dependência nova precisa de justificativa (RAM e build limitados na hospedagem).

O `packages/shared` é compilado (`dist/`) porque a API roda JS em produção. Os scripts `dev`, `typecheck` e `test` da raiz já fazem esse build antes.

## 7. Banco de dados

Todas as tabelas têm `id`, `created_at` e `updated_at`, em `utf8mb4`.

| Tabela             | Campos principais                                                                                                                         | Fase |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------- | ---- |
| `admin_users`      | email (único), password_hash, name, must_change_password                                                                                  | 1    |
| `site_sections`    | key (único), content (JSON validado pelo schema da seção)                                                                                 | 2    |
| `media`            | kind (image/video), storage_key, mime, size, width, height, alt                                                                           | 2    |
| `posts`            | slug (único), title, excerpt, content (JSON do editor), cover_media_id (FK), seo_title, seo_description, status, published_at, deleted_at | 4    |
| `form_submissions` | form_key, data (JSON), read_at                                                                                                            | 5    |
| `form_settings`    | form_key (único), notify_email, send_confirmation                                                                                         | 5    |

Sem coluna `role` (um único administrador; multiusuário está fora de escopo) e sem `variants` na mídia (seção 8).

O nome `admin_users` é proposital: uma futura área de usuário do site usaria uma tabela própria, sem misturar contas do painel com contas públicas (seção 12).

### Migrations automáticas no boot

O deploy não tem passo manual de banco (e hospedagens mais simples nem dão terminal), então a API aplica as migrations ao iniciar:

1. Obtém `GET_LOCK('webforge_bootstrap')` numa conexão dedicada.
2. Aplica só as migrations pendentes (migrator do Drizzle).
3. Seed apenas com tabela vazia: admin inicial (`ADMIN_EMAIL`/`ADMIN_PASSWORD`, troca de senha obrigatória). Com a tabela vazia e sem essas variáveis, a API não sobe e diz o motivo; depois do primeiro boot elas podem ser removidas.
4. Libera o lock e só então começa a ouvir requisições.

Para mudar o schema: edite `apps/api/src/db/schema.ts` e rode `pnpm --filter @webforge/api db:generate`, que cria o SQL em `src/db/migrations/` sem conectar ao banco.

**Reiniciar nunca apaga dados.** Nunca edite uma migration publicada; crie uma nova. Reset destrutivo, se existir, é comando manual e bloqueado em produção.

**Forks não criam migration.** As migrations são do núcleo. Listas pequenas do cliente (depoimentos, equipe, FAQ) são seções com array.

## 8. Seções e mídia

### Seções

Uma seção é um conteúdo editável de registro único (header, hero, footer, SEO…), guardado em `site_sections`.

- Definida com `defineSection({ key, label, schema })` em `packages/shared/src/site/sections/` e registrada com `registerSections(...)` em `packages/shared/src/site/index.ts`.
- **Todo campo tem `.default()`.** O padrão da seção sai do próprio schema (`defineSection` falha na importação se faltar algum), e um campo novo não invalida o conteúdo já salvo.
- Campos prontos do núcleo: `imageField()` e `videoField()` (id de mídia com o tipo marcado), `hrefField()` (link opcional) e `linkListField(max)` (lista de links). Links só aceitam caminho, âncora, http(s), `mailto:` e `tel:`.
- A API confere a existência e o tipo de cada mídia ao salvar, achando os campos de mídia pelo schema (inclusive dentro de listas).
- Leitura tolerante: campos ausentes recebem o padrão. Se o conteúdo salvo ainda assim for inválido, a API usa o padrão da seção **e registra um aviso no log**.
- `GET /site` (público) devolve todas as seções com as mídias resolvidas: imagem `{ url, width, height, alt }`, vídeo `{ url, mime, alt }`, ou `null` se a mídia sumiu. O tipo é `SiteContent`, de `packages/shared`.
- `GET /sections/:key` e `PUT /sections/:key` (com login) leem e gravam o conteúdo bruto (com ids) junto com as mídias citadas. O `PUT` valida, grava e pede revalidação da tag `section:<key>`.
- Erros de validação voltam por caminho do campo (`navItems.0.href`), e o painel os mostra no campo certo.
- No painel, cada seção aparece no menu lateral (na ordem de `registerSections`), em "Seções do site" ou, com `group: 'settings'` no `defineSection`, em "Configurações" (ex.: SEO global) e tem um formulário em `apps/admin/src/site/sections/`, registrado em `sectionForms`. O TypeScript acusa seção sem formulário.
- A página **Mídia** do painel é só a galeria (texto alternativo e exclusão). Arquivos novos são enviados pelo campo de mídia da seção, no seletor.

Passo a passo para criar uma seção: `docs/SECOES.md`.

### Mídia

- **Imagens:** JPG, PNG ou WebP, com o tipo validado pelo conteúdo (não pela extensão). Convertidas pelo `sharp` para **uma** WebP de até 1920 px, com orientação aplicada e sem metadados (EXIF/GPS), uma por vez (pouca RAM). O `next/image` gera os tamanhos responsivos.
- **Vídeo:** só **MP4** (reconhecido pela caixa `ftyp`), já otimizado, sem transcodificação no servidor. O poster é obrigatório no hero. Ver `docs/MIDIA.md`.
- **Texto alternativo (`alt`)** obrigatório em toda mídia; editá-lo revalida as seções que usam a mídia.
- **Armazenamento:** disco em `UPLOAD_DIR` (fora da pasta do app em produção), uma pasta por mídia com nome gerado pelo servidor (`<uuid>/image.webp`), chaves validadas contra path traversal. O upload vai direto para `UPLOAD_DIR/.tmp` (multer) e o temporário é sempre apagado.
- **Servidos** pela API em `/uploads/<uuid>/<arquivo>`, com cache imutável e `Cross-Origin-Resource-Policy: cross-origin` (site e painel ficam em outras origens). A pasta `.tmp` nunca é servida. A API devolve URLs relativas (`/uploads/...`); quem consome prefixa com a URL pública da API.
- **Rotas (com login):** `POST /media` (multipart: `file` e `alt`), `GET /media` (paginado, filtro por tipo), `PATCH /media/:id` (alt), `DELETE /media/:id`. A exclusão é bloqueada com `409` quando a mídia está em uso, informando onde.
- Limites de tamanho são constantes em `packages/shared` (imagem 8 MB, vídeo 25 MB), conferidos no painel antes do envio e na API.

### Blog

- **Posts** em `posts` (núcleo). Rascunho ou publicado; a data de publicação é a da primeira vez (despublicar e republicar a mantém). Excluir manda para a lixeira (`deleted_at`); a exclusão definitiva só sai da lixeira.
- **Texto:** o painel usa um editor visual (TipTap) e guarda o documento em JSON. O `postDocSchema` (`packages/shared`) aceita só parágrafo, títulos H2/H3, listas, citação, linha, imagem da biblioteca, negrito, itálico e link seguro; o resto é recusado ao salvar. O site monta o HTML a partir desse JSON (`core/RichText.tsx`), nunca com HTML cru.
- **Imagens:** capa e imagens do texto vêm da biblioteca de mídia (id), validadas ao salvar e resolvidas para o site. Mídia usada por um post (inclusive na lixeira) não pode ser excluída.
- **Rotas:** `/posts` (painel, com login): listar (filtro por situação e lixeira), criar, editar, `DELETE` (lixeira), `POST /:id/restore`, `DELETE /:id/permanent`. Públicas: `GET /site/posts` (publicados, paginado), `GET /site/posts/slugs` e `GET /site/posts/:slug`. O corpo de `/posts` aceita até 1 MB (o resto da API, 100 kB) e só é lido depois do login.
- **Site:** `/blog` (12 por página, demais em `/blog/pagina/N`) e `/blog/[slug]`, geradas no primeiro acesso e em cache com a tag `posts`, revalidada quando um post publicado muda. Resumo vazio vira o começo do texto; SEO vazio usa título e resumo.

### Formulários e e-mail

- **Definidos no código** com `defineForm({ key, label, fields, emailField })` em `packages/shared/src/site/forms/` e registrados com `registerForms(...)`. O consentimento (`consent: true`) é acrescentado a todo formulário. Passo a passo: `docs/FORMULARIOS.md`.
- **Envio público** `POST /site/forms/:key`, feito pelo navegador a partir do site (CORS e origin guard já liberam o site): rate limit por IP, honeypot (`website`) descartado em silêncio e validação pelo schema. Sem cookies.
- **Painel** `/forms` (com login): resumo de cada formulário (total, não lidos, configuração), envios paginados com filtro de não lidos, marcar como lido, exclusão definitiva, configuração (e-mail de aviso, confirmação) e e-mail de teste.
- **E-mail:** módulo do núcleo `mail/mailer.ts` (nodemailer, SMTP do `.env`), também previsto para e-mails de conta no futuro. A cada envio, aviso para o e-mail do painel e confirmação para quem preencheu, sem segurar a resposta. Detalhes, provedores e segurança: `docs/EMAIL.md`.

## 9. Segurança

| Tema               | Regra                                                                                                                                                                                                                                                                    |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Configuração       | Variáveis validadas com Zod no boot; a API não sobe com valor inválido. Segredos gerados com `pnpm secrets`, diferentes em cada instalação                                                                                                                               |
| Senhas             | `bcryptjs` (custo 12); hash descartável no login de e-mail inexistente (mesmo tempo de resposta)                                                                                                                                                                         |
| Sessão             | Cookie `wf_admin`: `httpOnly`, `Secure` em produção, `SameSite=Lax`, `Domain=.cliente.com`. O token tem `aud: 'admin'`, e as rotas do painel recusam qualquer outro valor. Ele carrega uma impressão digital do hash da senha: trocar a senha derruba as sessões antigas |
| Login              | Rate limit contando só tentativas falhas; troca de senha obrigatória no primeiro acesso                                                                                                                                                                                  |
| CSRF               | `SameSite=Lax` + escritas com `Origin` fora de `CORS_ORIGINS` recusadas (403)                                                                                                                                                                                            |
| CORS               | Restrito ao site e ao painel, com `credentials`                                                                                                                                                                                                                          |
| Cabeçalhos         | `helmet` na API; `next.config.ts` no site; `.htaccess` no painel (inclui `noindex` e CSP a ajustar por cliente)                                                                                                                                                          |
| Uploads            | Tipo pelo conteúdo, tamanho limitado, gravação direto em disco, nome gerado pelo servidor                                                                                                                                                                                |
| Formulário público | Rate limit por IP, honeypot, validação Zod e consentimento obrigatório; a confirmação por e-mail não repete o que foi escrito (`docs/EMAIL.md`)                                                                                                                          |
| Erros e logs       | Error handler central; em produção sem stack e sem dados pessoais nos logs                                                                                                                                                                                               |

## 10. SEO e performance

- Server Components por padrão; `"use client"` só onde há interação real.
- `generateMetadata`, canonical, Open Graph; um `h1` por página; HTML semântico.
- JSON-LD: `Organization`, `WebSite`, `BlogPosting`, `BreadcrumbList`.
- `sitemap.ts` e `robots.ts` gerados a partir dos dados; crawlers de IA conforme `site.config.ts`.
- `next/image` e `next/font`; vídeo do hero `muted autoplay loop playsInline`, `preload="metadata"`, poster e respeito a `prefers-reduced-motion`.
- Cache por tags com revalidação sob demanda. Conteúdo pronto no HTML, sem tela de carregamento.

### Como o site lê o conteúdo

- `getSite()` (`apps/web/core/site.ts`) faz um único `fetch` de `GET /site` com as tags `site` e `section:<key>` de cada seção e `revalidate` de 1 hora (rede de segurança). Layout, página e metadata reaproveitam a mesma resposta.
- Modelo de cache "anterior" do Next.js (`fetch` com `next.tags`), sem `cacheComponents`: é o mais simples e basta para conteúdo editado poucas vezes por dia.
- `POST /api/revalidate` confere o segredo em tempo constante, valida as tags e chama `revalidateTag(tag, { expire: 0 })`: o próximo acesso já vê o conteúdo novo.
- **API fora do ar no build:** as páginas são geradas com o conteúdo padrão das seções (com um aviso no log) e se corrigem na primeira revalidação. Fora do build, um erro da API mantém a última versão boa em cache.
- **Layout:** Header e Footer em todas as páginas; a home mostra os blocos de `siteConfig.homeSections`, cada um com seu componente em `site/sections/index.ts`. Nome, título e descrição do site vêm da seção SEO global (editada no painel), não do código.
- **Hero:** o poster (`next/image` com `preload`) é o LCP e fica por baixo do vídeo; quem prefere menos movimento (`prefers-reduced-motion`) vê só o poster.
- **`next/image`:** só aceita imagens de `API_PUBLIC_URL/uploads/**` (`remotePatterns`); IP local só é liberado quando a API está em localhost.

## 11. Privacidade (LGPD)

Formulário com aviso de privacidade e consentimento; coletar só o necessário; o painel permite excluir envios; nenhum dado pessoal em logs.

## 12. Fora de escopo (por ora)

Vários sites por instalação, multi-idioma, múltiplos usuários com permissões, e-commerce, transcodificação de vídeo no servidor e armazenamento S3 (entra quando houver um caso real).

### Caminho previsto: área de usuário no site

Se um cliente precisar que visitantes entrem no site (ex.: consultar um cadastro), o plano é:

- **Conta separada do admin:** tabela própria (ex.: `members`), cookie próprio (ex.: `wf_member`) e token com `aud: 'member'`. Um token de usuário nunca abre rotas do painel.
- **Páginas dinâmicas só onde há dado pessoal:** a área (ex.: `app/conta/`) lê o cookie no servidor, repassa à API e responde com `Cache-Control: private, no-store`. Página com dado pessoal nunca entra em cache estático ou ISR, ou um usuário veria os dados de outro.
- **Dados específicos do cliente:** como forks não criam migration (seção 7), a escolha fica para o primeiro caso real: uma tabela genérica do núcleo com conteúdo JSON validado por schema em `site/` (como as seções), ou migrations do cliente numa pasta própria, com prefixo nas tabelas e controle separado.
- **Entram junto:** envio de e-mail pelo mesmo `mailer.ts` dos formulários, para confirmar cadastro e recuperar senha (ver "Contas de usuário" em `docs/EMAIL.md`); rate limit no cadastro e no login; LGPD (o titular vê e exclui os próprios dados).
- **Hospedagem:** páginas dinâmicas usam mais memória do Node; medir antes de liberar.
