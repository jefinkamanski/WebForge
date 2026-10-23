# Deploy na Hostinger (hospedagem compartilhada com Node.js)

> Este guia é um ponto de partida. Os itens marcados com ⚠️ precisam ser **verificados no hPanel** antes de confiar neles, pois dependem do plano e podem mudar.

## 0. Pré-verificações
- ⚠️ **Plano:** a documentação oficial da Hostinger lista suporte a aplicações Node.js nos planos **Business** e **Cloud**. Confirme se o seu plano tem a opção **Node.js Apps** no hPanel.
- ⚠️ **Limite de apps Node:** este projeto usa **2** (web e api). O painel é estático.
- ⚠️ **Versão do Node:** selecione no hPanel uma versão compatível com `engines` do `package.json` (22+).
- ⚠️ **Monorepo:** verifique se o deploy via GitHub permite definir a **pasta raiz** de cada app (`apps/api`, `apps/web`). Se não permitir, use build local + upload, ou repositórios/branches de deploy separados.
- ⚠️ **Memória:** teste se o Next.js e a API cabem juntos nos limites do plano.

## 1. Banco de dados
1. No hPanel, crie um banco MySQL, um usuário e uma senha.
2. Anote host, nome do banco, usuário e senha para as variáveis de ambiente.
3. Não rode SQL manual: a API cria as tabelas sozinha no primeiro boot.

## 2. Subdomínios
Crie `api.cliente.com` e `admin.cliente.com` (e use `www` ou o domínio raiz para o site). Ative HTTPS em todos.

## 3. API (apps/api)
1. Crie um **Node.js App** apontando para `apps/api`, com comando de build e de start definidos em `package.json`.
2. Defina as variáveis de ambiente (ver `.env.example`):
   - `NODE_ENV=production`, `DB_*`, `DB_POOL_LIMIT=5`
   - `JWT_SECRET` (longo e aleatório), `COOKIE_DOMAIN=.cliente.com`
   - `CORS_ORIGINS=https://www.cliente.com,https://admin.cliente.com`
   - `WEB_URL=https://www.cliente.com`, `REVALIDATE_SECRET`
   - `ADMIN_EMAIL`, `ADMIN_PASSWORD` (usados só no primeiro boot)
   - `UPLOAD_DIR` (⚠️ veja a seção 6)
3. Inicie a app e confira os logs: devem aparecer as migrations aplicadas e o admin inicial criado.
4. Teste `https://api.cliente.com/health`.

## 4. Site (apps/web)
1. Crie um **Node.js App** (Next.js) apontando para `apps/web`.
2. Variáveis: `NEXT_PUBLIC_SITE_URL`, `API_INTERNAL_URL=https://api.cliente.com`, `REVALIDATE_SECRET` (o mesmo da API).
3. Teste a rota de revalidação e confira no código-fonte da página (Ctrl+U) que o conteúdo está no HTML.

## 5. Painel (apps/admin), estático
1. Defina `VITE_API_URL=https://api.cliente.com` e rode `pnpm --filter admin build`.
2. Envie o conteúdo de `apps/admin/dist` para a pasta `public_html` do subdomínio `admin`.
3. Para as rotas do React funcionarem ao recarregar a página, crie `.htaccess` ao lado do `index.html`:
   ```apache
   RewriteEngine On
   RewriteBase /
   RewriteRule ^index\.html$ - [L]
   RewriteCond %{REQUEST_FILENAME} !-f
   RewriteCond %{REQUEST_FILENAME} !-d
   RewriteRule . /index.html [L]
   ```

## 6. Uploads
⚠️ **Teste se a pasta de uploads sobrevive a um novo deploy.** Se o deploy substituir a pasta do app, os arquivos enviados pelo cliente seriam perdidos. Defina `UPLOAD_DIR` para um diretório **fora** da pasta do app, ou use armazenamento S3-compatível. Os arquivos enviados precisam ser servidos publicamente (diretamente ou pela API).

## 7. Primeiro acesso e checklist final
- [ ] Entrar no painel com `ADMIN_EMAIL`/`ADMIN_PASSWORD` e **trocar a senha**
- [ ] Remover `ADMIN_PASSWORD` das variáveis de ambiente após o primeiro acesso
- [ ] Enviar logo e vídeo do hero e conferir no site
- [ ] Publicar um post e confirmar a atualização do site (revalidação)
- [ ] Enviar o formulário de contato e ver o registro no painel
- [ ] Validar `sitemap.xml`, `robots.txt` e dados estruturados
- [ ] Rodar Lighthouse (mobile) e conferir LCP/CLS
- [ ] Configurar backups do banco (hPanel)
