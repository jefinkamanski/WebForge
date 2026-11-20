import type { Link } from '@webforge/shared';
import { ArrowDownIcon, ArrowUpIcon, PlusIcon, XIcon } from 'lucide-react';
import { Button, TextField } from '../../ui/index.ts';

export interface LinkListFieldProps {
  label: string;
  // Caminho do campo na seção, para achar os erros ("navItems" -> "navItems.0.href")
  name: string;
  value: Link[];
  onChange: (value: Link[]) => void;
  errors: Record<string, string>;
  max?: number;
}

// Campo para linkListField(): lista de links (texto + endereço)
export function LinkListField({
  label,
  name,
  value,
  onChange,
  errors,
  max = 10,
}: LinkListFieldProps) {
  const update = (index: number, patch: Partial<Link>) =>
    onChange(value.map((link, i) => (i === index ? { ...link, ...patch } : link)));
  const move = (index: number, offset: number) => {
    const next = [...value];
    const [item] = next.splice(index, 1);
    if (item) next.splice(index + offset, 0, item);
    onChange(next);
  };

  return (
    <fieldset className="space-y-3">
      <legend className="mb-2 text-sm font-medium">{label}</legend>
      {value.length === 0 && <p className="text-muted-foreground text-sm">Nenhum link.</p>}
      <ol className="space-y-3">
        {value.map((link, index) => (
          <li
            key={index}
            className="bg-muted/60 grid gap-4 rounded-lg border p-4 sm:grid-cols-[1fr_1fr_auto]"
          >
            <TextField
              label={`Texto do link ${index + 1}`}
              value={link.label}
              maxLength={60}
              onChange={(event) => update(index, { label: event.target.value })}
              error={errors[`${name}.${index}.label`]}
            />
            <TextField
              label={`Endereço do link ${index + 1}`}
              value={link.href}
              placeholder="/contato, #sobre ou https://…"
              onChange={(event) => update(index, { href: event.target.value })}
              error={errors[`${name}.${index}.href`]}
            />
            <div className="flex items-end gap-1 sm:pb-0">
              <Button
                variant="outline"
                size="icon"
                disabled={index === 0}
                aria-label={`Subir link ${index + 1}`}
                onClick={() => move(index, -1)}
              >
                <ArrowUpIcon aria-hidden="true" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                disabled={index === value.length - 1}
                aria-label={`Descer link ${index + 1}`}
                onClick={() => move(index, 1)}
              >
                <ArrowDownIcon aria-hidden="true" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="text-error-foreground hover:bg-error/12 hover:text-error-foreground"
                aria-label={`Remover link ${index + 1}`}
                onClick={() => onChange(value.filter((_, i) => i !== index))}
              >
                <XIcon aria-hidden="true" />
              </Button>
            </div>
          </li>
        ))}
      </ol>
      {errors[name] && <p className="text-error-foreground text-xs font-medium">{errors[name]}</p>}
      {value.length < max && (
        <Button variant="secondary" onClick={() => onChange([...value, { label: '', href: '' }])}>
          <PlusIcon aria-hidden="true" />
          Adicionar link
        </Button>
      )}
    </fieldset>
  );
}
