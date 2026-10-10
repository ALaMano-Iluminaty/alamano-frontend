import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';
import { ToastViewport, type ToastItem, type ToastTone } from '@/components';

interface ToastInput {
  tone?: ToastTone;
  title: string;
  body?: string;
  /** ms en pantalla. Por defecto 5000. */
  duration?: number;
}

interface ToastContextValue {
  show: (toast: ToastInput) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(0);

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const show = useCallback(
    ({ tone = 'info', title, body, duration = 5_000 }: ToastInput) => {
      const id = ++nextId.current;
      // Máximo tres a la vez: si llegan ráfagas de eventos, se cae el más viejo.
      setToasts((current) => [...current.slice(-2), { id, tone, title, body }]);
      setTimeout(() => dismiss(id), duration);
    },
    [dismiss],
  );

  const value = useMemo(() => ({ show }), [show]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastViewport toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast debe usarse dentro de <ToastProvider>');
  return context;
}
