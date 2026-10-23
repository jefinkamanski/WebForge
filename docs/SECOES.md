# Seções do site

Cada seção do site público fica em `apps/web/src/sections/<Nome>/` e é ativada em `apps/web/src/site.config.ts`.
Documente aqui uma linha por seção: o que faz, a chave em `site_sections` e as props.

| Seção | Chave | Descrição |
|---|---|---|
| Header | `header` | Logo e menu de navegação |
| HeroVideo | `hero` | Vídeo (ou imagem) de destaque da home, título e botão |
| Slider | `slider` | Carrossel de imagens |
| BlogList | (tabela `posts`) | Últimos posts |
| ContactForm | (tabela `form_submissions`) | Formulário de contato |
| Footer | `footer` | Rodapé, contatos e redes sociais |
