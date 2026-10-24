# Arquitetura

Fonte de verdade das decisões do projeto. Se algo aqui mudar, atualize este arquivo no mesmo PR.

## 1. Objetivo
Plataforma open source que permite a devs web criarem sites institucionais (header, vídeo/slide, blog, formulários, footer) com painel administrativo para o cliente editar o conteúdo.

## 2. Requisitos inegociáveis
1. **SEO e visibilidade para LLMs:** conteúdo no HTML inicial, metadata, JSON-LD, sitemap e robots.
2. **Desempenho exemplar:** LCP ≤ 2,5 s, INP ≤ 200 ms, CLS ≤ 0,1; imagens WebP; vídeo MP4 (H.264) + WebM.
3. **Convenções oficiais** de cada ferramenta, consultando o Context7 em caso de dúvida.
4. **Custo baixo:** roda em hospedagem compartilhada com Node.js (ex.: Hostinger Business), MySQL, sem VPS.

## 3. Topologia de produção
```
www.cliente.com     -> apps/web    (Next.js, 1 app Node)
api.cliente.com     -> apps/api    (Express, 1 app Node)
admin.cliente.com   -> apps/admin  (build estático do Vite, sem Node)
MySQL (da hospedagem) <- apps/api
```
- Login via cookie httpOnly com domínio `.cliente.com`, CORS restrito aos dois subdomínios.
- Quando o cliente publica algo, a API chama `POST {WEB_URL}/api/revalidate` com `REVALIDATE_SECRET`, e o Next.js regenera só o que mudou (ISR sob demanda).

## 4. Estrutura do monorepo (pnpm workspaces)
```
apps/api          API (routes -> controller -> service), db/ (Drizzle)
apps/web          Next.js App Router, sections/, lib/api.ts, lib/seo.ts, site.config.ts
apps/admin        Vite, modules/ (auth, site-settings, media, posts, submissions)
packages/shared   Schemas Zod, tipos, sectionRegistry
packages/ui       Componentes React base
```

## 5. Stack e decisões
| Área | Escolha | Motivo |
|---|---|---|
| Site público | Next.js (App Router) | SSR/SSG/ISR para SEO e velocidade, ainda React |
| Painel | React + Vite (estático) | Sem SEO, leve, não ocupa processo Node |
| API | Express + TypeScript | Simples e conhecida por contribuidores |
| Banco | MySQL 8 (compatível MariaDB) | Disponível em planos baratos |
| ORM | Drizzle + mysql2 | Leve, tipado, migrator programático |
| Validação | Zod em `packages/shared` | Contrato único front/back |
| Estilo | Tailwind CSS | Padrão do projeto |
| Senhas | `bcryptjs` | JS puro, sem compilação nativa |
| Imagens | `sharp` | Binários pré-compilados; única dependência nativa aceita |

## 6. Banco de dados
Tabelas iniciais (todas com `id`, `created_at`, `updated_at`; `utf8mb4`):
- `users`: email (único), password_hash, name, role, must_change_password
- `site_sections`: `key` (único), `content` (JSON validado por Zod)
- `media`: kind (image/video), storage_key, mime, size, width, height, alt, variants (JSON)
- `posts`: slug (único), title, excerpt, content, cover_media_id, seo_title, seo_description, status (draft/published), published_at, deleted_at
- `form_submissions`: form_key, data (JSON), read_at, user_agent
- Controle de migrations: tabela gerida pelo Drizzle.

### Dois tipos de conteúdo
- **Seção de conteúdo fixo** (header, hero, footer, logo, SEO global): um registro em `site_sections`. Criar uma nova seção = registrar um schema Zod no `sectionRegistry`. **Sem migration.**
- **Entidade com lista/busca/paginação** (posts, envios, depoimentos): tabela própria, criada por **migration**.

### Migrations automáticas no boot
Como a hospedagem compartilhada não garante terminal, a API aplica as migrations ao iniciar:
1. Obtém `GET_LOCK('app_bootstrap')` (evita duas instâncias migrando juntas).
2. Aplica apenas as migrations pendentes (migrator do Drizzle).
3. Seed apenas se as tabelas estiverem vazias: admin inicial (`ADMIN_EMAIL`/`ADMIN_PASSWORD`, troca de senha obrigatória) e seções padrão.
4. Libera o lock e só então começa a ouvir requisições.

Garantias: primeira execução cria tudo; as seguintes só aplicam novidades; **reiniciar nunca apaga dados**; DDL do MySQL não é transacional, então as migrations são idempotentes e pequenas. Reset destrutivo, se existir, é comando manual e bloqueado em produção.

## 7. Mídia
- Imagens: validação de tipo real e tamanho, conversão para WebP em várias larguras (`sharp`), `alt` obrigatório.
- Vídeo: sem transcodificação no servidor; aceita MP4 (H.264) e WebM já otimizados, mais poster. Ver `docs/MIDIA.md`.
- Armazenamento por `StorageProvider` (disco em `UPLOAD_DIR` ou S3-compatível). Exclusão remove variantes e é bloqueada se a mídia estiver em uso.
- Os arquivos são servidos pela API em `/uploads/<id>/<arquivo>` (nomes gerados pelo servidor, cache imutável, `Cross-Origin-Resource-Policy: cross-origin`). Imagens: `/uploads/<id>/<largura>.webp`; vídeo: `/uploads/<id>/video.mp4|webm`.
- Rotas (todas exigem login): `POST /media` (multipart, campos `file` e `alt`), `GET /media` (paginado, `kind`), `GET /media/limits`, `GET|PATCH|DELETE /media/:id`, `GET /media/:id/usage`.

## 7.1 Seções e revalidação
- `GET /sections/:key` é público (o Next.js lê no servidor); `PUT /sections/:key` exige login e valida com o schema do `sectionRegistry`, incluindo a existência e o tipo (imagem ou vídeo) das mídias referenciadas.
- Conteúdo salvo fora do schema atual volta ao padrão no `GET`, em vez de quebrar o site.
- Após salvar, a API chama `POST {WEB_URL}/api/revalidate` (header `x-revalidate-secret`, corpo `{ "tags": ["section:<chave>"] }`). Falhas são só registradas em log. A rota no Next.js é implementada na fase do site público.

## 7.2 Proteção contra CSRF
Além de `SameSite=Lax`, escritas (POST/PUT/PATCH/DELETE) com cabeçalho `Origin` fora de `CORS_ORIGINS` são rejeitadas com 403.

## 8. SEO e visibilidade para LLMs
- Conteúdo no HTML inicial; `generateMetadata`; canonical; Open Graph; um `h1` por página.
- JSON-LD: `Organization`, `WebSite`, `BlogPosting`, `BreadcrumbList`.
- `sitemap.xml` e `robots.txt` gerados dos dados; política de crawlers de IA configurável.
- `llms.txt`: opcional e de baixa prioridade (sem comprovação de uso pelos crawlers).

## 9. Performance
Server Components por padrão, JS de cliente mínimo, `next/image` e `next/font`, vídeo do hero com poster e `preload="metadata"`, cache por tags com revalidação sob demanda, Lighthouse CI no pipeline.

## 10. Privacidade (LGPD)
Formulário com aviso de privacidade e consentimento; coletar apenas o necessário; o painel permite excluir envios; não registrar dados pessoais em logs.

## 11. Fora de escopo (por ora)
Multi-idioma, múltiplos usuários com permissões avançadas, e-commerce, transcodificação de vídeo no servidor.
