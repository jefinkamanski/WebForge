---
description: Regras do painel administrativo (React + Vite, build estático)
applyTo: "apps/admin/**"
---

# Painel administrativo

- Estrutura por módulo em `src/modules/<modulo>/` (listagem, formulário, rotas, hooks).
- O painel é SPA estática: não depende de Node em produção. A rota `/admin` não deve ser indexada (`noindex`).
- Rotas protegidas por autenticação; redirecione para login se a sessão expirar.
- Formulários usam os schemas Zod de `packages/shared`; mostre erros por campo.
- Toda exclusão pede confirmação. Mostre estados de carregando, erro e vazio.
- Upload de imagem exige o campo `alt` (obrigatório para SEO e acessibilidade).
- Upload de vídeo: aceite apenas MP4/WebM já otimizados, exiba o limite de tamanho e oriente a comprimir (ver `docs/MIDIA.md`).
- Campos de SEO (title, description, imagem de compartilhamento) são editáveis em posts e nas configurações do site.
