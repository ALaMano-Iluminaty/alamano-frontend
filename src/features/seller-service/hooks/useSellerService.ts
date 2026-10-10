import { useCallback, useEffect, useRef, useState } from 'react';
import { useRealtimeConnection, useToast } from '@/context';
import { ApiError } from '@/lib/api-client';
import { RealtimeEvent, useRealtime } from '@/lib/realtime';
import { SERVICE_STATUS_LABEL, nextStatus, type ServiceDetail } from '@/lib/service';
import { advanceStatus, fetchService } from '../services';

/**
 * 3.2 — Servicio activo del barbero y su máquina de estados.
 *
 * El avance es estrictamente secuencial: solo existe `next` (el siguiente
 * estado válido) y mientras una transición está en vuelo no se puede pedir
 * otra. Si el servidor responde 409, el estado local estaba viejo: se avisa
 * y se vuelve a pedir el snapshot.
 */
export function useSellerService(serviceId: string) {
  const { isOnline } = useRealtimeConnection();
  const { show } = useToast();
  const [service, setService] = useState<ServiceDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [advancing, setAdvancing] = useState(false);

  const load = useCallback(async () => {
    try {
      setService(await fetchService(serviceId));
      setError(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No se pudo cargar el servicio');
    } finally {
      setLoading(false);
    }
  }, [serviceId]);

  useEffect(() => {
    setLoading(true);
    void load();
  }, [load]);

  const wasOnline = useRef(isOnline);
  useEffect(() => {
    if (isOnline && !wasOnline.current) void load();
    wasOnline.current = isOnline;
  }, [isOnline, load]);

  // El cliente puede cancelar, o el estado puede cambiar desde otro dispositivo.
  useRealtime(RealtimeEvent.ServiceStatusChanged, (payload) => {
    if (payload.serviceId !== serviceId) return;
    setService((current) => (current ? { ...current, status: payload.status } : current));
    if (payload.status === 'CANCELLED') {
      show({ tone: 'conflict', title: 'El cliente canceló el servicio', body: 'Ya puedes volver a tu panel.' });
    }
  });

  const next = service ? nextStatus(service.status) : null;

  const advance = useCallback(async () => {
    if (!service || !next || advancing) return;
    setAdvancing(true);
    try {
      const updated = await advanceStatus(service.serviceId, next);
      setService(updated);
    } catch (caught) {
      if (caught instanceof ApiError && caught.isConflict) {
        show({
          tone: 'conflict',
          title: 'El servicio cambió de estado',
          body: 'Lo actualizamos para que veas el estado real antes de seguir.',
        });
        void load();
      } else {
        show({
          tone: 'conflict',
          title: `No se pudo marcar «${SERVICE_STATUS_LABEL[next]}»`,
          body: caught instanceof Error ? caught.message : 'Inténtalo de nuevo.',
        });
      }
    } finally {
      setAdvancing(false);
    }
  }, [service, next, advancing, show, load]);

  return { service, loading, error, reload: load, next, advance, advancing };
}
