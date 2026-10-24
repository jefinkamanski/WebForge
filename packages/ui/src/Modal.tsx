import { useEffect, useRef, type ReactNode } from 'react';

export interface ModalProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
}

// <dialog> nativo: foco preso, Esc para fechar e leitor de tela corretos sem biblioteca
export function Modal({ open, title, onClose, children, wide = false }: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-label={title}
      onClose={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      className={`m-auto w-full rounded-lg p-0 shadow-xl backdrop:bg-slate-900/50 ${wide ? 'max-w-4xl' : 'max-w-md'}`}
    >
      {open && (
        <div className="space-y-4 p-6">
          <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
          {children}
        </div>
      )}
    </dialog>
  );
}
