import { useEffect, useRef, useState } from 'react';
import { useWatchPosition } from '@/lib/geo';
import { sendServiceLocation } from '../services';

/** Una posición cada 3 s basta para que el cliente vea un movimiento fluido. */
const MIN_SEND_INTERVAL_MS = 3_000;

/**
 * 3.2 — La ubicación se comparte solo mientras `enabled` (servicio EN_CAMINO).
 * Al dejar de estarlo, useWatchPosition hace clearWatch: el GPS se apaga, no
 * solo se deja de enviar.
 */
export function useLocationSharing(serviceId: string, enabled: boolean) {
  const [lastSentAt, setLastSentAt] = useState<string | null>(null);
  const [sendError, setSendError] = useState(false);
  const lastSend = useRef(0);
  const inFlight = useRef(false);

  const { status, position } = useWatchPosition(enabled, (point) => {
    const now = Date.now();
    if (inFlight.current || now - lastSend.current < MIN_SEND_INTERVAL_MS) return;
    lastSend.current = now;
    inFlight.current = true;
    sendServiceLocation(serviceId, point)
      .then(() => {
        setLastSentAt(new Date().toISOString());
        setSendError(false);
      })
      // Una posición perdida no es grave: llegará la siguiente. Solo se avisa.
      .catch(() => setSendError(true))
      .finally(() => {
        inFlight.current = false;
      });
  });

  useEffect(() => {
    if (!enabled) setLastSentAt(null);
  }, [enabled]);

  return { gpsStatus: status, position, lastSentAt, sendError };
}
