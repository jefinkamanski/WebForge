# Deploy na Hostinger (hospedagem compartilhada com Node.js)

> **Alternativa, ainda não validada.** O alvo do projeto agora é uma VPS (guia `DEPLOY-VPS.md` na última fase do `docs/ROADMAP.md`). Este guia fica para quem preferir hospedagem compartilhada com Node.js; os itens com ⚠️ precisam ser **verificados no hPanel**, porque dependem do plano e podem mudar.

## 0. Pré-verificações

- ⚠️ **Plano:** confirme que o plano tem a opção **Node.js Apps** (Business ou Cloud).
- ⚠️ **Limite de apps Node:** cada cliente usa **2** (web e api). O painel é estático.
- ⚠️ **Versão do Node:** 22 ou superior.
- ⚠️ **Monorepo:** confirme se o deploy permite definir a **pasta raiz** de cada app (`apps/api`, `apps/web`). Se não permitir, use build local + upload.
- ⚠️ **Memória:** confirme que o Next.js e a API cabem juntos nos limites do plano.

## 1. Segredos e variáveis

1. Rode `pnpm secrets` na sua máquina e guarde os dois valores (`JWT_SECRET` e `REVALIDATE_SECRET`). Use valores novos para cada cliente.
2. As variáveis de cada app estão no `.env.example`. Em produção elas vão no painel da hospedagem, nunca num arquivo commitado.

## 2. Banco de dados

1. No hPanel, crie um banco MySQL, um usuário e uma senha.
2. Não rode SQL manual: a API cria as tabelas sozinha no primeiro boot.

## 3. Subdomínios

Crie `api.cliente.com` e `admin.cliente.com` (e use `www` ou o domínio raiz para o site). Ative HTTPS em todos.

## 4. API (apps/api)

1. Crie um **Node.js App** apontando para `apps/api`, com os comandos `build` e `start` do `package.json`.
2. Variáveis:
   - `NODE_ENV=production`, `TRUST_PROXY=1`, `DB_*`, `DB_POOL_LIMIT=5`
   - `JWT_SECRET`, `COOKIE_DOMAIN=.cliente.com`
   - `CORS_ORIGINS=https://www.cliente.com,https://admin.cliente.com`
   - `WEB_URL=https://www.cliente.com`, `REVALIDATE_SECRET`
   - `ADMIN_EMAIL`, `ADMIN_PASSWORD` (usados só no primeiro boot)
   - `UPLOAD_DIR` (veja a seção 7)
   - `SMTP_*` e `MAIL_FROM`, para os e-mails dos formulários (`docs/EMAIL.md`)
3. Inicie a app e confira nos logs as migrations aplicadas e o admin criado.
4. Teste `https://api.cliente.com/health`.

## 5. Site (apps/web)

1. Crie um **Node.js App** (Next.js) apontando para `apps/web`.
2. Variáveis: `NEXT_PUBLIC_SITE_URL=https://www.cliente.com`, `API_INTERNAL_URL=https://api.cliente.com`, `API_PUBLIC_URL=https://api.cliente.com` e o mesmo `REVALIDATE_SECRET` da API. Em produção as três URLs são obrigatórias.
   - Suba a API antes do site: se ela estiver fora do ar no build, as páginas saem com o conteúdo padrão e só se corrigem na primeira revalidação (salvar qualquer seção no painel resolve).
3. Abra o código-fonte da página (Ctrl+U) e confira que o conteúdo está no HTML.

## 6. Painel (apps/admin), estático

1. Em `apps/admin/public/.htaccess`, troque `api.cliente.com` pela URL da API e descomente a linha do `Content-Security-Policy`.
2. Defina `VITE_API_URL=https://api.cliente.com` e rode `pnpm --filter @webforge/admin build`.
3. Envie o conteúdo de `apps/admin/dist` (inclui o `.htaccess`) para a pasta `public_html` do subdomínio `admin`.

## 7. Uploads

⚠️ **Teste se a pasta de uploads sobrevive a um novo deploy.** Se o deploy substituir a pasta do app, os arquivos do cliente seriam perdidos. Aponte `UPLOAD_DIR` para um diretório **fora** da pasta do app.

## 8. Primeiro acesso e checklist final

- [ ] Entrar no painel com `ADMIN_EMAIL`/`ADMIN_PASSWORD` e **trocar a senha**
- [ ] Remover `ADMIN_PASSWORD` das variáveis de ambiente
- [ ] Enviar logo e vídeo do hero e conferir no site
- [ ] Salvar uma seção e confirmar que o site atualizou (revalidação)
- [ ] Enviar o formulário de contato e ver o registro no painel
- [ ] Validar `sitemap.xml`, `robots.txt` e dados estruturados
- [ ] Rodar o Lighthouse (mobile) e conferir LCP e CLS
- [ ] Conferir os cabeçalhos de segurança (por exemplo, em securityheaders.com)
- [ ] Configurar backups do banco e da pasta de uploads
