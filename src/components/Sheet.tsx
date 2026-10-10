import { useEffect, useId, useRef, type ReactNode } from 'react';

interface SheetProps {
  open: boolean;
  title: string;
  /** Línea pequeña sobre el título (ej. la distancia). */
  eyebrow?: ReactNode;
  onClose: () => void;
  children: ReactNode;
}

/**
 * Panel que sube desde abajo sobre el mapa (en escritorio flota a la
 * izquierda). No es modal: el mapa detrás sigue usable, por eso no atrapa el
 * foco; sí lo recibe al abrirse y se cierra con Escape.
 */
export function Sheet({ open, title, eyebrow, onClose, children }: SheetProps) {
  const ref = useRef<HTMLElement>(null);
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    ref.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <section ref={ref} className="sheet" role="dialog" aria-labelledby={titleId} tabIndex={-1}>
      <span className="sheet__grip" aria-hidden="true" />
      <header className="sheet__header">
        <div>
          {eyebrow ? <p className="sheet__eyebrow">{eyebrow}</p> : null}
          <h2 className="sheet__title" id={titleId}>
            {title}
          </h2>
        </div>
        <button type="button" className="icon-btn" onClick={onClose} aria-label="Cerrar">
          <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>
      </header>
      <div className="sheet__body">{children}</div>
    </section>
  );
}
