import type { SiteContent } from '@webforge/shared';
import Image from 'next/image';
import Link from 'next/link';
import { mediaUrl } from '@/core/site';
import { SmartLink } from '@/core/SmartLink';

const LOGO_HEIGHT = 100;

interface HeaderProps {
  content: SiteContent['header'];
  siteName: string;
}

export function Header({ content: { logo, navItems }, siteName }: HeaderProps) {
  return (
    <header className="border-line bg-surface border-b">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-8 gap-y-3 px-6 py-4">
        <Link href="/" className="text-ink text-xl font-bold">
          {logo ? (
            <Image
              src={mediaUrl(logo.url)}
              alt={logo.alt}
              height={LOGO_HEIGHT}
              width={Math.round((LOGO_HEIGHT * logo.width) / logo.height)}
              // Sempre no topo da página: carrega já, sem esperar o lazy load
              loading="eager"
              className="h-10 w-auto"
            />
          ) : (
            siteName
          )}
        </Link>
        {navItems.length > 0 && (
          <nav aria-label="Principal">
            <ul className="flex flex-wrap gap-x-6 gap-y-2">
              {navItems.map((item) => (
                <li key={`${item.href}-${item.label}`}>
                  <SmartLink
                    href={item.href}
                    className="text-ink-muted hover:text-brand-700 text-sm font-medium"
                  >
                    {item.label}
                  </SmartLink>
                </li>
              ))}
            </ul>
          </nav>
        )}
      </div>
    </header>
  );
}
