import type { ReactNode } from 'react';
import { MapContainer, TileLayer } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import type { GeoPoint } from '@/lib/geo';
import { TILE_ATTRIBUTION, TILE_URL } from './tiles';

interface BaseMapProps {
  center: GeoPoint;
  zoom?: number;
  className?: string;
  /** Mapas de solo lectura (resúmenes) no se arrastran ni hacen zoom. */
  interactive?: boolean;
  children?: ReactNode;
}

/**
 * Contenedor Leaflet con la capa de teselas del proyecto.
 *
 * `center` solo se usa al montar (así funciona MapContainer): para mover la
 * vista después, usar `useMap()` desde un hijo.
 */
export function BaseMap({ center, zoom = 15, className = '', interactive = true, children }: BaseMapProps) {
  return (
    <MapContainer
      center={[center.lat, center.lng]}
      zoom={zoom}
      zoomControl={false}
      dragging={interactive}
      scrollWheelZoom={interactive}
      doubleClickZoom={interactive}
      touchZoom={interactive}
      keyboard={interactive}
      className={`base-map ${className}`.trim()}
    >
      <TileLayer url={TILE_URL} attribution={TILE_ATTRIBUTION} maxZoom={19} />
      {children}
    </MapContainer>
  );
}
