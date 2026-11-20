import type { MetadataRoute } from 'next';
import { env } from '@/core/env';
import { siteConfig } from '@/site/site.config';

// Robôs de IA (treino, busca e assistentes) bloqueados quando aiCrawlers = 'block'
const AI_CRAWLERS = [
  'GPTBot',
  'OAI-SearchBot',
  'ChatGPT-User',
  'ClaudeBot',
  'Claude-SearchBot',
  'Claude-User',
  'anthropic-ai',
  'PerplexityBot',
  'Perplexity-User',
  'Google-Extended',
  'Applebot-Extended',
  'meta-externalagent',
  'CCBot',
  'Bytespider',
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: '*', allow: '/' },
      ...(siteConfig.aiCrawlers === 'block' ? [{ userAgent: AI_CRAWLERS, disallow: '/' }] : []),
    ],
    sitemap: `${env.NEXT_PUBLIC_SITE_URL}/sitemap.xml`,
  };
}
