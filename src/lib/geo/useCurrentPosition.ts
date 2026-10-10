import { useCallback, useEffect, useState } from 'react';
import { DEFAULT_CENTER, type GeoPoint } from './distance';

export type LocateStatus = 'locating' | 'ready' | 'denied' | 'unavailable';

/**
 * Ubicación puntual del usuario (`getCurrentPosition`).
 *
 * Nunca deja la pantalla sin centro: si el permiso se niega o no hay GPS,
 * `position` es DEFAULT_CENTER y `status` explica por qué.
 */
export function useCurrentPosition() {
  const [position, setPosition] = useState<GeoPoint>(DEFAULT_CENTER);
  const [status, setStatus] = useState<LocateStatus>('locating');

  const locate = useCallback(() => {
    if (!('geolocation' in navigator)) {
      setStatus('unavailable');
      return;
    }
    setStatus('locating');
    navigator.geolocation.getCurrentPosition(
      (result) => {
        setPosition({ lat: result.coords.latitude, lng: result.coords.longitude });
        setStatus('ready');
      },
      (error) => setStatus(error.code === error.PERMISSION_DENIED ? 'denied' : 'unavailable'),
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 30_000 },
    );
  }, []);

  useEffect(() => {
    locate();
  }, [locate]);

  return { position, status, locate };
}
