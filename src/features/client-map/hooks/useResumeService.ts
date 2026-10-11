import { useEffect, useRef, useState } from 'react';
import { useRealtimeConnection, useSession } from '@/context';
import { ApiError } from '@/lib/api-client';
import {
  fetchActiveServices,
  forgetActiveService,
  isFinished,
  readActiveService,
  type ServiceDetail,
} from '@/lib/service';
import { fetchActiveService } from '../services';

/**
 * Servicio en curso del cliente. Mientras el Core no exponga los servicios
 * activos (fetchActiveServices devuelve null), sale del id guardado al reservar.
 */
async function resolveActiveService(clientId: string): Promise<ServiceDetail | null> {
  const fromCore = await fetchActiveServices({ id: clientId, role: 'CUSTOMER' });
  if (fromCore) return fromCore.find((service) => !isFinished(service.status)) ?? null;

  const serviceId = readActiveService();
  if (!serviceId) return null;
  try {
    const service = await fetchActiveService(serviceId);
    if (service && isFinished(service.status)) {
      forgetActiveService(serviceId);
      return null;
    }
    return service;
  } catch (caught) {
    if (caught instanceof ApiError && caught.status === 404) forgetActiveService(serviceId);
    throw caught;
  }
}

/**
 * 6.4 — Al conectar y al reconectar el socket se vuelve a pedir por REST el
 * servicio en curso: los eventos emitidos durante el corte se perdieron.
 */
export function useResumeService() {
  const { isOnline } = useRealtimeConnection();
  const { session } = useSession();
  const clientId = session?.user.id;
  const [active, setActive] = useState<ServiceDetail | null>(null);

  const wasOnline = useRef(false);
  useEffect(() => {
    if (clientId && isOnline && !wasOnline.current) {
      resolveActiveService(clientId)
        .then(setActive)
        .catch(() => {
          // Sin respuesta del Core se deja el aviso como estaba; se reintenta al reconectar.
        });
    }
    wasOnline.current = isOnline;
  }, [isOnline, clientId]);

  return active;
}
