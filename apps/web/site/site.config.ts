// CLIENTE: configuração deste site. É o primeiro arquivo a editar num fork novo
// (veja docs/NOVO-CLIENTE.md). Nome, título e descrição vêm da seção "SEO global",
// editada pelo cliente no painel.
import type { SectionKey } from '@webforge/shared';

export interface SiteConfig {
  locale: string;
  // Fuso das datas mostradas no site (posts)
  timeZone: string;
  // Blocos da home, na ordem em que aparecem. Cada chave precisa de um componente
  // em site/sections/index.ts. Cabeçalho e rodapé ficam no layout, em todas as páginas.
  homeSections: SectionKey[];
  // Política para crawlers de IA (GPTBot, ClaudeBot, PerplexityBot…) no robots.txt
  aiCrawlers: 'allow' | 'block';
  // Página /blog: título (h1) e descrição para buscadores
  blog: { title: string; description: string };
}

export const siteConfig: SiteConfig = {
  locale: 'pt-BR',
  timeZone: 'America/Sao_Paulo',
  homeSections: ['hero'],
  aiCrawlers: 'allow',
  blog: { title: 'Blog', description: 'Novidades, artigos e dicas.' },
};
