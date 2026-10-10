import { useEffect, useRef } from 'react';
import { Marker, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import type { GeoPoint } from '@/lib/geo';
import { BaseMap, destinationIcon, vendorIconSelected } from '@/lib/map';

interface RouteMapProps {
  me: GeoPoint | null;
  destination: GeoPoint;
  customerName: string;
}

/** Margen que deja libre el panel de control (abajo en móvil, a la derecha en escritorio). */
function fitPadding(): Pick<L.FitBoundsOptions, 'paddingTopLeft' | 'paddingBottomRight'> {
  const desktop = window.matchMedia('(min-width: 900px)').matches;
  return desktop
    ? { paddingTopLeft: [70, 70], paddingBottomRight: [470, 70] }
    : { paddingTopLeft: [50, 60], paddingBottomRight: [50, 470] };
}

/**
 * Mantiene la ruta encuadrada mientras el barbero avanza, hasta que él mueva
 * el mapa a mano: a partir de ahí no se le pelea el control.
 */
function FitRoute({ me, destination }: { me: GeoPoint | null; destination: GeoPoint }) {
  const map = useMap();
  const userMoved = useRef(false);

  useEffect(() => {
    const onDrag = () => {
      userMoved.current = true;
    };
    map.on('dragstart', onDrag);
    return () => {
      map.off('dragstart', onDrag);
    };
  }, [map]);

  useEffect(() => {
    if (userMoved.current) return;
    const points: L.LatLngExpression[] = [[destination.lat, destination.lng]];
    if (me) points.push([me.lat, me.lng]);
    map.fitBounds(L.latLngBounds(points), { ...fitPadding(), maxZoom: 16, animate: true });
  }, [map, me, destination]);

  return null;
}

export function RouteMap({ me, destination, customerName }: RouteMapProps) {
  return (
    <BaseMap center={destination} zoom={15} className="seller-service__map">
      <FitRoute me={me} destination={destination} />
      {me ? (
        <>
          <Polyline
            positions={[
              [me.lat, me.lng],
              [destination.lat, destination.lng],
            ]}
            pathOptions={{ className: 'seller-route' }}
            interactive={false}
          />
          <Marker position={[me.lat, me.lng]} icon={vendorIconSelected} title="Tu posición" keyboard={false} />
        </>
      ) : null}
      <Marker
        position={[destination.lat, destination.lng]}
        icon={destinationIcon}
        title={`Destino: ${customerName}`}
        keyboard={false}
      />
    </BaseMap>
  );
}
