import type { ComponentProps } from 'react';
import { Button as BaseButton } from '../components/ui/button.tsx';
import { Spinner } from './Spinner.tsx';

export interface ButtonProps extends ComponentProps<typeof BaseButton> {
  // Mostra o spinner e desabilita o botão (o texto continua visível)
  loading?: boolean;
}

// Botão do shadcn + estado de carregamento. Variantes em docs/DESIGN-ADMIN.md
export function Button({
  loading = false,
  disabled,
  type = 'button',
  asChild,
  children,
  ...rest
}: ButtonProps) {
  // asChild (botão que é um link): o Radix exige um único filho, sem spinner nem `type`
  if (asChild) {
    return (
      <BaseButton asChild {...rest}>
        {children}
      </BaseButton>
    );
  }
  return (
    <BaseButton
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading && <Spinner className="size-4" />}
      {children}
    </BaseButton>
  );
}
