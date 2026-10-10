import { useEffect, useRef, useSyncExternalStore } from 'react';
import type { RealtimeEventName, RealtimeEventPayloads } from './events';
import { realtimeSocket, type ConnectionStatus } from './socket';

/**
 * Hook base: suscribe el componente a un evento del broker.
 *
 * El handler se guarda en una ref, así quien llama no tiene que memoizarlo
 * y la suscripción no se rehace en cada render.
 */
export function useRealtime<E extends RealtimeEventName>(
  event: E,
  handler: (payload: RealtimeEventPayloads[E]) => void,
  options: { enabled?: boolean } = {},
): void {
  const { enabled = true } = options;
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    if (!enabled) return;
    return realtimeSocket.on(event, (payload) => handlerRef.current(payload));
  }, [event, enabled]);
}

/** Estado de la conexión, para el banner de "reconectando…" (6.4). */
export function useConnectionStatus(): ConnectionStatus {
  return useSyncExternalStore(
    (onChange) => realtimeSocket.onStatusChange(() => onChange()),
    () => realtimeSocket.getStatus(),
    () => 'idle' as ConnectionStatus,
  );
}
