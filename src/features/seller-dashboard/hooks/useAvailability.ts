import { useCallback, useEffect, useRef, useState } from 'react';
import { useBeforeSignOut, useToast } from '@/context';
import { ApiError } from '@/lib/api-client';
import { useWatchPosition, type GeoPoint } from '@/lib/geo';
import { USE_MOCKS } from '@/lib/mock';
import { ClientEvent, realtimeSocket } from '@/lib/realtime';
import { startOnlineSimulation } from '../mocks';
import { PROFESSIONAL_BUSY, goOnlineAtCore } from '../services';

/**
 * El GPS puede disparar varias lecturas por segundo; con una cada 2 s el
 * mapa del cliente se ve fluido (interpola) y no se inunda el socket.
 */
const MIN_EMIT_INTERVAL_MS = 2_000;

/**
 * Quieto, el GPS no emite lecturas nuevas: se reenvía la última posición
 * para que el servidor no lo tome por desconectado.
 */
const KEEPALIVE_MS = 10_000;

function announceOffline(): void {
  realtimeSocket.emit(ClientEvent.VendorOffline, { at: new Date().toISOString() });
}

/**
 * 2.2 — Disponibilidad del barbero.
 *
 * En línea: `watchPosition` activo y cada posición sale por WebSocket.
 * Desconectado: `clearWatch` (lo hace useWatchPosition al pasar a false) y
 * VENDOR_OFFLINE, para desaparecer del mapa de los clientes al instante en
 * vez de esperar a que el servidor note el silencio.
 */
export function useAvailability() {
  const { show } = useToast();
  const [online, setOnline] = useState(false);
  /** Ya se avisó al Core en esta sesión "en línea". */
  const announcedRef = useRef(false);
  const [lastSentAt, setLastSentAt] = useState<string | null>(null);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const lastEmit = useRef(0);

  const onlineRef = useRef(online);
  onlineRef.current = online;

  const emitPosition = useCallback((point: GeoPoint) => {
    const now = Date.now();
    lastEmit.current = now;
    const updatedAt = new Date(now).toISOString();
    realtimeSocket.emit(ClientEvent.VendorLocationUpdate, { ...point, updatedAt });
    setLastSentAt(updatedAt);
  }, []);

  const { status: gpsStatus, position } = useWatchPosition(online, (point) => {
    if (Date.now() - lastEmit.current < MIN_EMIT_INTERVAL_MS) return;
    emitPosition(point);
  });

  const positionRef = useRef<GeoPoint | null>(position);
  positionRef.current = position;
  // Tras reconectarse, la última posición guardada es de la sesión anterior:
  // no se reenvía hasta que el GPS dé una lectura nueva ('active').
  const gpsActiveRef = useRef(false);
  gpsActiveRef.current = gpsStatus === 'active';

  useEffect(() => {
    if (!online) return;
    const timer = setInterval(() => {
      const point = positionRef.current;
      if (point && gpsActiveRef.current && Date.now() - lastEmit.current >= KEEPALIVE_MS) emitPosition(point);
    }, 1_000);
    return () => clearInterval(timer);
  }, [online, emitPosition]);

  const goOnline = useCallback(() => {
    setGpsError(null);
    lastEmit.current = 0;
    announcedRef.current = false;
    setOnline(true);
  }, []);

  const goOffline = useCallback(() => {
    if (!onlineRef.current) return;
    // TODO HU5: POST /professionals/me/offline
    announceOffline();
    setOnline(false);
    setLastSentAt(null);
  }, []);

  // El Core necesita la posición para anunciarlo: se avisa con la primera lectura del GPS.
  useEffect(() => {
    if (!online || USE_MOCKS || announcedRef.current) return;
    if (gpsStatus !== 'active' || !position) return;
    announcedRef.current = true;

    goOnlineAtCore(position).catch((error: unknown) => {
      goOffline();
      if (error instanceof ApiError && error.status === 409 && error.code === PROFESSIONAL_BUSY) {
        show({
          tone: 'conflict',
          title: 'Tienes un servicio en curso',
          body: 'Termínalo antes de volver a ponerte en línea.',
        });
        return;
      }
      show({
        tone: 'conflict',
        title: 'No pudimos ponerte en línea',
        body: error instanceof Error ? error.message : 'Prueba de nuevo en unos segundos.',
      });
    });
  }, [online, gpsStatus, position, goOffline, show]);

  // Sin GPS no hay forma de aparecer en el mapa: se vuelve a desconectado y se explica.
  useEffect(() => {
    if (!online) return;
    if (gpsStatus === 'denied' || gpsStatus === 'unavailable') {
      setGpsError(
        gpsStatus === 'denied'
          ? 'Sin permiso de ubicación no puedes aparecer en el mapa. Actívalo en el navegador.'
          : 'No hay señal de GPS en este dispositivo.',
      );
      goOffline();
    }
  }, [online, gpsStatus, goOffline]);

  // Cerrar sesión, salir de la pantalla o cerrar la pestaña también desconectan.
  useBeforeSignOut(() => {
    if (onlineRef.current) announceOffline();
  });

  useEffect(() => {
    if (!online) return;
    window.addEventListener('pagehide', announceOffline);
    return () => window.removeEventListener('pagehide', announceOffline);
  }, [online]);

  useEffect(
    () => () => {
      if (onlineRef.current) announceOffline();
    },
    [],
  );

  useEffect(() => {
    if (!online || !USE_MOCKS) return;
    return startOnlineSimulation(() => positionRef.current);
  }, [online]);

  return {
    online,
    toggle: online ? goOffline : goOnline,
    gpsStatus,
    gpsError,
    position,
    lastSentAt,
  };
}
