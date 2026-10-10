import { useCallback, useEffect, useRef, useState } from 'react';
import { useRealtimeConnection } from '@/context';
import { estimateEtaSeconds } from '@/lib/geo';
import { RealtimeEvent, useRealtime } from '@/lib/realtime';
import type { ServiceDetail } from '@/lib/service';
import { fetchService } from '../services';

/**
 * 3.1 — Estado, posición y ETA del servicio en vivo.
 *
 * Snapshot REST + deltas del WS (SERVICE_STATUS_CHANGED y
 * SERVICE_LOCATION_UPDATE). Nunca recarga la página: al reconectar solo se
 * vuelve a pedir el snapshot, porque los eventos del corte se perdieron.
 */
export function useServiceTracking(serviceId: string) {
  const { isOnline } = useRealtimeConnection();
  const [service, setService] = useState<ServiceDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  useRealtime(RealtimeEvent.ServiceStatusChanged, (payload) => {
    if (payload.serviceId !== serviceId) return;
    setService((current) => (current ? { ...current, status: payload.status } : current));
  });

  useRealtime(RealtimeEvent.ServiceLocationUpdate, (payload) => {
    if (payload.serviceId !== serviceId) return;
    setService((current) => {
      if (!current) return current;
      const vendorLocation = { lat: payload.lat, lng: payload.lng };
      return {
        ...current,
        vendorLocation,
        etaSeconds: payload.etaSeconds ?? estimateEtaSeconds(vendorLocation, current.customerLocation),
        updatedAt: payload.updatedAt,
      };
    });
  });

  return { service, loading, error, reload: load };
}
