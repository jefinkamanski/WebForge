---
description: Fase 6 - qualidade (Lighthouse CI, testes) e preparação do deploy na Hostinger
agent: agent
---

Leia [as instruções do projeto](../copilot-instructions.md) e [o guia de deploy](../../docs/DEPLOY-HOSTINGER.md).

**Tarefa:**
1. Lighthouse CI no GitHub Actions com orçamentos: LCP ≤ 2,5 s, CLS ≤ 0,1, performance ≥ 90, SEO ≥ 95, acessibilidade ≥ 95. O PR falha se estourar.
2. Pipeline de CI: install, lint, typecheck, test e build.
3. Revisar o guia de deploy, apontando o que ainda precisa de verificação manual no hPanel.
4. Conferir `README.md` e `CONTRIBUTING.md`: um dev novo deve rodar o projeto em menos de 10 minutos.
5. Revisão de segurança: cookies, CORS, rate limits, headers e variáveis de ambiente.

Plano antes de codar.
