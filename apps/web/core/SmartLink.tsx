import Link from 'next/link';
import type { ReactNode } from 'react';

interface SmartLinkProps {
  href: string;
  className?: string;
  children: ReactNode;
}

// Caminhos internos usam o Link do Next (navegação rápida); o resto vira <a> comum.
// Links externos abrem na mesma aba, sem repassar o endereço do site (noreferrer).
export function SmartLink({ href, className, children }: SmartLinkProps) {
  if (href.startsWith('/') && !href.startsWith('//')) {
    return (
      <Link href={href} className={className}>
        {children}
      </Link>
    );
  }
  const external = /^https?:\/\//i.test(href);
  return (
    <a href={href} className={className} rel={external ? 'noopener noreferrer' : undefined}>
      {children}
    </a>
  );
}
