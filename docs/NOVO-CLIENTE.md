# Novo cliente

Checklist para criar o site de um cliente a partir do WebForge.

## 1. Criar a cópia

```bash
git clone https://github.com/<você>/webforge.git cliente-x
cd cliente-x
git remote rename origin upstream
git remote add origin https://github.com/<você>/cliente-x.git
```

Assim o repositório do cliente continua recebendo correções do WebForge (veja `docs/ATUALIZANDO.md`).

## 2. Rodar localmente

```bash
cp .env.example .env
pnpm secrets          # cole os valores no .env
pnpm install
pnpm dev
```

## 3. Personalizar (só as pastas `site/`)

- [ ] `apps/web/site/site.config.ts`: idioma, fuso das datas, blocos da home (`homeSections`), política de crawlers de IA. Nome, título e descrição o cliente preenche no painel, em Configurações → SEO global
- [ ] `apps/web/site/theme.css`: cores e fontes do cliente
- [ ] Seções novas: `docs/SECOES.md`
- [ ] Componentes das seções em `apps/web/site/sections/` (registro em `index.ts`)
- [ ] Blog: título e descrição em `siteConfig.blog`; visual em `apps/web/site/blog/`. Para aparecer no menu, o cliente adiciona o link `/blog` no Cabeçalho, pelo painel

- [ ] Formulários novos: `docs/FORMULARIOS.md`. No painel, em Formulários, cadastre o e-mail que recebe os avisos e use "Enviar e-mail de teste"
- [ ] E-mail: configure `SMTP_*` e `MAIL_FROM` com uma caixa do domínio do cliente e SPF/DKIM/DMARC (`docs/EMAIL.md`)

Não altere `core/` nem `apps/api` no repositório do cliente. Se algo do núcleo precisar mudar, faça a mudança no WebForge e traga pelo upstream.

## 4. Publicar

O guia de deploy em VPS (`docs/DEPLOY-VPS.md`) chega na última fase do roteiro. Para hospedagem compartilhada, siga `docs/DEPLOY-HOSTINGER.md` (ainda não validado).
