# Seções do site

Cada seção do site público fica em `apps/web/src/sections/<Nome>/` e é ativada em `apps/web/src/site.config.ts`.
Documente aqui uma linha por seção: o que faz, a chave em `site_sections` e as props.

| Seção | Chave | Descrição |
|---|---|---|
| Header | `header` | Nome do site, logo (`logoMediaId`) e menu de navegação (`navItems`) |
| HeroVideo | `hero` | Título, subtítulo, vídeo MP4 (`videoMp4MediaId`) e/ou WebM (`videoWebmMediaId`), poster (`posterMediaId`, obrigatório com vídeo) e botão |
| Slider | `slider` | Carrossel de imagens |
| BlogList | (tabela `posts`) | Últimos posts |
| ContactForm | (tabela `form_submissions`) | Formulário de contato |
| Footer | `footer` | Texto e links do rodapé |
| SEO global | `seo` | Nome do site, título e descrição padrão, imagem de compartilhamento (`shareImageMediaId`) |

Os schemas ficam em `packages/shared/src/sections.ts` (`sectionRegistry`). Ao salvar uma seção, a API pede ao site a revalidação da tag `section:<chave>`.
