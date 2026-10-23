---
description: Fase 2 - configurações do site (logo, vídeo da home) e upload de mídia
agent: agent
---

Leia [as instruções do projeto](../copilot-instructions.md) e [a arquitetura](../../docs/ARCHITECTURE.md). Use a skill `add-admin-module` (caminho A) e siga [media](../instructions/media.instructions.md).

**Tarefa:**
1. Módulo de mídia na API: upload com `sharp` (WebP + larguras responsivas), `alt` obrigatório, `StorageProvider` em disco (`UPLOAD_DIR`), exclusão que bloqueia se a mídia estiver em uso. Vídeo: aceitar apenas MP4/WebM, com poster.
2. Endpoints `GET/PUT /sections/:key` validados pelo `sectionRegistry` (seções: `header`, `hero`, `footer`, `seo_global`).
3. Painel: tela de configurações do site (logo, vídeo e poster da home, textos do header/footer, SEO global) e biblioteca de mídia.
4. Revalidação: ao salvar, a API pede revalidação das tags ao Next.js.

Plano antes de codar; typecheck, lint e testes ao final.
