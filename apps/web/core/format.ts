import { siteConfig } from '@/site/site.config';

const dateFormat = new Intl.DateTimeFormat(siteConfig.locale, {
  dateStyle: 'long',
  timeZone: siteConfig.timeZone,
});

// "6 de novembro de 2026"
export const formatDate = (iso: string) => dateFormat.format(new Date(iso));
