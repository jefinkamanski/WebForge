import { Button, TextField } from '@site/ui';

export interface LinkItem {
  label: string;
  href: string;
}

export interface LinkListFieldProps {
  legend: string;
  items: LinkItem[];
  onChange: (items: LinkItem[]) => void;
  errors: Record<string, string>;
  max: number;
  // Prefixo do caminho de erro, ex.: "navItems" -> "navItems.0.label"
  path: string;
}

export function LinkListField({ legend, items, onChange, errors, max, path }: LinkListFieldProps) {
  const update = (index: number, patch: Partial<LinkItem>) =>
    onChange(items.map((item, i) => (i === index ? { ...item, ...patch } : item)));

  return (
    <fieldset className="space-y-3">
      <legend className="text-sm font-medium text-slate-800">{legend}</legend>
      {errors[path] && <p className="text-xs font-medium text-red-700">{errors[path]}</p>}
      {items.length === 0 && <p className="text-xs text-slate-600">Nenhum link adicionado.</p>}
      {items.map((item, index) => (
        <div key={index} className="grid items-start gap-3 sm:grid-cols-[1fr_1fr_auto]">
          <TextField
            label={`Texto do link ${index + 1}`}
            value={item.label}
            maxLength={60}
            onChange={(event) => update(index, { label: event.target.value })}
            error={errors[`${path}.${index}.label`]}
          />
          <TextField
            label={`Endereço do link ${index + 1}`}
            value={item.href}
            placeholder="/blog ou https://..."
            maxLength={500}
            onChange={(event) => update(index, { href: event.target.value })}
            error={errors[`${path}.${index}.href`]}
          />
          <Button
            variant="secondary"
            className="sm:mt-6"
            onClick={() => onChange(items.filter((_, i) => i !== index))}
            aria-label={`Remover link ${index + 1}`}
          >
            Remover
          </Button>
        </div>
      ))}
      {items.length < max && (
        <Button variant="secondary" onClick={() => onChange([...items, { label: '', href: '' }])}>
          Adicionar link
        </Button>
      )}
    </fieldset>
  );
}
