export type ToastTone = 'info' | 'success' | 'conflict';

/** Botón opcional dentro del aviso (ej. "Ir al servicio"). Al pulsarlo, el aviso se cierra. */
export interface ToastAction {
  label: string;
  onClick: () => void;
}

export interface ToastItem {
  id: number;
  tone: ToastTone;
  title: string;
  body?: string;
  action?: ToastAction;
}

interface ToastViewportProps {
  toasts: ToastItem[];
  onDismiss: (id: number) => void;
}

/** Pila de avisos. Se anuncia sin robar el foco (`aria-live="polite"`). */
export function ToastViewport({ toasts, onDismiss }: ToastViewportProps) {
  return (
    <div className="toast-viewport" role="status" aria-live="polite">
      {toasts.map((toast) => (
        <div key={toast.id} className={`toast toast--${toast.tone}`}>
          <div className="toast__text">
            <strong className="toast__title">{toast.title}</strong>
            {toast.body ? <span className="toast__body">{toast.body}</span> : null}
            {toast.action ? (
              <button
                type="button"
                className="toast__action"
                onClick={() => {
                  toast.action?.onClick();
                  onDismiss(toast.id);
                }}
              >
                {toast.action.label}
              </button>
            ) : null}
          </div>
          <button
            type="button"
            className="toast__close"
            onClick={() => onDismiss(toast.id)}
            aria-label="Descartar aviso"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
