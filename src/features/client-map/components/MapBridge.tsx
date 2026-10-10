import { useEffect } from 'react';
import { useMap } from 'react-leaflet';
import type L from 'leaflet';

/** Expone la instancia de Leaflet a los controles que viven fuera del mapa. */
export function MapBridge({ onReady }: { onReady: (map: L.Map) => void }) {
  const map = useMap();
  useEffect(() => onReady(map), [map, onReady]);
  return null;
}
