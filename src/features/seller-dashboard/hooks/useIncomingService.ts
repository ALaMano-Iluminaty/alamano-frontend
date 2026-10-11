import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { sessionSubject, useRealtimeConnection, useSession, useToast } from '@/context';
import type { GeoPoint } from '@/lib/geo';
import { RealtimeEvent, useRealtime, useServiceChannel, type ServiceStatus } from '@/lib/realtime';
import { fetchActiveServices, isFinished } from '@/lib/service';
import { fetchIncomingService } from '../services';

export interface IncomingService {
  serviceId: string;
  /** ACCEPTED = recién reservado; otro estado = servicio ya en curso. */
  status: ServiceStatus;
  /** null mientras llega GET /services/:id (o si falló). */
  destination: GeoPoint | null;
}

/**
 * Servicio pendiente del barbero: el que le acaban de reservar o el que dejó
 * en curso.
 *
 * - En vivo: llega por /user/queue/services como service.status.changed
 *   RESERVED (ACCEPTED), sin nombre del cliente ni destino; el destino se pide
 *   al Core.
 * - 6.4: al cargar la sesión (sin esperar al interruptor ni al socket) y en
 *   cada reconexión se pide GET /api/services/active.
 *
 * Desde ahí se sigue /topic/service.{id}: los cambios de estado actualizan el
 * aviso y una cancelación del cliente lo retira.
 */
export function useIncomingService() {
  const { show } = useToast();
  const navigate = useNavigate();
  const { isOnline } = useRealtimeConnection();
  const { session } = useSession();
  // El `sub` del token: es con lo que el Core marca professionalId.
  const sellerId = session ? sessionSubject(session) : null;
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

  /**
   * Pide al Core el servicio en curso del barbero. null si no hay, si el
   * endpoint está desactivado (flag vacío) o si falló.
   */
  const resync = useCallback(async (): Promise<IncomingService | null> => {
    if (!sellerId) return null;
    try {
      const services = await fetchActiveServices({ id: sellerId, role: 'SELLER' });
      // Flag vacío: no hay con qué resincronizar; el aviso en vivo sigue igual.
      if (!services) return null;
      const active = services.find((service) => !isFinished(service.status));
      const next = active
        ? { serviceId: active.serviceId, status: active.status, destination: active.customerLocation }
        : null;
      setIncoming(next);
      return next;
    } catch (error) {
      console.warn('[seller] no se pudo recuperar el servicio en curso:', error);
      return null;
    }
  }, [sellerId]);

  // Al cargar la sesión: no depende del interruptor ni de que el socket conecte.
  useEffect(() => {
    void resync();
  }, [resync]);

  // En cada reconexión (no en la primera apertura, ya cubierta al cargar).
  const wasOnline = useRef(isOnline);
  const everOnline = useRef(isOnline);
  useEffect(() => {
    if (isOnline && !wasOnline.current && everOnline.current) void resync();
    if (isOnline) everOnline.current = true;
    wasOnline.current = isOnline;
  }, [isOnline, resync]);

  useRealtime(RealtimeEvent.ServiceStatusChanged, (payload) => {
    if (payload.status === 'ACCEPTED') {
      // Solo las reservas donde este usuario es el profesional.
      if (payload.professionalId && payload.professionalId !== sellerId) return;
      setIncoming({ serviceId: payload.serviceId, status: 'ACCEPTED', destination: null });
      show({ tone: 'success', title: 'Nuevo servicio', body: 'Un cliente te reservó. Abre el servicio para ver la ruta.' });
      void loadDestination(payload.serviceId);
      return;
    }
    setIncoming((current) => {
      if (current?.serviceId !== payload.serviceId) return current;
      return isFinished(payload.status) ? null : { ...current, status: payload.status };
    });
  });

  /**
   * 409 professional_busy al ponerse en línea: el Core dice que tiene un
   * servicio en curso. Se recupera y se ofrece ir a él.
   */
  const handleBusy = useCallback(async () => {
    const active = await resync();
    show({
      tone: 'conflict',
      title: 'Tienes un servicio en curso',
      body: 'Termínalo antes de volver a ponerte en línea.',
      ...(active
        ? {
            duration: 10_000,
            action: { label: 'Ir al servicio', onClick: () => navigate(`/seller/service/${active.serviceId}`) },
          }
        : {}),
    });
  }, [resync, show, navigate]);

  return { incoming, handleBusy };
}
