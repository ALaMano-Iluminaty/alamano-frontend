import { useCallback, useEffect, useRef, useState } from 'react';
import { useRealtimeConnection, useToast } from '@/context';
import type { GeoPoint } from '@/lib/geo';
import { RealtimeEvent, useRealtime, useServiceChannel } from '@/lib/realtime';
import { fetchActiveServices, isFinished } from '@/lib/service';
import { fetchIncomingService } from '../services';

export interface IncomingService {
  serviceId: string;
  /** null mientras llega GET /services/:id (o si falló). */
  destination: GeoPoint | null;
}

/**
 * Un cliente reservó al barbero: se avisa y se ofrece ir al servicio.
 *
 * El aviso llega por /user/queue/services como service.status.changed RESERVED
 * (ACCEPTED). No trae nombre del cliente ni destino: el destino se pide al Core.
 * Desde ahí se sigue /topic/service.{id}, así una cancelación del cliente
 * retira el aviso.
 */
export function useIncomingService() {
  const { show } = useToast();
  const { isOnline } = useRealtimeConnection();
  const [incoming, setIncoming] = useState<IncomingService | null>(null);
  useServiceChannel(incoming?.serviceId);

  const loadDestination = useCallback(async (serviceId: string) => {
    try {
      const detail = await fetchIncomingService(serviceId);
      setIncoming((current) =>
        current?.serviceId === serviceId ? { ...current, destination: detail.customerLocation } : current,
      );
    } catch {
      // Sin destino el aviso sigue sirviendo: el servicio se abre igual.
    }
  }, []);

  useRealtime(RealtimeEvent.ServiceStatusChanged, (payload) => {
    if (payload.status === 'ACCEPTED') {
      setIncoming({ serviceId: payload.serviceId, destination: null });
      show({ tone: 'success', title: 'Nuevo servicio', body: 'Un cliente te reservó. Abre el servicio para ver la ruta.' });
      void loadDestination(payload.serviceId);
      return;
    }
    if (isFinished(payload.status)) {
      setIncoming((current) => (current?.serviceId === payload.serviceId ? null : current));
    }
  });

  // 6.4 — al conectar o reconectar se recupera el servicio en curso, si el Core
  // ya expone los servicios activos (fetchActiveServices devuelve null si no).
  const wasOnline = useRef(false);
  useEffect(() => {
    if (isOnline && !wasOnline.current) {
      void fetchActiveServices()
        .then((services) => {
          const active = services?.find((service) => !isFinished(service.status));
          if (active) setIncoming({ serviceId: active.serviceId, destination: active.customerLocation });
        })
        .catch(() => {
          // El aviso en vivo sigue funcionando aunque falle la resincronización.
        });
    }
    wasOnline.current = isOnline;
  }, [isOnline]);

  return incoming;
}
