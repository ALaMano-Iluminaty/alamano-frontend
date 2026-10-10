import { useEffect, useRef } from 'react';
import { Marker, useMap } from 'react-leaflet';
import L from 'leaflet';
import type { GeoPoint } from '@/lib/geo';
import { BaseMap, animateMarkerTo, selfIcon, vendorIconSelected } from '@/lib/map';

interface TrackingMapProps {
  customer: GeoPoint;
  vendor: GeoPoint | null;
  vendorName: string;
  /** Ruta física del backend; sin ella, línea recta barbero → cliente. */
  route?: GeoPoint[];
  /** false cuando el usuario movió el mapa a mano: no se le quita el control. */
  autoFit: boolean;
  onUserMove: () => void;
  /** Cambia para pedir un encuadre manual ("Ver trayecto"). */
  fitRequest: number;
}

/**
 * Margen del encuadre descontando la tarjeta de ETA, que tapa el mapa:
 * a la izquierda en escritorio y abajo en móvil.
 */
function fitPadding(): Pick<L.FitBoundsOptions, 'paddingTopLeft' | 'paddingBottomRight'> {
  const desktop = window.matchMedia('(min-width: 900px)').matches;
  return desktop
    ? { paddingTopLeft: [460, 70], paddingBottomRight: [70, 70] }
    : { paddingTopLeft: [50, 70], paddingBottomRight: [50, 300] };
}

/**
 * Barbero + trazo hasta el cliente, gestionados con Leaflet directo: el trazo
 * se re-dibuja con cada `move` del marcador, así acompaña la animación en
 * vez de saltar al punto final.
 */
function VendorTrail({ customer, vendor, vendorName, route, autoFit, onUserMove, fitRequest }: TrackingMapProps) {
  const map = useMap();
  const markerRef = useRef<L.Marker | null>(null);
  const lineRef = useRef<L.Polyline | null>(null);
  const autoFitRef = useRef(autoFit);
  autoFitRef.current = autoFit;
  const routeRef = useRef(route);
  routeRef.current = route;

  const fit = (from: L.LatLng) => {
    map.fitBounds(L.latLngBounds([from, [customer.lat, customer.lng]]), {
      ...fitPadding(),
      maxZoom: 17,
      animate: true,
    });
  };

  useEffect(() => {
    // Arrastrar es inequívocamente del usuario: fitBounds no dispara dragstart.
    map.on('dragstart', onUserMove);
    return () => {
      map.off('dragstart', onUserMove);
    };
  }, [map, onUserMove]);

  useEffect(() => {
    if (!vendor) return;

    if (!markerRef.current) {
      const line = L.polyline([], { className: 'tracking-route', interactive: false }).addTo(map);
      const marker = L.marker([vendor.lat, vendor.lng], {
        icon: vendorIconSelected,
        title: vendorName,
        alt: `Posición de ${vendorName}`,
        keyboard: false,
        zIndexOffset: 1000,
      }).addTo(map);

      const redraw = () => {
        const here = marker.getLatLng();
        const path = routeRef.current?.length
          ? routeRef.current.map((point) => L.latLng(point.lat, point.lng))
          : [here, L.latLng(customer.lat, customer.lng)];
        line.setLatLngs(path);
      };
      marker.on('move', redraw);
      redraw();

      markerRef.current = marker;
      lineRef.current = line;
      fit(marker.getLatLng());
      return;
    }

    animateMarkerTo(markerRef.current, vendor, 1_600);
    if (autoFitRef.current) fit(L.latLng(vendor.lat, vendor.lng));
    // fit usa customer, que no cambia durante un servicio.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vendor, map, vendorName, customer]);

  // Encuadre pedido a mano con "Ver trayecto".
  useEffect(() => {
    if (fitRequest > 0 && markerRef.current) fit(markerRef.current.getLatLng());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fitRequest]);

  // Las refs se vacían además de quitar las capas: en StrictMode el efecto se
  // monta dos veces y el segundo montaje tiene que volver a crearlas.
  useEffect(
    () => () => {
      markerRef.current?.remove();
      lineRef.current?.remove();
      markerRef.current = null;
      lineRef.current = null;
    },
    [],
  );

  return null;
}

export function TrackingMap(props: TrackingMapProps) {
  const { customer } = props;
  return (
    <BaseMap center={customer} zoom={15} className="tracking__map">
      <Marker position={[customer.lat, customer.lng]} icon={selfIcon} title="Tu ubicación" keyboard={false} />
      <VendorTrail {...props} />
    </BaseMap>
  );
}
