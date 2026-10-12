import { createContext, useContext, useEffect, useMemo, type ReactNode } from 'react';
import { SELLER_SERVICES_QUEUE, realtimeSocket, useConnectionStatus, type ConnectionStatus } from '@/lib/realtime';
import { useSession } from './SessionContext';

interface RealtimeContextValue {
  status: ConnectionStatus;
  isOnline: boolean;
  /** true mientras el socket intenta recuperarse (6.4). */
  isRecovering: boolean;
}

const RealtimeContext = createContext<RealtimeContextValue | null>(null);

/**
 * Ata el ciclo de vida del socket a la sesión: conecta al entrar, desconecta
 * al salir. Debe ir por dentro de <SessionProvider>.
 */
export function RealtimeProvider({ children }: { children: ReactNode }) {
  const { session } = useSession();
  const status = useConnectionStatus();
  const token = session?.token ?? null;
  const isSeller = session?.user.role === 'SELLER';

  useEffect(() => {
    if (!token) {
      realtimeSocket.disconnect();
      return;
    }
    realtimeSocket.connect(token);
    return () => realtimeSocket.disconnect();
  }, [token]);

  // El vendedor se entera por aquí de que lo reservaron (service.status.changed RESERVED).
  useEffect(() => {
    if (!token || !isSeller) return;
    return realtimeSocket.subscribe(SELLER_SERVICES_QUEUE);
  }, [token, isSeller]);

  const value = useMemo<RealtimeContextValue>(
    () => ({
      status,
      isOnline: status === 'open',
      isRecovering: status === 'reconnecting' || status === 'connecting',
    }),
    [status],
  );

  return <RealtimeContext.Provider value={value}>{children}</RealtimeContext.Provider>;
}

export function useRealtimeConnection(): RealtimeContextValue {
  const context = useContext(RealtimeContext);
  if (!context) throw new Error('useRealtimeConnection debe usarse dentro de <RealtimeProvider>');
  return context;
}
