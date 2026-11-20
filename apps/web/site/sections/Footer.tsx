import type { SiteContent } from '@webforge/shared';
import { SmartLink } from '@/core/SmartLink';

interface FooterProps {
  content: SiteContent['footer'];
  siteName: string;
}

export function Footer({ content: { text, links }, siteName }: FooterProps) {
  return (
    <footer className="border-line bg-surface-muted text-ink-muted border-t">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-10 text-sm sm:flex-row sm:items-start sm:justify-between">
        <div className="max-w-md space-y-2">
          {text && <p className="whitespace-pre-line">{text}</p>}
          <p>
            © {new Date().getFullYear()} {siteName}
          </p>
        </div>
        {links.length > 0 && (
          <nav aria-label="Rodapé">
            <ul className="flex flex-wrap gap-x-6 gap-y-2">
              {links.map((link) => (
                <li key={`${link.href}-${link.label}`}>
                  <SmartLink href={link.href} className="hover:text-brand-700 font-medium">
                    {link.label}
                  </SmartLink>
                </li>
              ))}
            </ul>
          </nav>
        )}
      </div>
    </footer>
  );
}
