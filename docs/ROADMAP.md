# Roteiro

Uma fase por vez, cada uma terminando com `pnpm typecheck && pnpm lint && pnpm test && pnpm build` passando.

| Fase | Entrega                                                                                                                                                                                   | Status |
| ---- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| 0    | Esqueleto: monorepo, configs, docs, `/health`, páginas placeholder                                                                                                                        | ✅     |
| 1    | Banco e auth: Drizzle, migrations no boot (GET_LOCK), admin inicial (`admin_users`), login, troca de senha, sessão (cookie `wf_admin`, `aud: 'admin'`); painel com rotas e telas de login | ✅     |
| 2    | Seções e mídia: `defineSection`, `imageField`/`videoField`, `GET /site`, `PUT /sections/:key`, upload (WebP única, MP4), biblioteca no painel; seções header, hero, footer e SEO          | ✅     |
| 3    | Home pública: Header, Hero e Footer lendo `GET /site`, metadata, JSON-LD, sitemap, robots, rota de revalidação                                                                            | ✅     |
| 4    | Blog: tabela `posts`, CRUD na API e no painel, páginas `/blog` e `/blog/[slug]`                                                                                                           | ✅     |
| 5    | Formulários: envio público com rate limit e honeypot, consulta e exclusão no painel (LGPD)                                                                                                | ✅     |
| 6    | Qualidade: CI (install, lint, typecheck, test, build) e Lighthouse CI com orçamentos                                                                                                      | ⬜     |
| 7    | Deploy numa VPS (ex.: Hostinger KVM 1): preparação do servidor (Node, MySQL, nginx, SSL), serviços, deploy, backup e guia `DEPLOY-VPS.md`; validar memória, uploads, boot e revalidação   | ⬜     |

O deploy ficou por último: o alvo agora é uma VPS (ex.: Hostinger KVM 1, com 4 GB de RAM), sem os limites de memória e de apps da hospedagem compartilhada que justificavam testá-lo cedo. O projeto continua leve, porque a mesma VPS pode hospedar vários clientes.
