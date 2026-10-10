import { useEffect, useRef, useState } from 'react';
import type { GeoPoint } from './distance';

export type WatchStatus = 'off' | 'waiting' | 'active' | 'denied' | 'unavailable';

/**
 * Seguimiento continuo (`watchPosition`) mientras `enabled` sea true.
 *
 * Al pasar a false o desmontar se llama a `clearWatch`: el GPS no sigue
 * encendido en segundo plano cuando ya no hace falta.
 */
export function useWatchPosition(enabled: boolean, onPosition: (point: GeoPoint) => void) {
  const [status, setStatus] = useState<WatchStatus>('off');
  const [position, setPosition] = useState<GeoPoint | null>(null);

  // El handler va en ref para no reabrir el watch en cada render.
  const handlerRef = useRef(onPosition);
  handlerRef.current = onPosition;

  useEffect(() => {
    if (!enabled) {
      setStatus('off');
      return;
    }
    if (!('geolocation' in navigator)) {
      setStatus('unavailable');
      return;
    }

    setStatus('waiting');
    const watchId = navigator.geolocation.watchPosition(
      (result) => {
        const point = { lat: result.coords.latitude, lng: result.coords.longitude };
        setPosition(point);
        setStatus('active');
        handlerRef.current(point);
      },
      (error) => setStatus(error.code === error.PERMISSION_DENIED ? 'denied' : 'unavailable'),
      { enableHighAccuracy: true, maximumAge: 5_000 },
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [enabled]);

  return { status, position };
}
